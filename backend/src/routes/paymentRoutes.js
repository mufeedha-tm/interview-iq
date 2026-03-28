const express = require("express");
const {
  getPaymentPlans,
  createCheckoutSession,
  confirmCheckoutSession,
  handleStripeWebhook,
} = require("../controllers/paymentController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/webhook", handleStripeWebhook);
router.get("/plans", getPaymentPlans);
router.post("/checkout", protect, createCheckoutSession);
router.post("/confirm", protect, confirmCheckoutSession);

module.exports = router;
