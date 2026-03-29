const crypto = require("crypto");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    otpCode: {
      type: String,
      select: false,
    },
    otpExpires: {
      type: Date,
      select: false,
    },
    otpPurpose: {
      type: String,
      enum: ["verify_email", "reset_password"],
      default: null,
      select: false,
    },
    otpIssuedAt: {
      type: Date,
      default: null,
      select: false,
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
    },
    resumeUrl: {
      type: String,
      default: null,
    },
    resumePublicId: {
      type: String,
      default: null,
      select: false,
    },
    resumeUploadedAt: {
      type: Date,
      default: null,
    },
    resumeEvaluation: {
      type: new mongoose.Schema({
        score: Number,
        tips: [String],
        analyzedAt: Date
      }),
      default: null,
    },
    firstName: {
      type: String,
      default: "",
      trim: true,
    },
    lastName: {
      type: String,
      default: "",
      trim: true,
    },
    headline: {
      type: String,
      default: "",
      trim: true,
    },
    targetRole: {
      type: String,
      default: "",
      trim: true,
    },
    experienceLevel: {
      type: String,
      default: "",
      trim: true,
    },
    bio: {
      type: String,
      default: "",
      trim: true,
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    avatarPublicId: {
      type: String,
      default: null,
      select: false,
    },
    subscriptionTier: {
      type: String,
      enum: ["free", "premium"],
      default: "free",
    },
    premiumInterviewsRemaining: {
      type: Number,
      default: 0,
      min: 0,
    },
    premiumExpiresAt: {
      type: Date,
      default: null,
    },
    processedStripeSessionIds: {
      type: [String],
      default: [],
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.isValidPassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.createOtp = function (purpose = "verify_email") {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otpCode = crypto.createHash("sha256").update(otp).digest("hex");
  this.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  this.otpPurpose = purpose;
  this.otpIssuedAt = new Date();
  return otp;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  this.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  return resetToken;
};

userSchema.methods.generateJwtRefreshToken = function (jwtRefreshSecret, jwtRefreshExpiresIn) {
  const jwt = require("jsonwebtoken");
  return jwt.sign({ id: this._id }, jwtRefreshSecret, {
    expiresIn: jwtRefreshExpiresIn,
  });
};

userSchema.methods.generateJwtToken = function (jwtSecret, jwtExpiresIn) {
  const jwt = require("jsonwebtoken");
  return jwt.sign({ id: this._id, role: this.role }, jwtSecret, {
    expiresIn: jwtExpiresIn,
  });
};

const User = mongoose.model("User", userSchema);
module.exports = User;
