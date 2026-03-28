const Interview = require("../models/interviewModel");
const { runInterviewEngine, generateNextQuestionEngine } = require("../services/aiInterviewEngine");
const { sendInterviewSummaryEmail } = require("../utils/email");
const streamifier = require("streamifier");
const cloudinary = require("../config/cloudinary");
const { listRoles } = require("../config/questionBank");

const createInterview = async (req, res, next) => {
  try {
    const { title, description, questions = [], difficulty, skills = [] } = req.body;
    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    const interview = await Interview.create({
      user: req.user._id,
      title,
      description,
      questions,
      difficulty,
      skills,
    });

    res.status(201).json({ interview });
  } catch (error) {
    next(error);
  }
};

const updateInterview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const interview = await Interview.findOne({ _id: id, user: req.user._id });

    if (!interview) {
      return res.status(404).json({ message: "Interview not found" });
    }

    const allowedFields = ["title", "description", "status", "questions", "difficulty", "skills"];
    const updates = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (updates.title !== undefined && !String(updates.title).trim()) {
      return res.status(400).json({ message: "Title is required" });
    }

    if (updates.questions !== undefined && !Array.isArray(updates.questions)) {
      return res.status(400).json({ message: "Questions must be an array" });
    }

    if (updates.skills !== undefined && !Array.isArray(updates.skills)) {
      return res.status(400).json({ message: "Skills must be an array" });
    }

    Object.assign(interview, updates);
    await interview.save();

    res.status(200).json({ interview });
  } catch (error) {
    next(error);
  }
};

const addAnswers = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { answers } = req.body;

    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ message: "Answers must be a non-empty array" });
    }

    const interview = await Interview.findOne({ _id: id, user: req.user._id });
    if (!interview) {
      return res.status(404).json({ message: "Interview not found" });
    }

    const normalizedEntries = answers
      .map((entry) => ({
        question: typeof entry?.question === "string" ? entry.question.trim() : "",
        answer: typeof entry?.answer === "string" ? entry.answer.trim() : "",
      }))
      .filter((entry) => entry.question);

    if (!normalizedEntries.length) {
      return res.status(400).json({ message: "Each answer must include a valid question" });
    }

    normalizedEntries.forEach((entry) => {
      const existingAnswerIndex = interview.answers.findIndex(
        (item) => String(item.question || "").trim().toLowerCase() === entry.question.toLowerCase()
      );

      const normalizedAnswer = entry.answer || "(No answer provided within time limit)";

      if (existingAnswerIndex >= 0) {
        interview.answers[existingAnswerIndex].question = entry.question;
        interview.answers[existingAnswerIndex].answer = normalizedAnswer;
        if (!interview.answers[existingAnswerIndex].createdAt) {
          interview.answers[existingAnswerIndex].createdAt = new Date();
        }
      } else {
        interview.answers.push({ question: entry.question, answer: normalizedAnswer });
      }
    });

    interview.status = "in_progress";
    await interview.save();

    res.status(200).json({ interview });
  } catch (error) {
    next(error);
  }
};

const updateResults = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { score, feedback, rubric, strengths, improvements, coachingTips, followUpQuestions, status, answerEvaluations } = req.body;

    const interview = await Interview.findOne({ _id: id, user: req.user._id });
    if (!interview) {
      return res.status(404).json({ message: "Interview not found" });
    }

    interview.results = {
      score: typeof score === "number" ? score : interview.results?.score,
      feedback: feedback ?? interview.results?.feedback,
      rubric: Array.isArray(rubric) ? rubric : interview.results?.rubric,
      strengths: Array.isArray(strengths) ? strengths : interview.results?.strengths,
      improvements: Array.isArray(improvements) ? improvements : interview.results?.improvements,
      coachingTips: Array.isArray(coachingTips) ? coachingTips : interview.results?.coachingTips,
      followUpQuestions: Array.isArray(followUpQuestions)
        ? followUpQuestions
        : interview.results?.followUpQuestions,
      updatedAt: new Date(),
    };

    if (status) {
      interview.status = status;
    }

    if (Array.isArray(answerEvaluations)) {
      answerEvaluations.forEach((evalEntry) => {
        const answerSubdoc = interview.answers.find((a) => a.question === evalEntry.question);
        if (answerSubdoc && evalEntry.evaluation) {
          answerSubdoc.evaluation = evalEntry.evaluation;
        }
      });
    }

    await interview.save();

    res.status(200).json({ interview });
  } catch (error) {
    next(error);
  }
};

const deleteInterview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const interview = await Interview.findOneAndDelete({ _id: id, user: req.user._id });
    if (!interview) {
      return res.status(404).json({ message: "Interview not found" });
    }

    res.status(200).json({ message: "Interview deleted" });
  } catch (error) {
    next(error);
  }
};

