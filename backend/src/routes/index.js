const express = require("express");
const authRoutes = require("./authRoutes");
const protectedRoutes = require("./protectedRoutes");
const resumeRoutes = require("./resumeRoutes");
const interviewRoutes = require("./interviewRoutes");
const analyticsRoutes = require("./analyticsRoutes");
const paymentRoutes = require("./paymentRoutes");
const userRoutes = require("./userRoutes");
const questionRoutes = require("./questionRoutes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/resume", resumeRoutes);
router.use("/interviews", interviewRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/payments", paymentRoutes);
router.use("/protected", protectedRoutes);
router.use("/users", userRoutes);
router.use("/questions", questionRoutes);

router.get("/", (req, res) => {
  res.json({ message: "InterviewIQ backend is running" });
});

module.exports = router;
