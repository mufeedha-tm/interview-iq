const path = require("path");
const dotenv = require("dotenv");

const envFile = process.env.NODE_ENV === "test" ? ".env.test" : ".env";
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

const normalizedEmailService = String(process.env.EMAIL_SERVICE || "gmail").toLowerCase();
const normalizedEmailPort = process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : undefined;
const defaultEmailHost =
  process.env.EMAIL_HOST || (normalizedEmailService === "gmail" ? "smtp.gmail.com" : undefined);
const defaultEmailPort = normalizedEmailPort || (normalizedEmailService === "gmail" ? 465 : undefined);
const defaultEmailSecure = process.env.EMAIL_SECURE
  ? process.env.EMAIL_SECURE === "true"
  : defaultEmailPort === 465;

module.exports = {
  port: process.env.PORT || 4000,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "15m", 
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "default_refresh_secret",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  email: {
    service: normalizedEmailService,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS || process.env.SENDGRID_API_KEY,
    fromEmail: process.env.EMAIL_FROM || process.env.MAIL_FROM_EMAIL || process.env.EMAIL_USER,
    fromName: process.env.EMAIL_FROM_NAME || "InterviewIQ",
    host: defaultEmailHost,
    port: defaultEmailPort,
    secure: defaultEmailSecure,
  },
};
