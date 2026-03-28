const http = require("http");
const app = require("./app");
const connectDB = require("./config/db");
const { port } = require("./config/env");

const start = async () => {
  await connectDB();

  const server = http.createServer(app);
  server.listen(port, () => {
    console.log(`🚀 Server listening on http://localhost:${port}`);
  });
};

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
