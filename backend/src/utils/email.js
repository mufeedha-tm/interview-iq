const nodemailer = require("nodemailer");
const { email, clientUrl } = require("../config/env");
const { ApiError } = require("./apiError");
const EMAIL_VERIFY_CACHE_MS = Number(process.env.EMAIL_VERIFY_CACHE_MS || 10 * 60 * 1000);
const EMAIL_CONNECTION_TIMEOUT_MS = Number(process.env.EMAIL_CONNECTION_TIMEOUT_MS || 10_000);
const EMAIL_GREETING_TIMEOUT_MS = Number(process.env.EMAIL_GREETING_TIMEOUT_MS || 10_000);
const EMAIL_SOCKET_TIMEOUT_MS = Number(process.env.EMAIL_SOCKET_TIMEOUT_MS || 20_000);
let emailVerificationCache = null;

const isGmailService = () => String(email.service || "").toLowerCase() === "gmail";

const getFromAddress = () => {
  const fromEmail =
    isGmailService()
      ? email.user || email.fromEmail || "no-reply@interviewiq.app"
      : email.fromEmail || email.user || "no-reply@interviewiq.app";

  return `${email.fromName || "InterviewIQ"} <${fromEmail}>`;
};

const getMissingEmailFields = () => {
  const missing = [];

  if (!email.user) missing.push("EMAIL_USER");
  if (!email.pass) missing.push("EMAIL_PASS");

  return missing;
};

const assertEmailConfig = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("Email config missing");
  }

  const missingFields = getMissingEmailFields();
  if (missingFields.length > 0) {
    throw new Error("Email config missing");
  }
};

const getBaseTransportOptions = () => ({
  auth: {
    user: email.user,
    pass: email.pass,
  },
  connectionTimeout: EMAIL_CONNECTION_TIMEOUT_MS,
  greetingTimeout: EMAIL_GREETING_TIMEOUT_MS,
  socketTimeout: EMAIL_SOCKET_TIMEOUT_MS,
  family: 4,
  pool: false,
  tls: {
    minVersion: "TLSv1.2",
  },
});

