const express = require("express");
const { getReviews, getEligibility, createReview } = require("../controller/review.controller");
const { protect } = require("../middleware/auth.middleware");
const { validateSchema } = require("../middleware/validation.middleware");
const { createReviewSchema } = require("../validations/review.validation");

// mergeParams so :productId from the parent router (products) is visible here
const router = express.Router({ mergeParams: true });

// Public — anyone browsing the product page can read reviews
router.get("/", getReviews);

// Logged-in only
router.get("/eligibility", protect, getEligibility);
router.post("/", protect, validateSchema(createReviewSchema), createReview);

module.exports = router;