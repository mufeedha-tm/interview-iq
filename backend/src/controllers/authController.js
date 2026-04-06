const crypto = require("crypto");
const streamifier = require("streamifier");
const User = require("../models/userModel");
const { sendEmail, verifyEmailTransport } = require("../utils/email");
const { jwtSecret, jwtExpiresIn, jwtRefreshSecret, jwtRefreshExpiresIn, clientUrl } = require("../config/env");
const cloudinary = require("../config/cloudinary");
const jwt = require("jsonwebtoken");

const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  };
};

const serializeUser = (user) => ({
  id: user._id,
  email: user.email,
  role: user.role,
  isVerified: user.isVerified,
  firstName: user.firstName,
  lastName: user.lastName,
  headline: user.headline,
  targetRole: user.targetRole,
  experienceLevel: user.experienceLevel,
  bio: user.bio,
  avatarUrl: user.avatarUrl,
  resumeUrl: user.resumeUrl,
  subscriptionTier: user.subscriptionTier,
  premiumInterviewsRemaining: user.premiumInterviewsRemaining,
  premiumExpiresAt: user.premiumExpiresAt,
});

const createTokenResponse = (user, res) => {
  const accessToken = user.generateJwtToken(jwtSecret, jwtExpiresIn);
  const refreshToken = user.generateJwtRefreshToken(jwtRefreshSecret, jwtRefreshExpiresIn);
  const cookieOptions = getCookieOptions();

  res.cookie("accessToken", accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
  res.cookie("refreshToken", refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

  return {
    user: serializeUser(user),
    accessToken,
    refreshToken,
  };
};

const OTP_EMAIL_TIMEOUT_MS = Number(process.env.OTP_EMAIL_TIMEOUT_MS || 5000);
const OTP_RESEND_COOLDOWN_MS = Number(process.env.OTP_RESEND_COOLDOWN_MS || 60_000);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const normalizeOtp = (otp) => String(otp || "").trim();

const isValidEmail = (email) => EMAIL_REGEX.test(email);
const isValidOtp = (otp) => /^\d{6}$/.test(otp);
const isValidPassword = (password) =>
  typeof password === "string" && password.length >= MIN_PASSWORD_LENGTH;

const getOtpCooldownRemainingMs = (user) => {
  if (!user?.otpIssuedAt) {
    return 0;
  }

  const elapsed = Date.now() - new Date(user.otpIssuedAt).getTime();
  const remaining = OTP_RESEND_COOLDOWN_MS - elapsed;
  return remaining > 0 ? remaining : 0;
};

const getOtpCooldownMessage = (remainingMs) => {
  const seconds = Math.ceil(remainingMs / 1000);
  return `Please wait ${seconds}s before requesting another OTP`;
};

const classifyEmailFailure = (message = "") => {
  const normalizedMessage = String(message).toLowerCase();

  if (!normalizedMessage) {
    return "delivery_failed";
  }

  if (normalizedMessage.includes("timed out")) {
    return "timeout";
  }

  if (
    normalizedMessage.includes("invalid login") ||
    normalizedMessage.includes("username and password not accepted") ||
    normalizedMessage.includes("authentication unsuccessful") ||
    normalizedMessage.includes("application-specific password") ||
    normalizedMessage.includes("badcredentials") ||
    normalizedMessage.includes("534-5.7.9") ||
    normalizedMessage.includes("534 5.7.9") ||
    normalizedMessage.includes("please log in via your web browser") ||
    normalizedMessage.includes("invalid credentials") ||
    normalizedMessage.includes("auth")
  ) {
    return "auth_failed";
  }

  if (normalizedMessage.includes("email config missing") || normalizedMessage.includes("config missing")) {
    return "config_missing";
  }

  if (
    normalizedMessage.includes("econnrefused") ||
    normalizedMessage.includes("enotfound") ||
    normalizedMessage.includes("eai_again") ||
    normalizedMessage.includes("greeting never received") ||
    normalizedMessage.includes("connection") ||
    normalizedMessage.includes("certificate")
  ) {
    return "connection_failed";
  }

  return "delivery_failed";
};

const withTimeout = (promise, timeoutMs, timeoutMessage) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });

