const nodemailer = require("nodemailer");
const { email, clientUrl } = require("../config/env");

const createTestTransporter = async () => {
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
};

const createTransporter = async () => {
  const missingHostOrPort = !email.host || !email.port;
  const missingCredentials = !email.user || !email.pass;

  if (missingHostOrPort || missingCredentials) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SMTP is required in production. Set EMAIL_HOST, EMAIL_PORT, EMAIL_USERNAME (or EMAIL_USER), and EMAIL_PASSWORD (or EMAIL_PASS).",
      );
    }

    const missingFields = [
      !email.host ? "EMAIL_HOST" : null,
      !email.port ? "EMAIL_PORT" : null,
      !email.user ? "EMAIL_USERNAME/EMAIL_USER" : null,
      !email.pass ? "EMAIL_PASSWORD/EMAIL_PASS" : null,
    ].filter(Boolean);

    return {
      transporter: await createTestTransporter(),
      deliveredVia: "ethereal",
      fallbackReason: `SMTP config missing: ${missingFields.join(", ")}`,
    };
  }

  return {
    transporter: nodemailer.createTransport({
      host: email.host,
      port: Number(email.port),
      secure: Number(email.port) === 465,
      auth: {
        user: email.user,
        pass: email.pass,
      },
    }),
    deliveredVia: "smtp",
  };
};

const sendEmail = async ({ to, subject, html, text }) => {
  const payload = {
    from: `InterviewIQ <${email.user || "no-reply@interviewiq.app"}>`,
    to,
    subject,
    html,
    text,
  };

  const { transporter, deliveredVia } = await createTransporter();
  const defaultFallbackReason = deliveredVia === "ethereal" ? "SMTP delivery not active." : null;

  try {
    const info = await transporter.sendMail(payload);
    return {
      messageId: info.messageId,
      previewUrl: nodemailer.getTestMessageUrl(info),
      deliveredVia,
      fallbackReason: defaultFallbackReason || undefined,
    };
  } catch (primaryError) {
    if (process.env.NODE_ENV === "production" || deliveredVia === "ethereal") {
      throw primaryError;
    }

    // Development fallback when configured SMTP fails (e.g., wrong app password).
    const fallbackTransporter = await createTestTransporter();
    const fallbackInfo = await fallbackTransporter.sendMail(payload);

    return {
      messageId: fallbackInfo.messageId,
      previewUrl: nodemailer.getTestMessageUrl(fallbackInfo),
      deliveredVia: "ethereal",
      fallbackReason: primaryError.message,
    };
  }
};

const sendInterviewSummaryEmail = async (user, interview) => {
  const reportUrl = `${clientUrl}/history`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2D3748;">Interview Analysis Ready</h2>
      <p style="color: #4A5568; font-size: 16px;">Hi ${user.firstName || 'Candidate'},</p>
      <p style="color: #4A5568; font-size: 16px;">
        Your AI-powered mock interview for <strong>${interview.title}</strong> is complete!
      </p>
      
      <div style="background-color: #F7FAFC; padding: 20px; border-radius: 8px; margin: 24px 0;">
        <h3 style="margin-top: 0; color: #2B6CB0;">Performance Score: ${interview.results.score}%</h3>
        <p style="color: #4A5568;"><strong>Key Strengths:</strong> ${interview.results.strengths?.slice(0, 2).join(', ') || 'N/A'}</p>
        <p style="color: #4A5568;"><strong>Focus Areas:</strong> ${interview.results.improvements?.slice(0, 2).join(', ') || 'N/A'}</p>
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
};
