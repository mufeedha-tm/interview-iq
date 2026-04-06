const DEFAULT_SKILLS = ["communication", "problem solving", "technical depth"];
const { getQuestionPool } = require("./questionBankService");

const FALLBACK_LIBRARY = {
  behavioral: [
    "Tell me about a time you had to make a difficult technical trade-off under pressure.",
    "Describe a project where you influenced stakeholders without direct authority.",
    "Walk me through a time you received tough feedback and how you responded.",
    "Tell me about a situation where priorities changed suddenly. How did you adapt?",
  ],
  technical: [
    "How would you debug a production issue that appears intermittently under load?",
    "Explain how you would improve the performance of a slow user-facing feature.",
    "Describe the architecture you would choose for a scalable interview analytics service.",
    "How would you design a robust API contract between the frontend and backend for live interview sessions?",
  ],
  "system-design": [
    "Design an interview session platform that supports live scoring and transcript analysis.",
    "How would you build a follow-up question engine that adapts in real time to candidate responses?",
    "Design a reporting system for interview analytics across multiple candidates and roles.",
    "How would you architect a resume analysis pipeline with role-specific recommendations?",
  ],
};

function normalizeText(value) {
  return String(value || "").trim();
}

function uniqueItems(items) {
  return [...new Set(items.filter(Boolean))];
}

function pickInterviewType(interviewType) {
  const normalized = normalizeText(interviewType).toLowerCase();

  if (FALLBACK_LIBRARY[normalized]) {
    return normalized;
  }

  if (normalized === "system design") {
    return "system-design";
  }

  return "technical";
}

function getFallbackQuestionPool(interviewType) {
  const type = pickInterviewType(interviewType);
  return FALLBACK_LIBRARY[type] || FALLBACK_LIBRARY.technical;
}

function buildQuestionText(baseQuestion, role, skills, difficulty) {
  const roleText = role ? ` for a ${role}` : "";
  const skillText = skills.length ? ` Focus on ${skills.join(", ")}.` : "";
  const difficultyText = difficulty ? ` Difficulty: ${difficulty}.` : "";

  return `${baseQuestion}${roleText}.${skillText}${difficultyText}`.replace(/\.\./g, ".");
}

async function generateQuestions({
  role,
  interviewType,
  difficulty,
  skills,
  experienceLevel,
  questionCount,
}) {
  const normalizedSkills = uniqueItems((skills || []).map((skill) => normalizeText(skill).toLowerCase()));
  const pool = await getQuestionPool(role, interviewType);

  return pool.slice(0, questionCount).map((question, index) => ({
    id: `q_${index + 1}`,
    type: pickInterviewType(interviewType),
    difficulty,
    experienceLevel,
    skills: normalizedSkills.length ? normalizedSkills : DEFAULT_SKILLS,
    question: buildQuestionText(question, role, normalizedSkills, difficulty),
  }));
}

