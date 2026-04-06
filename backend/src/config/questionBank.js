const QUESTION_BANK = {
  frontend: {
    label: "Frontend Engineer",
    defaultSkills: ["react", "javascript", "css", "performance", "accessibility"],
    questionLibrary: {
      behavioral: [
        "Tell me about a time you improved the UX of a feature under a tight deadline.",
        "Describe a disagreement with design or product and how you resolved it.",
        "Walk me through a time you debugged a difficult UI issue in production.",
        "Tell me about a project where you raised quality (testing, linting, review) without slowing delivery.",
      ],
      technical: [
        "How do you prevent unnecessary re-renders in a React app and how would you verify the improvement?",
        "Explain how you would design a reusable component library with consistent theming and accessibility.",
        "How would you diagnose and fix a slow page caused by heavy JavaScript and large bundles?",
        "Describe how you handle API errors, retries, and offline states in a real product UI.",
      ],
      "system-design": [
        "Design a real-time interview session UI that supports recording, autosave, and reconnect logic.",
        "How would you architect client-side state for a multi-step interview flow with resumable sessions?",
        "Design a dashboard that visualizes interview trends for a user without leaking private data.",
        "How would you implement role-based access control in a React app with protected routes?",
      ],
    },
  },
  backend: {
    label: "Backend Engineer",
    defaultSkills: ["node", "express", "mongodb", "security", "scalability"],
    questionLibrary: {
      behavioral: [
        "Tell me about a time you improved reliability or observability for a backend service.",
        "Describe a production incident you handled and what you changed afterwards.",
        "Walk me through a time you simplified a complex system without breaking compatibility.",
        "How do you communicate technical trade-offs to non-engineering stakeholders?",
      ],
      technical: [
        "How would you design authentication with JWT cookies, refresh tokens, and CSRF protections?",
        "Explain how you would structure an Express API for maintainability (routes, controllers, services).",
        "How do you model and index MongoDB collections for high-read endpoints with filters and sorting?",
        "How would you debug intermittent latency spikes in an API under load?",
      ],
      "system-design": [
        "Design an interview analytics service that supports aggregation reports and leaderboard ranking.",
        "How would you build a media upload pipeline (audio/video) with Cloudinary and safe validation?",
        "Design an email OTP verification system with rate limits and abuse prevention.",
        "How would you architect a resume analysis pipeline that scales with many uploads?",
      ],
    },
  },
  fullstack: {
    label: "Full Stack Engineer",
    defaultSkills: ["react", "node", "apis", "databases", "product thinking"],
    questionLibrary: {
      behavioral: [
        "Tell me about a feature you shipped end-to-end and what you optimized after launch.",
        "Describe how you collaborate across frontend, backend, and product to deliver outcomes.",
        "Walk me through a time you fixed a cross-stack bug (UI + API + DB).",
        "Tell me about a time you made a trade-off to keep the product simple.",
      ],
      technical: [
        "How would you design an API contract and error model that the frontend can handle reliably?",
        "Explain how you handle auth, protected routes, and session refresh across the stack.",
        "How would you implement search & filters with pagination so it stays fast at scale?",
        "Describe your approach to performance optimization across client, server, and database.",
      ],
      "system-design": [
        "Design the full architecture for an AI interview platform: sessions, results, history, and payments.",
        "How would you ensure data isolation for multi-tenant users and admin reporting safely?",
        "Design a leaderboard system that avoids abuse and supports time-based filters.",
        "How would you handle deployments and environment configuration for a MERN app?",
      ],
    },
  },
  marketing: {
    label: "Digital Marketer",
    defaultSkills: ["performance marketing", "seo", "content", "analytics", "funnels"],
    questionLibrary: {
      behavioral: [
        "Tell me about a campaign you ran end-to-end and how you evaluated its success.",
        "Describe a time your performance dropped on a key channel. What did you do next?",
        "Walk me through a situation where you disagreed with a stakeholder on messaging or targeting.",
        "Tell me about a time you used data to convince the team to change direction.",
      ],
      technical: [
        "How do you structure and measure a full-funnel campaign for a new product launch?",
        "Explain how you would set up tracking for a landing page that feeds a multi-step signup flow.",
        "How do you approach experimentation (A/B tests) and avoid false positives in results?",
        "Walk me through how you would diagnose a sudden drop in conversions from paid social.",
      ],
      "system-design": [
        "Design an analytics dashboard for marketing that surfaces the right KPIs for growth decisions.",
        "How would you design an attribution approach for a product that relies on multiple channels and touchpoints?",
        "Design a lead nurturing journey for users who sign up but do not complete key activation steps.",
        "How would you structure a content calendar and measurement plan for top-of-funnel education?",
      ],
    },
  },
  hr: {
    label: "HR / Talent Partner",
    defaultSkills: ["stakeholder management", "recruiting", "employee relations", "process design", "communication"],
    questionLibrary: {
      behavioral: [
        "Tell me about a time you handled a sensitive employee relations issue from start to resolution.",
        "Describe a situation where you needed to push back on a hiring manager to maintain quality or fairness.",
        "Walk me through a time you redesigned an HR process to make it more efficient or candidate-friendly.",
        "Tell me about a difficult feedback conversation you facilitated between two colleagues.",
      ],
      technical: [
        "How do you partner with hiring managers to define a clear role profile and interview plan?",
        "Explain how you would build a structured, fair interview loop for a new role type.",
        "How do you decide which HR metrics to track for health (e.g., retention, performance, engagement)?",
        "Walk me through your approach to creating and enforcing an interview rubric.",
      ],
      "system-design": [
        "Design an end-to-end hiring funnel for a fast-growing team that still protects candidate experience.",
        "How would you design an onboarding process that scales across multiple roles and locations?",
        "Design a performance and feedback rhythm that supports both high performers and people who are struggling.",
        "How would you structure an interview training program for new interviewers across the company?",
      ],
    },
  },
};

