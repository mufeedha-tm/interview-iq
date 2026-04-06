const nodemailer = require("nodemailer");
const { email, clientUrl } = require("../config/env");
const { ApiError } = require("./apiError");
const EMAIL_VERIFY_CACHE_MS = Number(process.env.EMAIL_VERIFY_CACHE_MS || 10 * 60 * 1000);
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

const getBaseTransportOptions = () => ({
  auth: {
    user: email.user,
    pass: email.pass,
  },
  connectionTimeout: 30_000,
  greetingTimeout: 30_000,
  socketTimeout: 45_000,
  family: 4,
  tls: {
    rejectUnauthorized: false,
  },
  pool: {
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 4000,
    rateLimit: 14,
  },
});

const withRetry = async (fn, maxRetries = 3, delayMs = 1000) => {
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

const createTransportCandidates = () => {
  const missingFields = getMissingEmailFields();
  if (missingFields.length > 0) {
    throw new ApiError(`Email config missing: ${missingFields.join(", ")}`, 500);
  }

  const baseOptions = getBaseTransportOptions();
  const gmailExplicitTransports = () => [
    {
      label: "gmail-smtp-ssl",
      transporter: nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        requireTLS: true,
        tls: {
          servername: "smtp.gmail.com",
          minVersion: "TLSv1.2",
        },
        ...baseOptions,
      }),
    },
    {
      label: "gmail-smtp-tls",
      transporter: nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        requireTLS: true,
        tls: {
          servername: "smtp.gmail.com",
          minVersion: "TLSv1.2",
        },
        ...baseOptions,
      }),
    },
  ];

  const isExplicitGmailHost = String(email.host || "").toLowerCase() === "smtp.gmail.com";

  if (email.host) {
    const candidates = [
      {
        label: isExplicitGmailHost ? "gmail-smtp-host" : "smtp-host",
        transporter: nodemailer.createTransport({
          host: email.host,
          port: email.port || 465,
          secure: email.secure,
          requireTLS: email.secure,
          tls: {
            servername: email.host,
            minVersion: "TLSv1.2",
          },
          ...baseOptions,
        }),
      },
    ];

    if (isExplicitGmailHost || isGmailService()) {
      candidates.push(...gmailExplicitTransports());
    }

    return candidates;
  }

  if (isGmailService()) {
    return gmailExplicitTransports();
  }

  return [
    {
      label: email.service || "default-service",
      transporter: nodemailer.createTransport({
        service: email.service || "gmail",
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
      lastError = error;
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

const sendEmail = async ({ to, subject, html, text }) => {
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
        3,
        1000
      );

      return {
        messageId: info.messageId,
        deliveredVia: "email",
        transport: label,
      };
    } catch (error) {
      lastError = error;
      lastErrorTransport = label;
      console.error(
        `Email send failed via ${label} after retries:`,
        error.message || error
      );
    } finally {
      tryCloseTransporter(transporter);
    }
  }

  const errorMsg =
    lastError?.message || "Email delivery failed after all attempts";
  console.error("Final email send error:", errorMsg, {
    transport: lastErrorTransport,
  });

  const thrownError = new Error(
    `Email delivery failed: ${errorMsg}. Please check EMAIL_USER and EMAIL_PASS configuration.`
  );
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
  sendEmail,
  sendInterviewSummaryEmail,
  verifyEmailTransport,
};
