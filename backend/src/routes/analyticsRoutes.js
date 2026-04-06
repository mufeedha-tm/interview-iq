const express = require("express");
const {
  getAnalytics,
  getInterviewUserReport,
  getLeaderboard,
  getAdminDashboard,
} = require("../controllers/analyticsController");
const { protect, restrictTo } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);
router.get("/admin-dashboard", restrictTo("admin"), getAdminDashboard);
router.get("/summary", getAnalytics);
router.get("/leaderboard", getLeaderboard);
router.get("/joined-report", restrictTo("admin"), getInterviewUserReport);

module.exports = router;
