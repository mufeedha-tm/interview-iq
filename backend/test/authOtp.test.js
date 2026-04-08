const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const path = require("path");

const controllerPath = path.resolve(__dirname, "../src/controllers/authController.js");
const userModelPath = path.resolve(__dirname, "../src/models/userModel.js");
const emailUtilsPath = path.resolve(__dirname, "../src/utils/email.js");

const createResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
  cookie() {
    return this;
  },
  clearCookie() {
    return this;
  },
});

const createFakeUserDoc = (initial = {}) => ({
  _id: initial._id || "user-1",
  email: initial.email || "",
  role: initial.role || "user",
  isVerified: Boolean(initial.isVerified),
  firstName: initial.firstName || "",
  lastName: initial.lastName || "",
  targetRole: initial.targetRole || "",
  otpCode: initial.otpCode,
  otpExpires: initial.otpExpires,
  otpPurpose: initial.otpPurpose,
  otpIssuedAt: initial.otpIssuedAt,
  saveCalls: 0,
  async save() {
    this.saveCalls += 1;
    return this;
  },
  createOtp(purpose, ttlMs) {
    const otp = "123456";
    this.otpCode = crypto.createHash("sha256").update(otp).digest("hex");
    this.otpExpires = new Date(Date.now() + ttlMs);
    this.otpPurpose = purpose;
    this.otpIssuedAt = new Date();
    return otp;
  },
  ...initial,
});

const mockModule = (modulePath, exports) => {
  const original = require.cache[modulePath];
  require.cache[modulePath] = {
    id: modulePath,
    filename: modulePath,
    loaded: true,
    exports,
  };

  return () => {
    if (original) {
      require.cache[modulePath] = original;
      return;
    }

    delete require.cache[modulePath];
  };
};

const loadAuthController = ({ currentUser = null, sendEmailImpl }) => {
  const state = {
    currentUser,
  };

  class FakeUser {
    constructor(data = {}) {
      Object.assign(this, createFakeUserDoc(data));
      state.currentUser = this;
    }

    static findOne(query) {
      const matchedUser =
        state.currentUser && state.currentUser.email === query.email ? state.currentUser : null;

      return {
        select: async () => matchedUser,
      };
    }
  }

  const restoreUserModel = mockModule(userModelPath, FakeUser);
  const restoreEmailUtils = mockModule(emailUtilsPath, {
    assertEmailConfig: () => null,
    sendEmail: sendEmailImpl,
    verifyEmailTransport: async () => ({
      ready: true,
      transport: "mock-transport",
      checkedAt: Date.now(),
    }),
  });

  delete require.cache[controllerPath];
  const controller = require(controllerPath);

  return {
    controller,
    state,
    cleanup() {
      delete require.cache[controllerPath];
      restoreEmailUtils();
      restoreUserModel();
    },
  };
};

test("signup clears the stored OTP when delivery fails", async (t) => {
  const sentPayloads = [];
  const { controller, state, cleanup } = loadAuthController({
    sendEmailImpl: async (payload) => {
      sentPayloads.push(payload);
      const error = new Error("SMTP connection failed");
      error.transport = "mock-transport";
      throw error;
    },
  });

  t.after(cleanup);

  const res = createResponse();
  await controller.signup(
    {
      body: {
        firstName: "Ada",
        lastName: "Lovelace",
        targetRole: "Frontend Developer",
        email: "ada@example.com",
        password: "secret123",
      },
    },
    res,
    (error) => {
      if (error) {
        throw error;
      }
    }
  );

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.emailSent, false);
  assert.equal(res.body.otpFlowAvailable, true);
  assert.equal(sentPayloads.length, 1);
  assert.match(sentPayloads[0].html, /123456/);
  assert.doesNotMatch(sentPayloads[0].html, /\{\{OTP\}\}/);
  assert.equal(state.currentUser.otpCode, undefined);
  assert.equal(state.currentUser.otpExpires, undefined);
  assert.equal(state.currentUser.otpPurpose, undefined);
  assert.ok(state.currentUser.otpIssuedAt instanceof Date);
});

