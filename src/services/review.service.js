const Review = require("../models/review.model");
const Product = require("../models/product.model");
const Order = require("../models/order.model");
const ApiError = require("../utils/apiError");

// ASSUMPTION — I don't have order.model.js, so this guesses the common
// shape: Order.items is an array of { product: ObjectId, ... }, and a
// completed/paid order is what should count as "purchased". Confirm/
// adjust the field names below (items.product, orderStatus, paymentStatus)
// once you share order.model.js — this is the one part of the feature
// that depends on your exact schema.
const hasPurchasedProduct = async (userId, productId) => {
  const order = await Order.findOne({
    user: userId,
    "items.product": productId,
    // adjust this condition to match however you mark a completed order —
    // e.g. orderStatus: "delivered", or paymentStatus: "paid"
    orderStatus: { $in: ["delivered", "completed"] },
  }).select("_id");

  return order; // returns the order doc (used as proof-of-purchase link) or null
};

const getEligibilityService = async (userId, productId) => {
  const [order, existingReview] = await Promise.all([
    hasPurchasedProduct(userId, productId),
    Review.findOne({ product: productId, user: userId }).select("_id"),
  ]);

  return {
    canReview: !!order && !existingReview,
    hasPurchased: !!order,
    alreadyReviewed: !!existingReview,
  };
};

const recalculateProductRatings = async (productId) => {
  const stats = await Review.aggregate([
    { $match: { product: productId } },
    { $group: { _id: "$product", avgRating: { $avg: "$rating" }, totalReviews: { $sum: 1 } } },
  ]);

  const { avgRating = 0, totalReviews = 0 } = stats[0] || {};

  await Product.findByIdAndUpdate(productId, {
    "ratings.avgRating": Math.round(avgRating * 10) / 10,
    "ratings.totalReviews": totalReviews,
  });
};

const createReviewService = async (userId, productId, { name, rating, comment }) => {
  const product = await Product.findById(productId);
  if (!product) throw ApiError.notFound("Product not found");

  const order = await hasPurchasedProduct(userId, productId);
  if (!order) {
    throw ApiError.forbidden("You can only review products you've purchased");
  }

  const existing = await Review.findOne({ product: productId, user: userId });
  if (existing) throw ApiError.conflict("You've already reviewed this product");

  const review = await Review.create({
    product: productId,
    user: userId,
    order: order._id,
    name,
    rating,
    comment,
  });

  await recalculateProductRatings(productId);

  return review;
};

const getReviewsForProductService = async (productId, { page = 1, limit = 10 } = {}) => {
  const pageNum = Math.max(parseInt(page, 10), 1);
  const limitNum = Math.max(parseInt(limit, 10), 1);
  const skip = (pageNum - 1) * limitNum;

  const [reviews, total] = await Promise.all([
    // Only name/rating/comment/createdAt go out — never the user id or
    // account identity, per "username nahi, fakt name" requirement.
    Review.find({ product: productId })
      .select("name rating comment createdAt")
      .sort("-createdAt")
      .skip(skip)
      .limit(limitNum),
    Review.countDocuments({ product: productId }),
  ]);

  return {
    reviews,
    pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
  };
};

module.exports = {
  getEligibilityService,
  createReviewService,
  getReviewsForProductService,
};