const User = require("../models/userModel");

const buildInterviewQuery = async (req) => {
  const { role, startDate, endDate, minScore, maxScore, difficulty, q, status, category } = req.query;

  const query = {};

  // Only admins can filter by role; normal users see their own interviews.
  if (req.user.role === "admin" && role) {
    const users = await User.find({ role }).select("_id");
    const userIds = users.map((u) => u._id);
    query.user = { $in: userIds };
  } else {
    query.user = req.user._id;
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  if (minScore || maxScore) {
    query["results.score"] = {};
    if (minScore) query["results.score"].$gte = Number(minScore);
    if (maxScore) query["results.score"].$lte = Number(maxScore);
  }

  if (difficulty) {
    query.difficulty = difficulty;
  }

  if (status) {
    query.status = status;
  }

  if (category) {
    query.skills = category;
  }

  if (q) {
    query.$or = [
      { title: { $regex: q, $options: "i" } },
      { description: { $regex: q, $options: "i" } },
    ];
  }

  return query;
};

const getInterviews = async (req, res, next) => {
  try {
    const query = await buildInterviewQuery(req);
    const { page = 1, limit = 10 } = req.query;

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    const [interviews, total] = await Promise.all([
      Interview.find(query).skip(skip).limit(limitNumber).sort({ updatedAt: -1 }),
      Interview.countDocuments(query),
    ]);

    res.status(200).json({
      interviews,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    next(error);
  }
};

const getInterviewHistory = getInterviews;

const getInterviewById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const interview = await Interview.findOne({ _id: id, user: req.user._id });
    if (!interview) {
      return res.status(404).json({ message: "Interview not found" });
    }

    res.status(200).json({ interview });
  } catch (error) {
    next(error);
  }
};

const generateInterviewEngineResponse = async (req, res, next) => {
  try {
    const { role, interviewType, difficulty, question, answer } = req.body;

    if (!role) {
      return res.status(400).json({ message: "Role is required" });
    }

    if (!interviewType) {
      return res.status(400).json({ message: "Interview type is required" });
    }

    if ((question && !answer) || (!question && answer)) {
      return res.status(400).json({
        message: "Question and answer must both be provided when requesting evaluation",
      });
    }

    const result = runInterviewEngine({
      ...req.body,
      difficulty: difficulty || "medium",
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getInterviewRoles = async (_req, res, next) => {
  try {
    res.status(200).json({ roles: listRoles() });
  } catch (error) {
    next(error);
  }
};

const generateNextQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { question, answer, currentIndex } = req.body;

    const interview = await Interview.findOne({ _id: id, user: req.user._id });
    if (!interview) {
      return res.status(404).json({ message: "Interview not found" });
    }

    const nextQuestionText = generateNextQuestionEngine({
      role: interview.title,
      interviewType: "mixed",
      difficulty: interview.difficulty,
      skills: interview.skills,
      question,
      answer,
      existingQuestions: interview.questions,
    });

    if (nextQuestionText) {
      const nextIndex = Number.isInteger(currentIndex) ? currentIndex + 1 : -1;
      const hasQuestion = interview.questions.some(
        (item) => String(item || "").trim().toLowerCase() === String(nextQuestionText).trim().toLowerCase()
      );

      if (nextIndex >= 0 && nextIndex < interview.questions.length) {
        interview.questions[nextIndex] = nextQuestionText;
      } else if (!hasQuestion) {
        interview.questions.push(nextQuestionText);
      }

      await interview.save();
    }

    res.status(200).json({ interview, nextQuestion: nextQuestionText });
  } catch (error) {
    next(error);
  }
};

const uploadInterviewMedia = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { question } = req.body;

    if (!req.file || !question) {
      return res.status(400).json({ message: "Media blob and question text are required" });
    }

    const interview = await Interview.findOne({ _id: id, user: req.user._id });
    if (!interview) {
      return res.status(404).json({ message: "Interview not found" });
    }

    const answerSubdoc = interview.answers.find((a) => a.question === question);
    if (!answerSubdoc) {
      return res.status(404).json({ message: "Text answer record must exist before appending media" });
    }

    const isVideo = req.file.mimetype.startsWith("video/");

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "interviewiq/recordings",
        resource_type: "video",
        public_id: `${req.user._id}_${id}_${Date.now()}`,
      },
      async (error, result) => {
        if (error) {
          return next(error);
        }

        answerSubdoc.mediaUrl = result.secure_url;
        answerSubdoc.mediaType = isVideo ? "video" : "audio";
        
        await interview.save();

        return res.status(200).json({
          message: "Media uploaded successfully",
          answer: answerSubdoc,
        });
      }
    );

    streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
