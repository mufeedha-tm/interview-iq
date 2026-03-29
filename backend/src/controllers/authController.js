const crypto = require("crypto");
const streamifier = require("streamifier");
const User = require("../models/userModel");
const { sendEmail } = require("../utils/email");
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
  const token = user.generateJwtToken(jwtSecret, jwtExpiresIn);
  const refreshToken = user.generateJwtRefreshToken(jwtRefreshSecret, jwtRefreshExpiresIn);
  const cookieOptions = getCookieOptions();

  res.cookie("accessToken", token, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
  res.cookie("refreshToken", refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

  return {
    user: serializeUser(user),
  };
};

const OTP_EMAIL_TIMEOUT_MS = Number(process.env.OTP_EMAIL_TIMEOUT_MS || 5000);

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
  let emailPreview = null;
  let emailSent = false;
  let emailFallbackReason = null;

  try {
    const emailResult = await withTimeout(
      sendEmail({ to, subject, html, text }),
      OTP_EMAIL_TIMEOUT_MS,
      `Email delivery timed out after ${OTP_EMAIL_TIMEOUT_MS}ms`
    );

    emailPreview = emailResult.previewUrl || null;
    emailSent = emailResult.deliveredVia === "smtp";
    emailFallbackReason = emailResult.fallbackReason || null;
  } catch (emailError) {
    emailFallbackReason = emailError.message || "Email delivery failed";
    console.error(`${logLabel} email delivery failed:`, emailFallbackReason);
  }

  return {
    emailPreview,
    emailSent,
    emailFallbackReason,
  };
};

const buildOtpDeliveryResponse = ({ otp, emailSent, emailPreview, emailFallbackReason }) => ({
  emailPreview,
  emailSent,
  emailFallbackReason:
    process.env.NODE_ENV === "production" ? undefined : emailFallbackReason || undefined,
  developmentOtp: process.env.NODE_ENV === "production" || emailSent ? undefined : otp,
});

const signup = async (req, res, next) => {
  try {
    const { email, password, firstName = "", lastName = "", targetRole = "" } = req.body;

    if (!firstName.trim() || !lastName.trim() || !targetRole.trim() || !email || !password) {
      return res.status(400).json({
        message: "First name, last name, target role, email, and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing?.isVerified) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const user = existing || new User({ email: normalizedEmail });
    user.password = password;
    user.firstName = firstName.trim();
    user.lastName = lastName.trim();
    user.targetRole = targetRole.trim();
    user.isVerified = false;

    await user.save();
    const otp = user.createOtp();
    await user.save({ validateBeforeSave: false });

    const { emailPreview, emailSent, emailFallbackReason } = await deliverOtpEmail({
      to: normalizedEmail,
      subject: "Verify your InterviewIQ account",
      html: `<p>Welcome to InterviewIQ! Your verification code is <strong>${otp}</strong>.</p><p>This code expires in 10 minutes.</p>`,
      text: `Welcome to InterviewIQ! Your verification code is ${otp}.`,
      logLabel: "Signup",
    });

    return res.status(201).json({
      message: existing
        ? emailSent
          ? "Account already exists but is not verified. We sent you a fresh OTP."
          : emailPreview
            ? "Account already exists but is not verified. A fresh OTP is available in local preview."
            : "Account already exists but is not verified. Use the fresh OTP below or request another one."
        : emailSent
          ? "Signup successful, check your email for the OTP"
          : emailPreview
            ? "Signup successful. Email is available in local preview for development."
            : "Signup successful. Email delivery is not available right now, but you can still verify your OTP below.",
      ...buildOtpDeliveryResponse({ otp, emailSent, emailPreview, emailFallbackReason }),
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

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select(
      "+otpCode +otpExpires +isVerified"
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

    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
    if (hashedOtp !== user.otpCode) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    user.isVerified = true;
    user.otpCode = undefined;
    user.otpExpires = undefined;
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

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select(
      "+otpCode +otpExpires +isVerified"
    );
    if (!user) {
      return res.status(400).json({ message: "Invalid email" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Email already verified" });
    }

    const otp = user.createOtp();
    await user.save({ validateBeforeSave: false });

    const { emailPreview, emailSent, emailFallbackReason } = await deliverOtpEmail({
      to: normalizedEmail,
      subject: "Your new InterviewIQ verification code",
      html: `<p>Your new verification code is <strong>${otp}</strong>. It expires in 10 minutes.</p>`,
      text: `Your new verification code is ${otp}.`,
      logLabel: "Resend OTP",
    });

    return res.status(200).json({
      message: emailSent
        ? "New OTP sent to your email"
        : emailPreview
          ? "A new OTP was generated. Open the local email preview in development."
          : "A new OTP was generated. Email delivery is not available right now, so use the OTP shown in development.",
      ...buildOtpDeliveryResponse({ otp, emailSent, emailPreview, emailFallbackReason }),
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

    const normalizedEmail = String(email).trim().toLowerCase();
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

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(200).json({ message: "If the account exists, you will receive an email" });
    }

    const otp = user.createOtp();
    await user.save({ validateBeforeSave: false });
    const resetUrl = `${clientUrl}/reset-password?email=${encodeURIComponent(normalizedEmail)}`;

    const { emailPreview, emailSent, emailFallbackReason } = await deliverOtpEmail({
      to: normalizedEmail,
      subject: "InterviewIQ password reset code",
      html: `
          <p>Your password reset code is <strong>${otp}</strong>. It expires in 10 minutes.</p>
          <p>You can reset your password here:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
        `,
      text: `Your password reset code is ${otp}. It expires in 10 minutes. Reset link: ${resetUrl}`,
      logLabel: "Forgot password",
    });

    return res.status(200).json({
      message: emailSent
        ? "If the account exists, you will receive an email"
        : emailPreview
          ? "If the account exists, a reset code is available in local email preview."
          : "If the account exists, a reset code was generated. Email delivery is not available right now.",
      ...buildOtpDeliveryResponse({ otp, emailSent, emailPreview, emailFallbackReason }),
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

    const normalizedEmail = String(email).trim().toLowerCase();
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
    const user = await User.findOne({
      email: normalizedEmail,
      otpCode: hashedOtp,
      otpExpires: { $gt: Date.now() },
    }).select("+otpCode +otpExpires");

    if (!user) {
      return res.status(400).json({ message: "OTP is invalid or has expired" });
    }

    user.password = password;
    user.otpCode = undefined;
    user.otpExpires = undefined;
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
    const token = req.cookies.refreshToken;
    if (!token) {
      return res.status(401).json({ message: "No refresh token provided" });
    }

    const decoded = jwt.verify(token, jwtRefreshSecret);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    createTokenResponse(user, res);
    return res.status(200).json({ message: "Token refreshed successfully" });
  } catch (error) {
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
  resetPassword,
  getMe,
  updateProfile,
  changePassword,
  uploadAvatar,
  refreshToken,
  logout,
};