const deliverOtpEmail = async ({ to, subject, html, text, logLabel }) => {
  let emailSent = false;
  let emailFallbackReason = null;
  let emailFallbackCode = null;

  try {
    const emailResult = await withTimeout(
      sendEmail({ to, subject, html, text }),
      OTP_EMAIL_TIMEOUT_MS,
      `Email delivery timed out after ${OTP_EMAIL_TIMEOUT_MS}ms`
    );

    emailSent = emailResult.deliveredVia === "email";
    emailFallbackReason = emailResult.fallbackReason || null;
    emailFallbackCode = emailFallbackReason ? classifyEmailFailure(emailFallbackReason) : null;
  } catch (emailError) {
    emailFallbackReason = emailError.message || "Email delivery failed";
    emailFallbackCode = classifyEmailFailure(emailFallbackReason);
    console.error(`${logLabel} email delivery failed:`, emailFallbackReason);
  }

  return {
    emailSent,
    emailFallbackReason,
    emailFallbackCode,
  };
};

const buildOtpDeliveryResponse = ({ emailSent, emailFallbackReason, emailFallbackCode }) => ({
  emailSent,
  emailFallbackCode: emailSent ? undefined : emailFallbackCode,
  emailFallbackReason:
    process.env.NODE_ENV === "production" || emailSent ? undefined : emailFallbackReason || undefined,
});

const clearOtpState = (user) => {
  user.otpCode = undefined;
  user.otpExpires = undefined;
  user.otpPurpose = undefined;
  user.otpIssuedAt = undefined;
};

const getEmailServiceUnavailableResponse = (prefixMessage, emailError) => {
  const emailFallbackReason = emailError?.message || "Email transport verification failed";
  const emailFallbackCode = classifyEmailFailure(emailFallbackReason);
  const helpMessage =
    emailFallbackCode === "auth_failed" || emailFallbackCode === "config_missing"
      ? "Check Gmail SMTP settings in backend/.env and follow backend/EMAIL_SETUP.md."
      : "Email service is temporarily unavailable. Please try again in a few moments.";

  return {
    statusCode: 503,
    body: {
      message: `${prefixMessage} ${helpMessage}`,
      ...buildOtpDeliveryResponse({
        emailSent: false,
        emailFallbackReason,
        emailFallbackCode,
      }),
    },
  };
};

const ensureOtpEmailServiceReady = async (prefixMessage) => {
  try {
    await verifyEmailTransport();
    return null;
  } catch (emailError) {
    return getEmailServiceUnavailableResponse(prefixMessage, emailError);
  }
};

