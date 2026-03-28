const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const { jwtSecret } = require("../config/env");

const protect = async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  } else if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, token missing" });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ message: "Not authorized, user not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Not authorized, access token expired" });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Not authorized, token invalid" });
    }
    return res.status(401).json({ message: "Not authorized, token invalid" });
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
};

module.exports = {
  protect,
  restrictTo,
};
