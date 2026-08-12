const Wishlist = require("../models/wishlist.model");
const Product = require("../models/product.model");
const ApiError = require("../utils/apiError");

// Every function gets-or-creates the user's wishlist doc first — a user's
// first wishlist action (add/toggle) shouldn't need a separate "create my
// wishlist" step.
const getOrCreateWishlist = async (userId) => {
  let wishlist = await Wishlist.findOne({ user: userId });
  if (!wishlist) {
    wishlist = await Wishlist.create({ user: userId, items: [] });
  }
  return wishlist;
};

const getWishlistService = async (userId) => {
  const wishlist = await Wishlist.findOne({ user: userId }).populate({
    path: "items.product",
    select: "name slug images finalPrice basePrice discount stock ratings isBestseller isFeatured",
  });

  if (!wishlist) return { items: [] };

  // Drop any items whose product was deleted since being wishlisted
  // (populate leaves them as null) instead of crashing the frontend on them.
  return { items: wishlist.items.filter((item) => item.product) };
};

const addToWishlistService = async (userId, productId) => {
  const product = await Product.findById(productId);
  if (!product) throw ApiError.notFound("Product not found");

  const wishlist = await getOrCreateWishlist(userId);
  const alreadyIn = wishlist.items.some((item) => item.product.toString() === productId);
  if (!alreadyIn) {
    wishlist.items.push({ product: productId });
    await wishlist.save();
  }
  return wishlist;
};

const removeFromWishlistService = async (userId, productId) => {
  const wishlist = await getOrCreateWishlist(userId);
  wishlist.items = wishlist.items.filter((item) => item.product.toString() !== productId);
  await wishlist.save();
  return wishlist;
};

// Returns { inWishlist: boolean } so the frontend knows which state the
// heart icon should end up in, without needing a second GET.
const toggleWishlistService = async (userId, productId) => {
  const product = await Product.findById(productId);
  if (!product) throw ApiError.notFound("Product not found");

  const wishlist = await getOrCreateWishlist(userId);
  const existingIndex = wishlist.items.findIndex((item) => item.product.toString() === productId);

  let inWishlist;
  if (existingIndex >= 0) {
    wishlist.items.splice(existingIndex, 1);
    inWishlist = false;
  } else {
    wishlist.items.push({ product: productId });
    inWishlist = true;
  }
  await wishlist.save();
  return { inWishlist };
};

const clearWishlistService = async (userId) => {
  const wishlist = await getOrCreateWishlist(userId);
  wishlist.items = [];
  await wishlist.save();
  return wishlist;
};

module.exports = {
  getWishlistService,
  addToWishlistService,
  removeFromWishlistService,
  toggleWishlistService,
  clearWishlistService,
};