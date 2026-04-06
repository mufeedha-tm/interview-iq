const Question = require("../models/questionModel");
const { normalizeInterviewType, normalizeRoleKey } = require("../config/questionBank");

function sanitizeSkills(skills = []) {
  return [...new Set((Array.isArray(skills) ? skills : [])
    .map((item) => String(item || "").trim().toLowerCase())
    .filter(Boolean))];
}

function slugifyRoleKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function deriveRoleKey(roleKey, roleLabel) {
  const explicitKey = slugifyRoleKey(roleKey);
  if (explicitKey) {
    return explicitKey;
  }

  const normalizedLabel = String(roleLabel || "").trim();
  const normalizedRole = normalizeRoleKey(normalizedLabel);

  if (normalizedRole === "fullstack" && normalizedLabel && !/full/i.test(normalizedLabel)) {
    return slugifyRoleKey(normalizedLabel);
  }

  return normalizedRole;
}

async function resolveQuestionOrder(roleKey, interviewType, requestedOrder) {
  if (requestedOrder !== undefined && requestedOrder !== null && requestedOrder !== "") {
    return Number(requestedOrder) || 0;
  }

  const lastQuestion = await Question.findOne({ roleKey, interviewType }).sort({ order: -1 }).select("order");
  return lastQuestion ? lastQuestion.order + 1 : 0;
}

const getQuestions = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 12,
      search,
      roleKey,
      interviewType,
      isActive,
    } = req.query;

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;
    const query = {};

    if (roleKey) {
      query.roleKey = String(roleKey).trim().toLowerCase();
    }

    if (interviewType) {
      query.interviewType = normalizeInterviewType(interviewType);
    }

    if (isActive === "true" || isActive === "false") {
      query.isActive = isActive === "true";
    }

    if (search) {
      query.$or = [
        { question: { $regex: search, $options: "i" } },
        { roleLabel: { $regex: search, $options: "i" } },
        { defaultSkills: { $elemMatch: { $regex: search, $options: "i" } } },
      ];
    }

    const [questions, total, roleOptions] = await Promise.all([
      Question.find(query).sort({ roleLabel: 1, interviewType: 1, order: 1, createdAt: 1 }).skip(skip).limit(limitNumber),
      Question.countDocuments(query),
      Question.aggregate([
        {
          $group: {
            _id: "$roleKey",
            label: { $first: "$roleLabel" },
          },
        },
        { $sort: { label: 1 } },
      ]),
    ]);

    res.status(200).json({
      questions,
      filters: {
        roles: roleOptions.map((item) => ({
          key: item._id,
          label: item.label,
        })),
      },
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

const getQuestionById = async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    res.status(200).json({ question });
  } catch (error) {
    next(error);
  }
};

const createQuestion = async (req, res, next) => {
  try {
    const roleLabel = String(req.body.roleLabel || "").trim();
    const questionText = String(req.body.question || "").trim();

    if (!roleLabel) {
      return res.status(400).json({ message: "Role label is required" });
    }

    if (!questionText) {
      return res.status(400).json({ message: "Question text is required" });
    }

    const nextRoleKey = deriveRoleKey(req.body.roleKey, roleLabel);
    const nextInterviewType = normalizeInterviewType(req.body.interviewType);
    const nextOrder = await resolveQuestionOrder(nextRoleKey, nextInterviewType, req.body.order);

    const question = await Question.create({
      roleKey: nextRoleKey,
      roleLabel,
      interviewType: nextInterviewType,
      question: questionText,
      defaultSkills: sanitizeSkills(req.body.defaultSkills),
      order: nextOrder,
      isActive: req.body.isActive !== undefined ? Boolean(req.body.isActive) : true,
      source: "custom",
    });

    res.status(201).json({ question });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "This question already exists for the selected role and interview type." });
    }
    next(error);
  }
};

const updateQuestion = async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    const nextRoleLabel =
      req.body.roleLabel !== undefined ? String(req.body.roleLabel || "").trim() : question.roleLabel;
    const nextQuestionText =
      req.body.question !== undefined ? String(req.body.question || "").trim() : question.question;

    if (!nextRoleLabel) {
      return res.status(400).json({ message: "Role label is required" });
    }

    if (!nextQuestionText) {
      return res.status(400).json({ message: "Question text is required" });
    }

    const nextInterviewType =
      req.body.interviewType !== undefined
        ? normalizeInterviewType(req.body.interviewType)
        : question.interviewType;
    const nextRoleKey = deriveRoleKey(
      req.body.roleKey !== undefined ? req.body.roleKey : question.roleKey,
      nextRoleLabel
    );

    question.roleKey = nextRoleKey;
    question.roleLabel = nextRoleLabel;
    question.interviewType = nextInterviewType;
    question.question = nextQuestionText;

    if (req.body.defaultSkills !== undefined) {
      question.defaultSkills = sanitizeSkills(req.body.defaultSkills);
    }

    if (req.body.order !== undefined) {
      question.order = Number(req.body.order) || 0;
    }

    if (req.body.isActive !== undefined) {
      question.isActive = Boolean(req.body.isActive);
    }

    await question.save();
    res.status(200).json({ question });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "This question already exists for the selected role and interview type." });
    }
    next(error);
  }
};

const deleteQuestion = async (req, res, next) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    res.status(200).json({ message: "Question deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createQuestion,
  deleteQuestion,
  getQuestionById,
  getQuestions,
  updateQuestion,
};
