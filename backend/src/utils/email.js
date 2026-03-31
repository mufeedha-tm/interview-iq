const nodemailer = require("nodemailer");
const { email, clientUrl } = require("../config/env");
const { ApiError } = require("./apiError");

const getFromAddress = () => {
  const service = String(email.service || "").toLowerCase();
  const fromEmail =
    service === "gmail"
      ? email.user || email.fromEmail || "no-reply@interviewiq.app"
      : email.fromEmail || email.user || "no-reply@interviewiq.app";

  return `${email.fromName || "InterviewIQ"} <${fromEmail}>`;
};

const getMissingEmailFields = () => {
  const missing = [];

  if (!email.service) {
    missing.push("EMAIL_SERVICE");
  }
  if (!email.user) {
    missing.push("EMAIL_USER");
  }
  if (!email.pass) {
    missing.push("EMAIL_PASS");
  }

  return missing;
};

const createEmailTransporter = () => {
  const missingFields = getMissingEmailFields();
  if (missingFields.length > 0) {
    throw new ApiError(`Email config missing: ${missingFields.join(", ")}`, 500);
  }

  return nodemailer.createTransport({
    service: email.service,
    auth: {
      user: email.user,
      pass: email.pass,
    },
  });
};

const sendEmail = async ({ to, subject, html, text }) => {
  const payload = {
    from: getFromAddress(),
    to,
    subject,
    html,
    text,
  };

  const transporter = createEmailTransporter();
  const info = await transporter.sendMail(payload);

  return {
    messageId: info.messageId,
    deliveredVia: "email",
  };
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
};
