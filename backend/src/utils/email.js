const https = require("https");
const nodemailer = require("nodemailer");
const { email, clientUrl } = require("../config/env");
const { ApiError } = require("./apiError");

const EMAIL_VERIFY_CACHE_MS = Number(process.env.EMAIL_VERIFY_CACHE_MS || 10 * 60 * 1000);
const EMAIL_CONNECTION_TIMEOUT_MS = Number(process.env.EMAIL_CONNECTION_TIMEOUT_MS || 10_000);
const EMAIL_GREETING_TIMEOUT_MS = Number(process.env.EMAIL_GREETING_TIMEOUT_MS || 10_000);
const EMAIL_SOCKET_TIMEOUT_MS = Number(process.env.EMAIL_SOCKET_TIMEOUT_MS || 20_000);
const RESEND_API_BASE_URL = "https://api.resend.com";
const RESEND_TRANSPORT_LABEL = "resend-api";
const GMAIL_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_API_BASE_URL = "https://gmail.googleapis.com";
const GMAIL_API_TRANSPORT_LABEL = "gmail-api";

let emailVerificationCache = null;

const isResendProvider = () => email.provider === "resend";
const isGmailApiProvider = () => email.provider === "gmail_api";
const isGmailService = () => String(email.service || "").toLowerCase() === "gmail";

const getFromAddress = () => {
  const fromEmail = isResendProvider()
    ? email.fromEmail || "onboarding@resend.dev"
    : isGmailApiProvider()
      ? email.fromEmail || email.user || "no-reply@interviewiq.app"
      : isGmailService()
      ? email.user || email.fromEmail || "no-reply@interviewiq.app"
      : email.fromEmail || email.user || "no-reply@interviewiq.app";

  return `${email.fromName || "InterviewIQ"} <${fromEmail}>`;
};

const getMissingEmailFields = () => {
  const missing = [];

  if (isResendProvider()) {
    if (!email.resendApiKey) missing.push("RESEND_API_KEY");
    if (!email.fromEmail) missing.push("EMAIL_FROM");
    return missing;
  }

  if (isGmailApiProvider()) {
    if (!email.gmailClientId) missing.push("GMAIL_CLIENT_ID");
    if (!email.gmailClientSecret) missing.push("GMAIL_CLIENT_SECRET");
    if (!email.gmailRefreshToken) missing.push("GMAIL_REFRESH_TOKEN");
    if (!email.fromEmail) missing.push("EMAIL_FROM");
    return missing;
  }

  if (!email.user) missing.push("EMAIL_USER");
  if (!email.pass) missing.push("EMAIL_PASS");

  return missing;
};

