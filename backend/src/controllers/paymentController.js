const Stripe = require("stripe");
const User = require("../models/userModel");
const { clientUrl, stripeSecretKey, stripeWebhookSecret } = require("../config/env");

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

const PAYMENT_PLANS = [
  {
    id: "premium-pack",
    name: "Premium Interview Pack",
    description: "Unlock advanced interview loops, AI follow-ups, and deeper evaluation reports.",
    price: 49,
    currency: "USD",
    premiumInterviews: 10,
    durationDays: 30,
    features: [
      "10 premium interview credits",
      "Advanced AI follow-up questions",
      "Priority PDF report exports",
      "Detailed benchmark analytics",
    ],
  },
];

const serializeUser = (user) => ({
  id: user._id,
  email: user.email,
  role: user.role,
  isVerified: user.isVerified,
  firstName: user.firstName,
  lastName: user.lastName,
  headline: user.headline,
  targetRole: user.targetRole,
  experienceLevel: user.experienceLevel,
  bio: user.bio,
  avatarUrl: user.avatarUrl,
  resumeUrl: user.resumeUrl,
  subscriptionTier: user.subscriptionTier,
  premiumInterviewsRemaining: user.premiumInterviewsRemaining,
  premiumExpiresAt: user.premiumExpiresAt,
});

const getPlanById = (planId) => PAYMENT_PLANS.find((item) => item.id === planId);

const ensureCheckoutOwnership = (session, userId) => {
  const metadataUserId = session?.metadata?.userId || session?.metadata?.user_id;

  if (!metadataUserId) {
    const error = new Error("Checkout session metadata is missing user ownership.");
    error.statusCode = 400;
    throw error;
  }

  if (String(metadataUserId) !== String(userId)) {
    const error = new Error("This checkout session belongs to a different account.");
    error.statusCode = 403;
    throw error;
  }
};

const grantPremiumFromSession = async (session) => {
  const planId = session?.metadata?.planId || session?.metadata?.plan_id;
  const metadataUserId = session?.metadata?.userId || session?.metadata?.user_id;

  if (!planId || !metadataUserId) {
    const error = new Error("Checkout session metadata is incomplete.");
    error.statusCode = 400;
    throw error;
  }

  const plan = getPlanById(planId);

  if (!plan) {
    const error = new Error("Payment plan not found");
    error.statusCode = 404;
    throw error;
  }

  const user = await User.findById(metadataUserId).select("+processedStripeSessionIds");

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const processedSessionIds = user.processedStripeSessionIds || [];
  if (processedSessionIds.includes(session.id)) {
    return { user, plan, alreadyProcessed: true };
  }

  const currentExpiry =
    user.premiumExpiresAt && new Date(user.premiumExpiresAt) > new Date()
      ? new Date(user.premiumExpiresAt)
      : new Date();

  currentExpiry.setDate(currentExpiry.getDate() + plan.durationDays);

  user.subscriptionTier = "premium";
  user.premiumInterviewsRemaining = (user.premiumInterviewsRemaining || 0) + plan.premiumInterviews;
  user.premiumExpiresAt = currentExpiry;
  user.processedStripeSessionIds = [...processedSessionIds, session.id];
  await user.save();

  return { user, plan, alreadyProcessed: false };
};

const getPaymentPlans = async (_req, res, next) => {
  try {
    res.status(200).json({ plans: PAYMENT_PLANS });
  } catch (error) {
    next(error);
  }
};

const createCheckoutSession = async (req, res, next) => {
  try {
    const { planId = "premium-pack" } = req.body;
    const plan = PAYMENT_PLANS.find((item) => item.id === planId);

    if (!plan) {
      return res.status(404).json({ message: "Payment plan not found" });
    }

    if (!stripe) {
      if (process.env.NODE_ENV === "production") {
        return res.status(500).json({
          message: "Stripe is not configured. Add STRIPE_SECRET_KEY for real premium checkout.",
        });
      }

      const mockSessionId = `mock__${plan.id}__${Date.now()}`;

      return res.status(200).json({
        mockCheckout: true,
        checkoutSessionId: mockSessionId,
        checkoutUrl: `${clientUrl}/start-interview?checkout=success&session_id=${mockSessionId}`,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: req.user.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: plan.currency.toLowerCase(),
            unit_amount: plan.price * 100,
            product_data: {
              name: plan.name,
              description: plan.description,
            },
          },
        },
      ],
      metadata: {
        planId: plan.id,
        userId: String(req.user._id),
      },
      success_url: `${clientUrl}/start-interview?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/start-interview?checkout=cancelled`,
    });

    res.status(200).json({
      checkoutSessionId: session.id,
      checkoutUrl: session.url,
    });
  } catch (error) {
    next(error);
  }
};

const confirmCheckoutSession = async (req, res, next) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ message: "Checkout session ID is required" });
    }

    let session;

    if (sessionId.startsWith("mock__")) {
      const parts = sessionId.split("__");
      const planId = parts[1];
      session = {
        id: sessionId,
        payment_status: "paid",
        payment_intent: sessionId,
        metadata: {
          planId,
          userId: String(req.user._id),
        },
      };
    } else {
      if (!stripe) {
        return res.status(500).json({
          message: "Stripe is not configured. Add STRIPE_SECRET_KEY to enable premium checkout.",
        });
      }

      session = await stripe.checkout.sessions.retrieve(sessionId);
    }

    if (!session || session.payment_status !== "paid") {
      return res.status(400).json({ message: "Payment not completed for this session" });
    }

    ensureCheckoutOwnership(session, req.user._id);
    const { user, plan, alreadyProcessed } = await grantPremiumFromSession(session);

    res.status(200).json({
      message: alreadyProcessed
        ? "Premium payment already confirmed for this checkout session"
        : "Premium interview payment completed",
      payment: {
        transactionId: session.payment_intent || session.id,
        status: session.payment_status,
        amount: plan.price,
        currency: plan.currency,
        planId: plan.id,
      },
      user: serializeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

const handleStripeWebhook = async (req, res, next) => {
  try {
    if (!stripe || !stripeWebhookSecret) {
      return res.status(400).json({
        message: "Stripe webhook is not configured. Add STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET.",
      });
    }

    const signature = req.headers["stripe-signature"];
    if (!signature) {
      return res.status(400).json({ message: "Missing Stripe signature header." });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, signature, stripeWebhookSecret);
    } catch (signatureError) {
      return res.status(400).json({
        message: `Webhook signature verification failed: ${signatureError.message}`,
      });
    }

    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object;

      if (session.mode === "payment" && session.payment_status === "paid") {
        await grantPremiumFromSession(session);
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPaymentPlans,
  createCheckoutSession,
  confirmCheckoutSession,
  handleStripeWebhook,
};
