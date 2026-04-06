const http = require("http");
const app = require("./app");
const connectDB = require("./config/db");
const { port } = require("./config/env");
const { verifyEmailTransport } = require("./utils/email");

const start = async () => {
  await connectDB();

  try {
    const emailStatus = await verifyEmailTransport({ force: true });
    console.log(`Email transport verified via ${emailStatus.transport}.`);
  } catch (emailError) {
    console.warn(`Email transport verification failed on startup: ${emailError.message}`);
    console.warn("OTP emails will not send until Gmail app-password settings are corrected.");
  }

  const server = http.createServer(app);
  server.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
};

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
