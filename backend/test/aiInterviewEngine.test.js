const test = require("node:test");
const assert = require("node:assert/strict");

const servicePath = require.resolve("../src/services/questionBankService");
const enginePath = require.resolve("../src/services/aiInterviewEngine");
const originalServiceModule = require.cache[servicePath];

require.cache[servicePath] = {
  id: servicePath,
  filename: servicePath,
  loaded: true,
  exports: {
    getQuestionPool: async (role, interviewType) => [
      `${role}:${interviewType}:question-1`,
      `${role}:${interviewType}:question-2`,
      `${role}:${interviewType}:question-3`,
    ],
  },
};

delete require.cache[enginePath];

const {
  generateNextQuestionEngine,
  runInterviewEngine,
} = require("../src/services/aiInterviewEngine");

test.after(() => {
  delete require.cache[enginePath];

  if (originalServiceModule) {
    require.cache[servicePath] = originalServiceModule;
    return;
  }

  delete require.cache[servicePath];
});

test("runInterviewEngine pulls questions from the question bank service", async () => {
  const result = await runInterviewEngine({
    role: "Frontend Engineer",
    interviewType: "system design",
    difficulty: "hard",
    experienceLevel: "senior",
    questionCount: 2,
    skills: ["React", "Accessibility"],
  });

  assert.equal(result.interview.interviewType, "system-design");
  assert.equal(result.questions.length, 2);
  assert.match(result.questions[0].question, /Frontend Engineer:system design:question-1/);
  assert.match(result.questions[0].question, /Focus on react, accessibility\./i);
  assert.match(result.questions[0].question, /Difficulty: hard\./);
});

test("generateNextQuestionEngine falls back to a fresh prompt when top follow-ups are already used", async () => {
  const nextQuestion = await generateNextQuestionEngine({
    role: "Frontend Engineer",
    interviewType: "technical",
    difficulty: "medium",
    skills: ["React"],
    question: "Tell me about a feature you shipped.",
    answer: "I worked on a launch and improved the flow for users.",
    existingQuestions: [
      "What metrics did you use to measure success in that work as a Frontend Engineer?",
      "Can you walk me through the situation, your specific action, and the final outcome more clearly?",
      "What constraints, trade-offs, or risks influenced the decision you made?",
    ],
  });

  assert.equal(
    nextQuestion,
    "Can you share a different real-world example in your Frontend Engineer work and explain the outcome?"
  );
});