const withRetry = async (fn, maxRetries = 1, delayMs = 1000) => {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        const delay = delayMs * Math.pow(2, attempt - 1);
        console.warn(
          `Email send attempt ${attempt} failed, retrying in ${delay}ms:`,
          error.message
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
};

const isRenderEnvironment = () => String(process.env.RENDER || "").toLowerCase() === "true";

const formatSmtpErrorMessage = (error) => {
  const rawMessage = error?.message || "Email delivery failed";
  const normalizedMessage = String(rawMessage).toLowerCase();
  const timedOut =
    normalizedMessage.includes("timed out") || normalizedMessage.includes("timeout");

  if (timedOut && isRenderEnvironment()) {
    return "SMTP connection timed out on Render. If this backend is on a Free Render web service, outbound SMTP ports 465 and 587 are blocked. Upgrade the backend service to a paid Render instance or move email sending to an API-based mail provider.";
  }

  return rawMessage;
};

const createTransportCandidates = () => {
  const missingFields = getMissingEmailFields();
  if (missingFields.length > 0) {
    throw new ApiError(`Email config missing: ${missingFields.join(", ")}`, 500);
  }

  const baseOptions = getBaseTransportOptions();
  if (isGmailService()) {
    const gmailHost = email.host || "smtp.gmail.com";
    const gmailPort = email.port || (email.secure === false ? 587 : 465);
    const gmailSecure = gmailPort === 465 ? true : Boolean(email.secure);

    return [
      {
        label: gmailSecure ? "gmail-smtp-ssl" : "gmail-smtp-tls",
        transporter: nodemailer.createTransport({
          host: gmailHost,
          port: gmailPort,
          secure: gmailSecure,
          requireTLS: !gmailSecure,
          tls: {
            servername: gmailHost,
            minVersion: "TLSv1.2",
          },
          ...baseOptions,
        }),
      },
    ];
  }

  if (email.host) {
    return [
      {
        label: "smtp-host",
        transporter: nodemailer.createTransport({
          host: email.host,
          port: email.port || (email.secure ? 465 : 587),
          secure: Boolean(email.secure),
          requireTLS: !email.secure,
          tls: {
            servername: email.host,
            minVersion: "TLSv1.2",
          },
          ...baseOptions,
        }),
      },
    ];
  }

  return [
    {
      label: email.service || "default-service",
      transporter: nodemailer.createTransport({
        service: email.service || "gmail",
        requireTLS: true,
        ...baseOptions,
      }),
    },
  ];
};

const tryCloseTransporter = (transporter) => {
  try {
    transporter?.close?.();
  } catch {
    // Ignore transport close errors.
  }
};

const verifyEmailTransport = async ({ force = false } = {}) => {
  const cacheIsFresh =
    !force &&
    emailVerificationCache?.ready &&
    Date.now() - emailVerificationCache.checkedAt < EMAIL_VERIFY_CACHE_MS;

  if (cacheIsFresh) {
    return emailVerificationCache;
  }

  const transportCandidates = createTransportCandidates();
  let lastError = null;

  for (const { label, transporter } of transportCandidates) {
    try {
      await transporter.verify();
      emailVerificationCache = {
        ready: true,
        checkedAt: Date.now(),
        transport: label,
      };
      tryCloseTransporter(transporter);
      return emailVerificationCache;
    } catch (error) {
      lastError = new Error(formatSmtpErrorMessage(error));
      tryCloseTransporter(transporter);
    }
  }

  emailVerificationCache = {
    ready: false,
    checkedAt: Date.now(),
    transport: null,
    error: lastError?.message || "Email transport verification failed",
  };

  throw new Error(
    `Email transport verification failed: ${
      emailVerificationCache.error
    }. Check Gmail app-password setup in backend/README.md and backend/.env.example.`
  );
};

const sendEmail = async ({ to, subject, html, text, maxAttempts = 1 }) => {
  assertEmailConfig();

  const payload = {
    from: getFromAddress(),
    to,
    subject,
    html,
    text,
  };

  const transportCandidates = createTransportCandidates();
  let lastError = null;
  let lastErrorTransport = null;

  for (const { label, transporter } of transportCandidates) {
    try {
      const info = await withRetry(
        () => transporter.sendMail(payload),
        Math.max(1, maxAttempts),
        1000
      );

      return {
        messageId: info.messageId,
        deliveredVia: "email",
        transport: label,
      };
    } catch (error) {
      lastError = new Error(formatSmtpErrorMessage(error));
      lastErrorTransport = label;
      console.error(
        `Email send failed via ${label} after retries:`,
        lastError.message || lastError
      );
    } finally {
      tryCloseTransporter(transporter);
    }
  }

  const errorMsg = lastError?.message || "Email delivery failed after all attempts";
  console.error("Final email send error:", errorMsg, {
    transport: lastErrorTransport,
  });

  const thrownError = new Error(errorMsg);
  thrownError.transport = lastErrorTransport;
  throw thrownError;
};

const sendInterviewSummaryEmail = async (user, interview) => {
  const reportUrl = `${clientUrl}/history`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2D3748;">Interview Analysis Ready</h2>
      <p style="color: #4A5568; font-size: 16px;">Hi ${user.firstName || "Candidate"},</p>
      <p style="color: #4A5568; font-size: 16px;">
        Your AI-powered mock interview for <strong>${interview.title}</strong> is complete!
      </p>
      
      <div style="background-color: #F7FAFC; padding: 20px; border-radius: 8px; margin: 24px 0;">
        <h3 style="margin-top: 0; color: #2B6CB0;">Performance Score: ${interview.results.score}%</h3>
        <p style="color: #4A5568;"><strong>Key Strengths:</strong> ${interview.results.strengths?.slice(0, 2).join(", ") || "N/A"}</p>
        <p style="color: #4A5568;"><strong>Focus Areas:</strong> ${interview.results.improvements?.slice(0, 2).join(", ") || "N/A"}</p>
      </div>

      <p style="color: #4A5568; font-size: 16px;">
        Log into InterviewIQ to review your detailed feedback and coaching tips.
      </p>
      <a href="${reportUrl}" style="display: inline-block; background-color: #4299E1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 16px;">View Full Report</a>
    </div>
  `;

  return sendEmail({
    to: user.email,
    subject: `Interview Results: ${interview.title}`,
    html,
  });
};

module.exports = {
  assertEmailConfig,
  sendEmail,
  sendInterviewSummaryEmail,
  verifyEmailTransport,
};
