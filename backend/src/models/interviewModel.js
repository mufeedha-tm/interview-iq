const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    answer: { type: String, required: true },
    mediaUrl: { type: String },
    mediaType: { type: String, enum: ["audio", "video"] },
    evaluation: {
      score: { type: Number, min: 0, max: 100 },
      feedback: { type: String },
      strengths: [{ type: String }],
      improvements: [{ type: String }],
    },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const resultSchema = new mongoose.Schema(
  {
    score: { type: Number, min: 0, max: 100 },
    feedback: { type: String },
    rubric: [
      new mongoose.Schema(
        {
          name: { type: String },
          score: { type: Number, min: 0, max: 100 },
          summary: { type: String },
        },
        { _id: false }
      ),
    ],
    strengths: [{ type: String }],
    improvements: [{ type: String }],
    coachingTips: [{ type: String }],
    followUpQuestions: [{ type: String }],
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const interviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    description: { type: String },
    status: {
      type: String,
      enum: ["draft", "in_progress", "completed", "cancelled"],
      default: "draft",
    },
    questions: [{ type: String }],
    answers: [answerSchema],
    results: resultSchema,
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    skills: [{ type: String }],
  },
  {
    timestamps: true,
  }
);

const Interview = mongoose.model("Interview", interviewSchema);
module.exports = Interview;