function extractSignals(question, answer, skills) {
  const normalizedQuestion = normalizeText(question).toLowerCase();
  const normalizedAnswer = normalizeText(answer);
  const answerLower = normalizedAnswer.toLowerCase();
  const words = normalizedAnswer.split(/\s+/).filter(Boolean);
  const sentences = normalizedAnswer.split(/[.!?]+/).map((item) => item.trim()).filter(Boolean);
  const normalizedSkills = uniqueItems((skills || []).map((skill) => normalizeText(skill).toLowerCase()));

  const answerKeywords = uniqueItems(
    normalizedQuestion
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 4)
      .concat(normalizedSkills)
  );

  const matchedKeywords = answerKeywords.filter((token) => answerLower.includes(token));
  const structureTerms = ["situation", "task", "action", "result", "impact", "trade-off", "metric", "outcome"];
  const structureHits = structureTerms.filter((term) => answerLower.includes(term));
  const hasNumbers = /\d/.test(answerLower);
  const avgSentenceLength = sentences.length ? words.length / sentences.length : words.length;

  return {
    wordCount: words.length,
    sentenceCount: sentences.length,
    matchedKeywords,
    keywordCoverage: answerKeywords.length ? matchedKeywords.length / answerKeywords.length : 0,
    structureHits,
    hasNumbers,
    avgSentenceLength,
  };
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function evaluateAnswer({ question, answer, skills }) {
  const signals = extractSignals(question, answer, skills);

  const depthScore = clampScore(Math.min(100, signals.wordCount * 0.55));
  const relevanceScore = clampScore(45 + signals.keywordCoverage * 55);
  const structureScore = clampScore(35 + signals.structureHits.length * 12 + (signals.hasNumbers ? 10 : 0));
  const clarityAdjustment = signals.avgSentenceLength > 28 ? -12 : signals.avgSentenceLength < 7 ? -8 : 8;
  const clarityScore = clampScore(70 + clarityAdjustment);
  const overallScore = clampScore((depthScore + relevanceScore + structureScore + clarityScore) / 4);

  const strengths = [];
  const improvements = [];

  if (signals.wordCount >= 80) {
    strengths.push("You provided enough detail to show ownership and decision-making.");
  } else {
    improvements.push("Add more detail on your actions, reasoning, and final outcome.");
  }

  if (signals.keywordCoverage >= 0.35) {
    strengths.push("Your answer stayed relevant to the prompt and target skills.");
  } else {
    improvements.push("Tie your answer more directly to the question and required skills.");
  }

  if (signals.structureHits.length >= 2) {
    strengths.push("Your answer shows clear structure and progression.");
  } else {
    improvements.push("Use a clearer STAR-style structure so the interviewer can follow your story.");
  }

  if (signals.hasNumbers) {
    strengths.push("You used metrics or concrete evidence to support your impact.");
  } else {
    improvements.push("Include measurable impact, metrics, or outcomes to strengthen credibility.");
  }

  const rubric = [
    { name: "Depth", score: depthScore, summary: "Level of detail and ownership in the response." },
    { name: "Relevance", score: relevanceScore, summary: "Alignment with the interview prompt and target skills." },
    { name: "Structure", score: structureScore, summary: "How clearly the answer follows a logical flow." },
    { name: "Clarity", score: clarityScore, summary: "How easy the response is to understand in real time." },
  ];

  return {
    overallScore,
    rubric,
    strengths,
    improvements,
    signals: {
      wordCount: signals.wordCount,
      keywordMatches: signals.matchedKeywords,
      structureMarkers: signals.structureHits,
      includesMetrics: signals.hasNumbers,
    },
  };
}

function buildFeedback(evaluation) {
  const summary =
    evaluation.overallScore >= 85
      ? "Strong answer with clear ownership and solid interview signal."
      : evaluation.overallScore >= 70
        ? "Promising answer with good fundamentals, but it can be sharper and more evidence-driven."
        : "The answer needs stronger structure, clearer relevance, and more concrete impact.";

  return {
    summary,
    strengths: evaluation.strengths,
    improvements: evaluation.improvements,
    coachingTips: [
      "Lead with the context and goal before diving into details.",
      "Emphasize your personal contribution instead of only the team outcome.",
      "Close with measurable impact and what you learned.",
    ],
  };
}

function generateFollowUpQuestions({ question, answer, evaluation, role, skills }) {
  const followUps = [];
  const normalizedSkills = uniqueItems((skills || []).map((skill) => normalizeText(skill)));

  if (!evaluation.signals.includesMetrics) {
    followUps.push(`What metrics did you use to measure success in that work${role ? ` as a ${role}` : ""}?`);
  }

  if (evaluation.signals.structureMarkers.length < 2) {
    followUps.push("Can you walk me through the situation, your specific action, and the final outcome more clearly?");
  }

  if (evaluation.signals.wordCount < 80) {
    followUps.push("What constraints, trade-offs, or risks influenced the decision you made?");
  }

  if (normalizedSkills.length) {
    followUps.push(`How did you apply ${normalizedSkills[0]} in this example, and what would you improve next time?`);
  }

  if (!followUps.length) {
    followUps.push(`If you had to solve a similar problem again, what would you do differently and why?`);
  }

  return followUps.slice(0, 3).map((item, index) => ({
    id: `f_${index + 1}`,
    question: item,
    reason: `Generated from the answer evaluation for: ${question}`,
  }));
}

