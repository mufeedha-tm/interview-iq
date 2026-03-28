const express = require("express");
const multer = require("multer");
const {
  createInterview,
  updateInterview,
  addAnswers,
  updateResults,
  deleteInterview,
  getInterviews,
  getInterviewHistory,
  getInterviewById,
  generateInterviewEngineResponse,
  getInterviewRoles,
  generateNextQuestion,
  uploadInterviewMedia,
} = require("../controllers/interviewController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.use(protect);

router.get("/roles", getInterviewRoles);
router.post("/engine", generateInterviewEngineResponse);
router.post("/", createInterview);
router.get("/", getInterviews);
router.get("/history", getInterviewHistory);
router.get("/:id", getInterviewById);
router.put("/:id", updateInterview);
router.patch("/:id", updateInterview);
router.post("/:id/answers", addAnswers);
router.post("/:id/media", upload.single("media"), uploadInterviewMedia);
router.post("/:id/next-question", generateNextQuestion);
router.patch("/:id/results", updateResults);
router.delete("/:id", deleteInterview);

module.exports = router;
