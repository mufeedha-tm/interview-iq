const Question = require("../models/questionModel");
const {
  buildSeedQuestions,
  getStaticRoleConfig,
  listStaticRoles,
  normalizeInterviewType,
  normalizeRoleKey,
} = require("../config/questionBank");

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildRoleMatch(role) {
  const rawRole = String(role || "").trim();
  const normalizedRole = normalizeRoleKey(rawRole);
  const conditions = [{ roleKey: normalizedRole }];

  if (rawRole) {
    conditions.unshift({ roleKey: rawRole.toLowerCase() });
    conditions.unshift({ roleLabel: new RegExp(`^${escapeRegex(rawRole)}$`, "i") });
  }

  return { $or: conditions };
}

async function ensureQuestionSeedData() {
  const existingCount = await Question.estimatedDocumentCount();
  if (existingCount > 0) {
    return { seeded: false, count: existingCount };
  }

  const seedQuestions = buildSeedQuestions();
  if (!seedQuestions.length) {
    return { seeded: false, count: 0 };
  }

  await Question.insertMany(seedQuestions, { ordered: false });
  return { seeded: true, count: seedQuestions.length };
}

async function getQuestionPool(role, interviewType) {
  const normalizedType = normalizeInterviewType(interviewType);
  const docs = await Question.find({
    ...buildRoleMatch(role),
    interviewType: normalizedType,
    isActive: true,
  })
    .sort({ order: 1, createdAt: 1 })
    .select("question");

  if (docs.length) {
    return docs.map((item) => item.question);
  }

  const staticRoleConfig = getStaticRoleConfig(role);
  return (
    staticRoleConfig.questionLibrary?.[normalizedType] ||
    staticRoleConfig.questionLibrary?.technical ||
    []
  );
}

async function listQuestionRoles() {
  const roles = await Question.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: "$roleKey",
        label: { $first: "$roleLabel" },
        defaultSkills: { $first: "$defaultSkills" },
        interviewTypes: { $addToSet: "$interviewType" },
      },
    },
    { $sort: { label: 1 } },
  ]);

  if (roles.length) {
    return roles.map((item) => ({
      key: item._id,
      label: item.label,
      defaultSkills: item.defaultSkills || [],
      interviewTypes: item.interviewTypes.sort(),
    }));
  }

  return listStaticRoles();
}

module.exports = {
  ensureQuestionSeedData,
  getQuestionPool,
  listQuestionRoles,
};