const signup = async (req, res, next) => {
  try {
    const { email, password, firstName = "", lastName = "", targetRole = "" } = req.body;

    if (!firstName.trim() || !lastName.trim() || !targetRole.trim() || !email || !password) {
      return res.status(400).json({
        message: "First name, last name, target role, email, and password are required",
      });
    }

    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }

    if (!isValidPassword(password)) {
      return res
        .status(400)
        .json({ message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
    }

    const existing = await User.findOne({ email: normalizedEmail }).select("+otpIssuedAt");
    if (existing?.isVerified) {
      return res.status(400).json({ message: "Email already in use" });
    }

    if (existing) {
      const remainingMs = getOtpCooldownRemainingMs(existing);
      if (remainingMs > 0) {
        return res.status(200).json({
          message: `A verification OTP has already been sent. Please check your email or request a new code in ${Math.ceil(
            remainingMs / 1000
          )} seconds.`,
          emailSent: true,
          retryAfter: remainingMs,
        });
      }
    }

    const emailServiceIssue = await ensureOtpEmailServiceReady("Signup is temporarily unavailable.");
    if (emailServiceIssue) {
      return res.status(emailServiceIssue.statusCode).json(emailServiceIssue.body);
    }

    const user = existing || new User({ email: normalizedEmail });
    user.password = password;
    user.firstName = firstName.trim();
    user.lastName = lastName.trim();
    user.targetRole = targetRole.trim();
    user.isVerified = false;

    await user.save();
    const otp = user.createOtp("verify_email");
    await user.save({ validateBeforeSave: false });

    const { emailSent, emailFallbackReason, emailFallbackCode } = await deliverOtpEmail({
      to: normalizedEmail,
      subject: "Verify your InterviewIQ account",
      html: `<p>Welcome to InterviewIQ! Your verification code is <strong>${otp}</strong>.</p><p>This code expires in 10 minutes.</p>`,
      text: `Welcome to InterviewIQ! Your verification code is ${otp}.`,
      logLabel: "Signup",
    });

    if (!emailSent) {
      clearOtpState(user);
      await user.save({ validateBeforeSave: false });

      const helpMessage = 
        emailFallbackCode === "auth_failed" || emailFallbackCode === "connection_failed"
          ? "Check your EMAIL_USER and EMAIL_PASS in .env file. See backend/EMAIL_SETUP.md for Gmail setup instructions."
          : "Email service is temporarily unavailable. Please try again in a few moments.";

      return res.status(502).json({
        message: `Signup successful but verification email delivery failed. ${helpMessage}`,
        help: "If this persists, contact support or try later.",
        ...buildOtpDeliveryResponse({ emailSent, emailFallbackReason, emailFallbackCode }),
      });
    }

    return res.status(201).json({
      message: existing
        ? "Account already exists but is not verified. We sent you a fresh OTP."
        : "Signup successful, check your email for the OTP",
      ...buildOtpDeliveryResponse({ emailSent, emailFallbackReason, emailFallbackCode }),
    });
  } catch (error) {
    next(error);
  }
};

const verifyEmailOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const normalizedEmail = normalizeEmail(email);
    const normalizedOtp = normalizeOtp(otp);

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }

    if (!isValidOtp(normalizedOtp)) {
      return res.status(400).json({ message: "OTP must be a 6-digit code" });
    }

    const user = await User.findOne({ email: normalizedEmail }).select(
      "+otpCode +otpExpires +otpPurpose +otpIssuedAt +isVerified"
    );
    if (!user) {
      return res.status(400).json({ message: "Invalid email or OTP" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Email already verified" });
    }

    if (!user.otpCode || !user.otpExpires || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: "OTP expired, request a new one" });
    }

    if (user.otpPurpose && user.otpPurpose !== "verify_email") {
      return res.status(400).json({ message: "This OTP is for password reset, not email verification" });
    }

    const hashedOtp = crypto.createHash("sha256").update(normalizedOtp).digest("hex");
    if (hashedOtp !== user.otpCode) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    user.isVerified = true;
    user.otpCode = undefined;
    user.otpExpires = undefined;
    user.otpPurpose = undefined;
    user.otpIssuedAt = undefined;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({ message: "Email verified successfully" });
  } catch (error) {
    next(error);
  }
};

const resendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }

    const user = await User.findOne({ email: normalizedEmail }).select(
      "+otpCode +otpExpires +otpPurpose +otpIssuedAt +isVerified"
    );
    if (!user) {
      return res.status(400).json({ message: "Invalid email" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Email already verified" });
    }

    const remainingMs = getOtpCooldownRemainingMs(user);
    if (remainingMs > 0) {
      return res.status(200).json({
        message: getOtpCooldownMessage(remainingMs),
        emailSent: false,
        retryAfter: remainingMs,
      });
    }

    const emailServiceIssue = await ensureOtpEmailServiceReady("OTP resend is temporarily unavailable.");
    if (emailServiceIssue) {
      return res.status(emailServiceIssue.statusCode).json(emailServiceIssue.body);
    }

    const otp = user.createOtp("verify_email");
    await user.save({ validateBeforeSave: false });

    const { emailSent, emailFallbackReason, emailFallbackCode } = await deliverOtpEmail({
      to: normalizedEmail,
      subject: "Your new InterviewIQ verification code",
      html: `<p>Your new verification code is <strong>${otp}</strong>. It expires in 10 minutes.</p>`,
      text: `Your new verification code is ${otp}.`,
      logLabel: "OTP resend",
    });

    if (!emailSent) {
      clearOtpState(user);
      await user.save({ validateBeforeSave: false });

      return res.status(502).json({
        message: "Unable to resend OTP email right now. Please try again.",
        ...buildOtpDeliveryResponse({ emailSent, emailFallbackReason, emailFallbackCode }),
      });
    }

    return res.status(200).json({
      message: "New OTP sent to your email",
      ...buildOtpDeliveryResponse({ emailSent, emailFallbackReason, emailFallbackCode }),
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }

    const user = await User.findOne({ email: normalizedEmail }).select("+password +isVerified");
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await user.isValidPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.isVerified) {
      return res.status(401).json({
        message: "Email not verified. Please verify your email before logging in.",
      });
    }

    const payload = createTokenResponse(user, res);
    return res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

const issuePasswordResetOtp = async ({ normalizedEmail, user, logLabel }) => {
  const otp = user.createOtp("reset_password");
  await user.save({ validateBeforeSave: false });
  const resetUrl = `${clientUrl}/reset-password?email=${encodeURIComponent(normalizedEmail)}`;

  const { emailSent, emailFallbackReason, emailFallbackCode } = await deliverOtpEmail({
    to: normalizedEmail,
    subject: "InterviewIQ password reset code",
    html: `
        <p>Your password reset code is <strong>${otp}</strong>. It expires in 10 minutes.</p>
        <p>You can reset your password here:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
      `,
    text: `Your password reset code is ${otp}. It expires in 10 minutes. Reset link: ${resetUrl}`,
    logLabel,
  });

  if (!emailSent) {
    clearOtpState(user);
    await user.save({ validateBeforeSave: false });
  }

  return {
    emailSent,
    emailFallbackReason,
    emailFallbackCode,
  };
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }

    const user = await User.findOne({ email: normalizedEmail }).select("+otpIssuedAt");
    if (!user) {
      return res.status(200).json({ message: "If the account exists, you will receive an email" });
    }

    const remainingMs = getOtpCooldownRemainingMs(user);
    if (remainingMs > 0) {
      return res.status(429).json({ message: getOtpCooldownMessage(remainingMs) });
    }

    const emailServiceIssue = await ensureOtpEmailServiceReady("Password reset is temporarily unavailable.");
    if (emailServiceIssue) {
      return res.status(emailServiceIssue.statusCode).json(emailServiceIssue.body);
    }

    const { emailSent, emailFallbackReason, emailFallbackCode } = await issuePasswordResetOtp({
      normalizedEmail,
      user,
      logLabel: "Forgot password",
    });

    if (!emailSent) {
      return res.status(502).json({
        message: "Unable to send password reset OTP email right now. Please try again.",
        ...buildOtpDeliveryResponse({ emailSent, emailFallbackReason, emailFallbackCode }),
      });
    }

    return res.status(200).json({
      message: "If the account exists, you will receive an email",
      ...buildOtpDeliveryResponse({ emailSent, emailFallbackReason, emailFallbackCode }),
    });
  } catch (error) {
    next(error);
  }
};

const resendPasswordOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }

    const user = await User.findOne({ email: normalizedEmail }).select("+otpIssuedAt");
    if (!user) {
      return res.status(200).json({ message: "If the account exists, you will receive an email" });
    }

    const remainingMs = getOtpCooldownRemainingMs(user);
    if (remainingMs > 0) {
      return res.status(429).json({ message: getOtpCooldownMessage(remainingMs) });
    }

    const emailServiceIssue = await ensureOtpEmailServiceReady("Password reset resend is temporarily unavailable.");
    if (emailServiceIssue) {
      return res.status(emailServiceIssue.statusCode).json(emailServiceIssue.body);
    }

    const { emailSent, emailFallbackReason, emailFallbackCode } = await issuePasswordResetOtp({
      normalizedEmail,
      user,
      logLabel: "Password OTP resend",
    });

    if (!emailSent) {
      return res.status(502).json({
        message: "Unable to resend password reset OTP email right now. Please try again.",
        ...buildOtpDeliveryResponse({ emailSent, emailFallbackReason, emailFallbackCode }),
      });
    }

    return res.status(200).json({
      message: "Password reset OTP sent again",
      ...buildOtpDeliveryResponse({ emailSent, emailFallbackReason, emailFallbackCode }),
    });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, password } = req.body;
    if (!email || !otp || !password) {
      return res
        .status(400)
        .json({ message: "Email, OTP, and new password are required" });
    }

    const normalizedEmail = normalizeEmail(email);
    const normalizedOtp = normalizeOtp(otp);

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }

    if (!isValidOtp(normalizedOtp)) {
      return res.status(400).json({ message: "OTP must be a 6-digit code" });
    }

    if (!isValidPassword(password)) {
      return res
        .status(400)
        .json({ message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
    }

    const hashedOtp = crypto.createHash("sha256").update(normalizedOtp).digest("hex");
    const user = await User.findOne({
      email: normalizedEmail,
      otpCode: hashedOtp,
      otpExpires: { $gt: Date.now() },
    }).select("+otpCode +otpExpires +otpPurpose +otpIssuedAt +isVerified");

    if (!user) {
      return res.status(400).json({ message: "OTP is invalid or has expired" });
    }

    if (user.otpPurpose && user.otpPurpose !== "reset_password") {
      return res.status(400).json({ message: "This OTP is for email verification, not password reset" });
    }

    user.password = password;
    user.isVerified = true;
    user.otpCode = undefined;
    user.otpExpires = undefined;
    user.otpPurpose = undefined;
    user.otpIssuedAt = undefined;
    await user.save();

    return res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    res.status(200).json({ user: serializeUser(req.user) });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, headline, targetRole, experienceLevel, bio } = req.body;

    req.user.firstName = firstName ?? req.user.firstName;
    req.user.lastName = lastName ?? req.user.lastName;
    req.user.headline = headline ?? req.user.headline;
    req.user.targetRole = targetRole ?? req.user.targetRole;
    req.user.experienceLevel = experienceLevel ?? req.user.experienceLevel;
    req.user.bio = bio ?? req.user.bio;

    await req.user.save({ validateBeforeSave: false });

    res.status(200).json({
      message: "Profile updated successfully",
      user: serializeUser(req.user),
    });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current password and new password are required",
      });
    }

    if (!isValidPassword(newPassword)) {
      return res
        .status(400)
        .json({ message: `New password must be at least ${MIN_PASSWORD_LENGTH} characters` });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ message: "New password must be different from current password" });
    }

    const user = await User.findById(req.user._id).select("+password");
    const isMatch = await user.isValidPassword(currentPassword);

    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    next(error);
  }
};

const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Image file is required" });
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "interviewiq/avatars",
        resource_type: "image",
        public_id: `${req.user._id}_avatar_${Date.now()}`,
        overwrite: true,
      },
      async (error, result) => {
        if (error) {
          return next(error);
        }

        req.user.avatarUrl = result.secure_url;
        req.user.avatarPublicId = result.public_id;
        await req.user.save({ validateBeforeSave: false });

        res.status(200).json({
          message: "Profile image uploaded successfully",
          user: serializeUser(req.user),
        });
      }
    );

    streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
  } catch (error) {
    next(error);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken || req.body?.refreshToken;
    const cookieOptions = getCookieOptions();
    if (!token) {
      return res.status(401).json({ message: "No refresh token provided" });
    }

    const decoded = jwt.verify(token, jwtRefreshSecret);
    const user = await User.findById(decoded.id);
    if (!user) {
      res.clearCookie("accessToken", cookieOptions);
      res.clearCookie("refreshToken", cookieOptions);
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const payload = createTokenResponse(user, res);
    return res.status(200).json({ message: "Token refreshed successfully", ...payload });
  } catch (error) {
    const cookieOptions = getCookieOptions();
    res.clearCookie("accessToken", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Refresh token expired" });
    }
    return res.status(401).json({ message: "Invalid refresh token" });
  }
};

const logout = async (req, res, next) => {
  try {
    const cookieOptions = getCookieOptions();
    res.clearCookie("accessToken", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  signup,
  verifyEmailOtp,
  resendOtp,
  login,
  forgotPassword,
  resendPasswordOtp,
  resetPassword,
  getMe,
  updateProfile,
  changePassword,
  uploadAvatar,
  refreshToken,
  logout,
};
