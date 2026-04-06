const test = require("node:test");
const assert = require("node:assert/strict");

const {
  QUESTION_BANK,
  SUPPORTED_INTERVIEW_TYPES,
  buildSeedQuestions,
  getStaticRoleConfig,
  listStaticRoles,
  normalizeInterviewType,
  normalizeRoleKey,
} = require("../src/config/questionBank");

test("normalizeRoleKey maps common admin labels to supported keys", () => {
  assert.equal(normalizeRoleKey("Frontend Engineer"), "frontend");
  assert.equal(normalizeRoleKey("Backend Developer"), "backend");
  assert.equal(normalizeRoleKey("Talent Partner"), "hr");
  assert.equal(normalizeRoleKey("Unknown Role"), "fullstack");
});

test("normalizeInterviewType accepts aliases and falls back safely", () => {
  assert.equal(normalizeInterviewType("behavioral"), "behavioral");
  assert.equal(normalizeInterviewType("system design"), "system-design");
  assert.equal(normalizeInterviewType("unexpected"), "technical");
});

test("getStaticRoleConfig returns a full role definition", () => {
  const config = getStaticRoleConfig("marketing manager");

  assert.equal(config.key, "marketing");
  assert.equal(config.label, "Digital Marketer");
  assert.deepEqual(config.defaultSkills, QUESTION_BANK.marketing.defaultSkills);
});

test("listStaticRoles exposes each configured role and interview types", () => {
  const roles = listStaticRoles();

  assert.equal(roles.length, Object.keys(QUESTION_BANK).length);
  assert.deepEqual(
    roles.find((role) => role.key === "frontend")?.interviewTypes,
    Object.keys(QUESTION_BANK.frontend.questionLibrary)
  );
});

test("buildSeedQuestions creates ordered Mongo seed records for every static question", () => {
  const seeds = buildSeedQuestions();
  const expectedCount = Object.values(QUESTION_BANK).reduce(
    (total, roleConfig) =>
      total +
      Object.values(roleConfig.questionLibrary).reduce((sum, questions) => sum + questions.length, 0),
    0
  );

  assert.equal(seeds.length, expectedCount);
  assert.ok(seeds.every((item) => item.isActive === true));
  assert.ok(seeds.every((item) => item.source === "seed"));
  assert.ok(seeds.every((item) => SUPPORTED_INTERVIEW_TYPES.includes(item.interviewType)));

  const frontendTechnical = seeds.filter(
    (item) => item.roleKey === "frontend" && item.interviewType === "technical"
  );
  assert.deepEqual(
    frontendTechnical.map((item) => item.order),
    frontendTechnical.map((_, index) => index)
  );
});
