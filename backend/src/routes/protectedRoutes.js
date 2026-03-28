const express = require("express");
const router = express.Router();
const { protect, restrictTo } = require("../middleware/authMiddleware");
const { getSecret } = require("../controllers/protectedController");

router.get("/secret", protect, getSecret);
router.get("/admin", protect, restrictTo("admin"), (req, res) => {
  res.json({ message: "Welcome, admin!" });
});

module.exports = router;
