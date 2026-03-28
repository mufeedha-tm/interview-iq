const express = require("express");
const {
  getAnalytics,
  getInterviewUserReport,
  getLeaderboard,
} = require("../controllers/analyticsController");
const { protect, restrictTo } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);
router.get("/summary", getAnalytics);
router.get("/leaderboard", getLeaderboard);
router.get("/joined-report", restrictTo("admin"), getInterviewUserReport);

module.exports = router;
