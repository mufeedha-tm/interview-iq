const { email } = require("../config/env");
const { verifyEmailTransport } = require("../utils/email");

const describeConfiguredUser = () => email.user || "(missing EMAIL_USER)";

const run = async () => {
  console.log(`Checking Gmail SMTP for ${describeConfiguredUser()}...`);
  const result = await verifyEmailTransport({ force: true });
  console.log(`Email transport ready via ${result.transport}.`);
};

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
