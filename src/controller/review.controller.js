const ApiResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const {
  getEligibilityService,
  createReviewService,
  getReviewsForProductService,
} = require("../services/review.service");

const getUserId = (req) => req.user?._id || req.user?.id;

const getReviews = asyncHandler(async (req, res) => {
  const result = await getReviewsForProductService(req.params.productId, req.query);
  return res.status(200).json(new ApiResponse(200, result));
});

const getEligibility = asyncHandler(async (req, res) => {
  const result = await getEligibilityService(getUserId(req), req.params.productId);
  return res.status(200).json(new ApiResponse(200, result));
});

const createReview = asyncHandler(async (req, res) => {
  const { name, rating, comment } = req.body;
  const review = await createReviewService(getUserId(req), req.params.productId, { name, rating, comment });
  return res.status(201).json(new ApiResponse(201, review, "Review submitted"));
});

module.exports = { getReviews, getEligibility, createReview };