async function runInterviewEngine(input) {
  const role = normalizeText(input.role) || "Software Engineer";
  const interviewType = normalizeText(input.interviewType) || "technical";
  const difficulty = normalizeText(input.difficulty).toLowerCase() || "medium";
  const experienceLevel = normalizeText(input.experienceLevel) || "mid-level";
  const skills = Array.isArray(input.skills) && input.skills.length ? input.skills : DEFAULT_SKILLS;
  const questionCount = Math.min(Math.max(Number(input.questionCount) || 4, 1), 8);
  const questionToEvaluate = normalizeText(input.question);
  const answerToEvaluate = normalizeText(input.answer);

  const questions = await generateQuestions({
    role,
    interviewType,
    difficulty,
    skills,
    experienceLevel,
    questionCount,
  });

  const evaluation =
    questionToEvaluate && answerToEvaluate
      ? evaluateAnswer({ question: questionToEvaluate, answer: answerToEvaluate, skills })
      : null;

  const feedback = evaluation ? buildFeedback(evaluation) : null;
  const followUpQuestions =
    evaluation
      ? generateFollowUpQuestions({
          question: questionToEvaluate,
          answer: answerToEvaluate,
          evaluation,
          role,
          skills,
        })
      : [];

  return {
    engine: {
      name: "InterviewIQ AI Interview Engine",
      version: "1.0.0",
      generatedAt: new Date().toISOString(),
      mode: "rule-based",
    },
    interview: {
      role,
      interviewType: pickInterviewType(interviewType),
      difficulty,
      experienceLevel,
      skills: uniqueItems(skills.map((skill) => normalizeText(skill))),
    },
    questions,
    answerEvaluation: evaluation,
    feedback,
    followUpQuestions,
  };
}

async function generateNextQuestionEngine({ role, interviewType, difficulty, skills, question, answer, existingQuestions = [] }) {
  const normalizedQuestion = normalizeText(question)
  const normalizedAnswer = normalizeText(answer)

  if (!normalizedQuestion || !normalizedAnswer) return null

  const existingQuestionSet = new Set(
    (existingQuestions || []).map((item) => normalizeText(item).toLowerCase()).filter(Boolean)
  )
  const evaluation = evaluateAnswer({ question: normalizedQuestion, answer: normalizedAnswer, skills })
  const followUps = generateFollowUpQuestions({ question: normalizedQuestion, answer: normalizedAnswer, evaluation, role, skills })
  
  if (followUps && followUps.length > 0) {
    const uniqueFollowUp = followUps.find(
      (item) => !existingQuestionSet.has(normalizeText(item.question).toLowerCase())
    )

    if (uniqueFollowUp) {
      return uniqueFollowUp.question
    }
  }

  const roleHint = normalizeText(role) ? ` in your ${normalizeText(role)} work` : ""
  const fallbackCandidates = [
    `Can you share a different real-world example${roleHint} and explain the outcome?`,
    `What trade-off mattered most in that decision${roleHint}, and why?`,
    `If you handled a similar problem again${roleHint}, what would you change first?`,
  ]

  const uniqueFallback = fallbackCandidates.find(
    (candidate) => !existingQuestionSet.has(normalizeText(candidate).toLowerCase())
  )

  return uniqueFallback || null
}

function evaluateResume(resumeText, targetRole) {
  const text = normalizeText(resumeText).toLowerCase();
  const role = normalizeText(targetRole).toLowerCase() || "software engineer";
  
  const hasImpact = /\d+%|increased|decreased|improved|led|managed/i.test(text);
  const words = text.split(/\s+/).filter(Boolean);
  
  let score = words.length > 250 ? 70 : 40;
  
  if (hasImpact) score += 15;
  if (role && text.includes(role.split(" ")[0])) score += 10;
  
  score = clampScore(score);

  const tips = [];
  if (words.length < 250) {
    tips.push("Your resume is quite short. Add more detailed bullet points demonstrating ownership.");
  } else {
    tips.push("Good length. Ensure your most recent roles are detailed extensively.");
  }

  if (!hasImpact) {
    tips.push("Recruiters look for data. Add specific numbers (e.g., 'increased performance by 25%').");
  } else {
    tips.push("Excellent use of metrics to demonstrate impact. Make sure they are placed at the beginning of bullets.");
  }

  tips.push(`Verify that core keywords relating to '${role}' feature heavily in your skills section.`);

  return {
    score,
    tips,
    analyzedAt: new Date()
  };
}

module.exports = {
  runInterviewEngine,
  generateNextQuestionEngine,
  evaluateResume
};
