const errorHandler = (err, req, res, next) => {
  const statusCode =
    err.statusCode ||
    err.status ||
    (res.statusCode && res.statusCode !== 200 ? res.statusCode : null) ||
    500;

  if (statusCode >= 500) {
    console.error(err.message || err);
    if (process.env.NODE_ENV !== "production") {
      console.error(err.stack);
    }
  } else {
    console.warn(err.message || err);
  }

  res.status(statusCode).json({
    message: err.message || "Server Error",
    ...(process.env.NODE_ENV === "production" ? {} : { stack: err.stack }),
  });
};

module.exports = { errorHandler };
