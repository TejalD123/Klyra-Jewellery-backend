const ApiResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const {
  getWishlistService,
  addToWishlistService,
  removeFromWishlistService,
  toggleWishlistService,
  clearWishlistService,
} = require("../services/wishlist.service");

// same _id/id fallback pattern used in category.controller.js / product.controller.js
const getUserId = (req) => req.user?._id || req.user?.id;

const getWishlist = asyncHandler(async (req, res) => {
  const wishlist = await getWishlistService(getUserId(req));
  return res.status(200).json(new ApiResponse(200, wishlist));
});

const addToWishlist = asyncHandler(async (req, res) => {
  const wishlist = await addToWishlistService(getUserId(req), req.params.productId);
  return res.status(200).json(new ApiResponse(200, wishlist, "Added to wishlist"));
});

const removeFromWishlist = asyncHandler(async (req, res) => {
  const wishlist = await removeFromWishlistService(getUserId(req), req.params.productId);
  return res.status(200).json(new ApiResponse(200, wishlist, "Removed from wishlist"));
});

const toggleWishlist = asyncHandler(async (req, res) => {
  const result = await toggleWishlistService(getUserId(req), req.params.productId);
  return res
    .status(200)
    .json(new ApiResponse(200, result, result.inWishlist ? "Added to wishlist" : "Removed from wishlist"));
});

const clearWishlist = asyncHandler(async (req, res) => {
  await clearWishlistService(getUserId(req));
  return res.status(200).json(new ApiResponse(200, null, "Wishlist cleared"));
});

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  toggleWishlist,
  clearWishlist,
};