const assertEmailConfig = () => {
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
  pool: true,
  maxConnections: 1,
  maxMessages: 3,
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

const formatResendErrorMessage = (statusCode, payload) => {
  const details =
    payload?.message ||
    payload?.error?.message ||
    payload?.name ||
    payload?.error ||
    "Email delivery failed";

  if (statusCode === 401 || statusCode === 403) {
    return `Resend authorization failed: ${details}`;
  }

  return `Resend API error (${statusCode}): ${details}`;
};

const createTransportCandidates = () => {
  const missingFields = getMissingEmailFields();
  if (missingFields.length > 0) {
    throw new ApiError(`Email config missing: ${missingFields.join(", ")}`, 500);
  }

  const baseOptions = getBaseTransportOptions();
  if (isGmailService()) {
    return [
      {
        label: "gmail-service",
        transporter: nodemailer.createTransport({
          host: "smtp.gmail.com",
          port: 465,
          secure: true,
          requireTLS: true,
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

const requestResend = (path, { method = "POST", body } = {}) =>
  new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const url = new URL(path, RESEND_API_BASE_URL);

    const req = https.request(
      {
        method,
        hostname: url.hostname,
        path: `${url.pathname}${url.search}`,
        protocol: url.protocol,
        headers: {
          Authorization: `Bearer ${email.resendApiKey}`,
          "Content-Type": "application/json",
          "User-Agent": "interviewiq-backend/1.0",
          ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
        },
        timeout: EMAIL_SOCKET_TIMEOUT_MS,
      },
      (res) => {
        let raw = "";
        res.setEncoding("utf8");

        res.on("data", (chunk) => {
          raw += chunk;
        });

        res.on("end", () => {
          let parsed = {};

          if (raw) {
            try {
              parsed = JSON.parse(raw);
            } catch {
              parsed = { message: raw };
            }
          }

          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
            return;
          }

          const error = new Error(formatResendErrorMessage(res.statusCode, parsed));
          error.transport = RESEND_TRANSPORT_LABEL;
          error.statusCode = res.statusCode;
          reject(error);
        });
      }
    );

    req.on("timeout", () => {
      req.destroy(new Error("Resend API request timed out"));
    });

    req.on("error", (error) => {
      const requestError = new Error(error.message || "Resend API request failed");
      requestError.transport = RESEND_TRANSPORT_LABEL;
      reject(requestError);
    });

    if (payload) {
      req.write(payload);
    }

    req.end();
  });

const requestJson = (requestUrl, { method = "POST", headers = {}, body, timeout = EMAIL_SOCKET_TIMEOUT_MS } = {}) =>
  new Promise((resolve, reject) => {
    const payload =
      typeof body === "string" || Buffer.isBuffer(body)
        ? body
        : body
          ? JSON.stringify(body)
          : null;
    const url = new URL(requestUrl);

    const req = https.request(
      {
        method,
        hostname: url.hostname,
        path: `${url.pathname}${url.search}`,
        protocol: url.protocol,
        headers: {
          "User-Agent": "interviewiq-backend/1.0",
          ...headers,
          ...(payload && !headers["Content-Length"]
            ? { "Content-Length": Buffer.byteLength(payload) }
            : {}),
        },
        timeout,
      },
      (res) => {
        let raw = "";
        res.setEncoding("utf8");

        res.on("data", (chunk) => {
          raw += chunk;
        });

        res.on("end", () => {
          let parsed = {};

          if (raw) {
            try {
              parsed = JSON.parse(raw);
            } catch {
              parsed = { message: raw };
            }
          }

          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
            return;
          }

          const error = new Error(parsed?.error_description || parsed?.error?.message || parsed?.error || parsed?.message || `HTTP ${res.statusCode}`);
          error.statusCode = res.statusCode;
          error.payload = parsed;
          reject(error);
        });
      }
    );

    req.on("timeout", () => {
      req.destroy(new Error("HTTP request timed out"));
    });

    req.on("error", (error) => {
      reject(error);
    });

    if (payload) {
      req.write(payload);
    }

    req.end();
  });

const getGmailAccessToken = async () => {
  const body = new URLSearchParams({
    client_id: email.gmailClientId,
    client_secret: email.gmailClientSecret,
    refresh_token: email.gmailRefreshToken,
    grant_type: "refresh_token",
  }).toString();

  try {
    const response = await requestJson(GMAIL_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    if (!response.access_token) {
      throw new Error("Gmail API access token missing from Google OAuth response");
    }

    return response.access_token;
  } catch (error) {
    const message = error?.message || "Failed to fetch Gmail API access token";
    throw new Error(`Gmail API authorization failed: ${message}`);
  }
};

const buildRawMimeMessage = ({ to, subject, html, text }) => {
  const boundary = `interviewiq-${Date.now()}`;
  const message = [
    `From: ${getFromAddress()}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "",
    text || "",
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "",
    html || text || "",
    "",
    `--${boundary}--`,
    "",
  ].join("\r\n");

  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
};

const verifyEmailTransport = async ({ force = false } = {}) => {
  const cacheIsFresh =
    !force &&
    emailVerificationCache?.ready &&
    Date.now() - emailVerificationCache.checkedAt < EMAIL_VERIFY_CACHE_MS;

  if (cacheIsFresh) {
    return emailVerificationCache;
  }

  assertEmailConfig();

  if (isResendProvider()) {
    emailVerificationCache = {
      ready: true,
      checkedAt: Date.now(),
      transport: RESEND_TRANSPORT_LABEL,
    };
    return emailVerificationCache;
  }

  if (isGmailApiProvider()) {
    await getGmailAccessToken();
    emailVerificationCache = {
      ready: true,
      checkedAt: Date.now(),
      transport: GMAIL_API_TRANSPORT_LABEL,
    };
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
    }. Check your configured email provider settings in backend/README.md and backend/.env.example.`
  );
};

const sendViaSmtp = async ({ to, subject, html, text, maxAttempts = 1 }) => {
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

const sendViaResend = async ({ to, subject, html, text, maxAttempts = 1 }) => {
  try {
    const response = await withRetry(
      () =>
        requestResend("/emails", {
          body: {
            from: getFromAddress(),
            to: [to],
            subject,
            html,
            text,
          },
        }),
      Math.max(1, maxAttempts),
      1000
    );

    return {
      messageId: response.id,
      deliveredVia: "email",
      transport: RESEND_TRANSPORT_LABEL,
    };
  } catch (error) {
    console.error("Final email send error:", error.message || error, {
      transport: error.transport || RESEND_TRANSPORT_LABEL,
    });
    throw error;
  }
};

const sendViaGmailApi = async ({ to, subject, html, text, maxAttempts = 1 }) => {
  try {
    const accessToken = await getGmailAccessToken();
    const raw = buildRawMimeMessage({ to, subject, html, text });

    const response = await withRetry(
      () =>
        requestJson(`${GMAIL_API_BASE_URL}/gmail/v1/users/me/messages/send`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: {
            raw,
          },
        }),
      Math.max(1, maxAttempts),
      1000
    );

    return {
      messageId: response.id,
      deliveredVia: "email",
      transport: GMAIL_API_TRANSPORT_LABEL,
    };
  } catch (error) {
    const message = error?.message || "Gmail API email delivery failed";
    console.error("Final email send error:", message, {
      transport: GMAIL_API_TRANSPORT_LABEL,
    });
    const thrownError = new Error(message);
    thrownError.transport = GMAIL_API_TRANSPORT_LABEL;
    throw thrownError;
  }
};

const sendEmail = async ({ to, subject, html, text, maxAttempts = 1 }) => {
  assertEmailConfig();

  if (isResendProvider()) {
    return sendViaResend({ to, subject, html, text, maxAttempts });
  }

  if (isGmailApiProvider()) {
    return sendViaGmailApi({ to, subject, html, text, maxAttempts });
  }

  return sendViaSmtp({ to, subject, html, text, maxAttempts });
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