test("signup success returns resend cooldown metadata", async (t) => {
  const { controller, cleanup } = loadAuthController({
    sendEmailImpl: async () => ({
      deliveredVia: "email",
      transport: "mock-transport",
    }),
  });

  t.after(cleanup);

  const res = createResponse();
  await controller.signup(
    {
      body: {
        firstName: "Katherine",
        lastName: "Johnson",
        targetRole: "Frontend Developer",
        email: "katherine@example.com",
        password: "secret123",
      },
    },
    res,
    (error) => {
      if (error) {
        throw error;
      }
    }
  );

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.emailSent, true);
  assert.equal(res.body.retryAfter, 60_000);
});

test("resend OTP succeeds after a failed signup once cooldown has expired", async (t) => {
  const sentPayloads = [];
  let sendAttempt = 0;
  const { controller, state, cleanup } = loadAuthController({
    sendEmailImpl: async (payload) => {
      sentPayloads.push(payload);
      sendAttempt += 1;

      if (sendAttempt === 1) {
        const error = new Error("SMTP connection failed");
        error.transport = "mock-transport";
        throw error;
      }

      return {
        deliveredVia: "email",
        transport: "mock-transport",
      };
    },
  });

  t.after(cleanup);

  const signupRes = createResponse();
  await controller.signup(
    {
      body: {
        firstName: "Grace",
        lastName: "Hopper",
        targetRole: "Backend Developer",
        email: "grace@example.com",
        password: "secret123",
      },
    },
    signupRes,
    (error) => {
      if (error) {
        throw error;
      }
    }
  );

  assert.equal(signupRes.statusCode, 201);
  assert.equal(signupRes.body.emailSent, false);

  state.currentUser.otpIssuedAt = new Date(Date.now() - 61_000);

  const resendRes = createResponse();
  await controller.resendOtp(
    {
      body: {
        email: "grace@example.com",
      },
    },
    resendRes,
    (error) => {
      if (error) {
        throw error;
      }
    }
  );

  assert.equal(resendRes.statusCode, 200);
  assert.equal(resendRes.body.emailSent, true);
  assert.equal(sentPayloads.length, 2);
  assert.match(sentPayloads[1].text, /123456/);
  assert.equal(state.currentUser.otpPurpose, "verify_email");
  assert.ok(state.currentUser.otpExpires > Date.now());
});

test("resend OTP issues a fresh verification code after cooldown even if the old code is still valid", async (t) => {
  const sentPayloads = [];
  const existingUser = createFakeUserDoc({
    email: "linus@example.com",
    isVerified: false,
    otpCode: "existing-hash",
    otpPurpose: "verify_email",
    otpExpires: new Date(Date.now() + 4 * 60 * 1000),
    otpIssuedAt: new Date(Date.now() - 61_000),
  });

  const { controller, state, cleanup } = loadAuthController({
    currentUser: existingUser,
    sendEmailImpl: async (payload) => {
      sentPayloads.push(payload);
      return {
        deliveredVia: "email",
        transport: "mock-transport",
      };
    },
  });

  t.after(cleanup);

  const previousOtpCode = state.currentUser.otpCode;

  const res = createResponse();
  await controller.resendOtp(
    {
      body: {
        email: "linus@example.com",
      },
    },
    res,
    (error) => {
      if (error) {
        throw error;
      }
    }
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.emailSent, true);
  assert.equal(res.body.retryAfter, 60_000);
  assert.equal(sentPayloads.length, 1);
  assert.match(sentPayloads[0].html, /123456/);
  assert.notEqual(state.currentUser.otpCode, previousOtpCode);
  assert.equal(state.currentUser.otpPurpose, "verify_email");
});
