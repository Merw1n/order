const express = require("express");
const router = express.Router();
const catchAsync = require("../../utils/catchAsync");
const stripe = require("../../controllers/stripeController");
const { isLoggedIn } = require("../../middleware");

router.post(
  "/checkout",
  isLoggedIn({ noSubNeeded: true }),
  catchAsync(stripe.createCheckout)
);
router.post(
  "/payment-successful",
  isLoggedIn({ noSubNeeded: true }),
  catchAsync(stripe.updateCompany)
);

module.exports = router;
