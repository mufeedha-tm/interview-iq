const { email } = require("../config/env");
const { verifyEmailTransport } = require("../utils/email");

const describeConfiguredProvider = () =>
  email.provider === "resend"
    ? `Resend API from ${email.fromEmail || "(missing EMAIL_FROM)"}`
    : `SMTP for ${email.user || "(missing EMAIL_USER)"}`;

const run = async () => {
  console.log(`Checking ${describeConfiguredProvider()}...`);
  const result = await verifyEmailTransport({ force: true });
  console.log(`Email transport ready via ${result.transport}.`);
};

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
