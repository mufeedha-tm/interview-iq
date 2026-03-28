const express = require("express");
const multer = require("multer");
const router = express.Router();
const {
  signup,
  verifyEmailOtp,
  resendOtp,
  login,
  forgotPassword,
  resetPassword,
  getMe,
  updateProfile,
  changePassword,
  uploadAvatar,
  refreshToken,
  logout
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"), false);
    }

    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post("/signup", signup);
router.post("/verify-email", verifyEmailOtp);
router.post("/resend-otp", resendOtp);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/resend-password-otp", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/refresh-token", refreshToken);
router.post("/logout", logout);

router.get("/me", protect, getMe);
router.patch("/me", protect, updateProfile);
router.post("/change-password", protect, changePassword);
router.post("/avatar", protect, upload.single("avatar"), uploadAvatar);

module.exports = router;
