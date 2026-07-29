const mongoose = require("mongoose");
const wishlistService = require("./wishlist.service");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * GET /api/wishlist
 */
const getWishlist = async (req, res) => {
  try {
    const wishlist = await wishlistService.getWishlist(req.user._id);
    return res.status(200).json({ success: true, data: wishlist });
  } catch (err) {
    console.error("getWishlist error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch wishlist" });
  }
};

/**
 * POST /api/wishlist/:productId
 */
const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!isValidObjectId(productId)) {
      return res.status(400).json({ success: false, message: "Invalid product id" });
    }

    const wishlist = await wishlistService.addToWishlist(req.user._id, productId);
    return res.status(200).json({ success: true, data: wishlist });
  } catch (err) {
    console.error("addToWishlist error:", err);
    return res.status(500).json({ success: false, message: "Failed to add product to wishlist" });
  }
};

/**
 * DELETE /api/wishlist/:productId
 */
const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!isValidObjectId(productId)) {
      return res.status(400).json({ success: false, message: "Invalid product id" });
    }

    const wishlist = await wishlistService.removeFromWishlist(req.user._id, productId);
    return res.status(200).json({ success: true, data: wishlist });
  } catch (err) {
    console.error("removeFromWishlist error:", err);
    return res.status(500).json({ success: false, message: "Failed to remove product from wishlist" });
  }
};

/**
 * POST /api/wishlist/toggle/:productId
 * Used by the heart button — adds if absent, removes if present.
 */
const toggleWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!isValidObjectId(productId)) {
      return res.status(400).json({ success: false, message: "Invalid product id" });
    }

    const { wishlist, added } = await wishlistService.toggleWishlist(req.user._id, productId);
    return res.status(200).json({ success: true, added, data: wishlist });
  } catch (err) {
    console.error("toggleWishlist error:", err);
    return res.status(500).json({ success: false, message: "Failed to update wishlist" });
  }
};

/**
 * DELETE /api/wishlist
 */
const clearWishlist = async (req, res) => {
  try {
    const wishlist = await wishlistService.clearWishlist(req.user._id);
    return res.status(200).json({ success: true, data: wishlist });
  } catch (err) {
    console.error("clearWishlist error:", err);
    return res.status(500).json({ success: false, message: "Failed to clear wishlist" });
  }
};

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  toggleWishlist,
  clearWishlist,
};