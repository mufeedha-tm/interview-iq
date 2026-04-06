const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    roleKey: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    roleLabel: {
      type: String,
      required: true,
      trim: true,
    },
    interviewType: {
      type: String,
      enum: ["behavioral", "technical", "system-design"],
      required: true,
    },
    question: {
      type: String,
      required: true,
      trim: true,
    },
    defaultSkills: {
      type: [String],
      default: [],
    },
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    source: {
      type: String,
      enum: ["seed", "custom"],
      default: "custom",
    },
  },
  {
    timestamps: true,
  }
);

questionSchema.index({ roleKey: 1, interviewType: 1, order: 1 });
questionSchema.index({ roleKey: 1, interviewType: 1, question: 1 }, { unique: true });

const Question = mongoose.model("Question", questionSchema);

module.exports = Question;
