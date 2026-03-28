const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const routes = require("./routes");
const { errorHandler } = require("./middleware/errorMiddleware");

const app = express();
const defaultClientOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];
const configuredClientOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = [...new Set([...configuredClientOrigins, ...defaultClientOrigins])];

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser requests (no Origin header) and known client origins.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.use(helmet());
// express-mongo-sanitize reassigns req.query internally, which breaks on Express 5
// because req.query is exposed as a getter-only property.
app.use((req, _res, next) => {
  if (req.originalUrl.startsWith("/api/payments/webhook")) {
    return next();
  }

  ["body", "params", "headers", "query"].forEach((key) => {
    if (req[key]) {
      mongoSanitize.sanitize(req[key]);
    }
  });
  next();
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 150, 
  message: "Too many requests originating from this IP, please try again after 15 minutes."
});

// Apply rate limiting to all /api routes
app.use("/api", limiter);

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.use("/api", routes);
app.use(errorHandler);

module.exports = app;