const SUPPORTED_INTERVIEW_TYPES = ["behavioral", "technical", "system-design"];

function normalizeRoleKey(role) {
  const value = String(role || "").trim().toLowerCase();
  if (!value) return "fullstack";
  if (value.includes("front")) return "frontend";
  if (value.includes("back")) return "backend";
  if (value.includes("full")) return "fullstack";
  if (value.includes("market")) return "marketing";
  if (value.includes("hr") || value.includes("human resources") || value.includes("talent")) return "hr";
  return "fullstack";
}

function normalizeInterviewType(interviewType) {
  const value = String(interviewType || "").trim().toLowerCase();

  if (SUPPORTED_INTERVIEW_TYPES.includes(value)) {
    return value;
  }

  if (value === "system design") {
    return "system-design";
  }

  return "technical";
}

function getStaticRoleConfig(role) {
  const key = normalizeRoleKey(role);
  return {
    key,
    label: QUESTION_BANK[key]?.label || "Full Stack Engineer",
    defaultSkills: QUESTION_BANK[key]?.defaultSkills || [],
    questionLibrary: QUESTION_BANK[key]?.questionLibrary || {},
  };
}

function listStaticRoles() {
  return Object.entries(QUESTION_BANK).map(([key, config]) => ({
    key,
    label: config.label,
    defaultSkills: config.defaultSkills,
    interviewTypes: Object.keys(config.questionLibrary),
  }));
}

function buildSeedQuestions() {
  return Object.entries(QUESTION_BANK).flatMap(([roleKey, config]) =>
    Object.entries(config.questionLibrary).flatMap(([interviewType, questions]) =>
      questions.map((question, index) => ({
        roleKey,
        roleLabel: config.label,
        interviewType,
        question,
        defaultSkills: config.defaultSkills,
        order: index,
        isActive: true,
        source: "seed",
      }))
    )
  );
}

module.exports = {
  QUESTION_BANK,
  SUPPORTED_INTERVIEW_TYPES,
  buildSeedQuestions,
  getStaticRoleConfig,
  listStaticRoles,
  normalizeInterviewType,
  normalizeRoleKey,
};
