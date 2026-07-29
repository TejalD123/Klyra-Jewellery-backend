const Wishlist = require("./wishlist.model");

/**
 * Get (or lazily create) a user's wishlist, with products populated.
 */
const getWishlist = async (userId) => {
  let wishlist = await Wishlist.findOne({ user: userId }).populate({
    path: "items.product",
    select: "name price images slug stock", // trim to the fields your Product model actually has
  });

  if (!wishlist) {
    wishlist = await Wishlist.create({ user: userId, items: [] });
  }

  return wishlist;
};

/**
 * Add a product to the wishlist. No-op (idempotent) if it's already there.
 */
const addToWishlist = async (userId, productId) => {
  let wishlist = await Wishlist.findOne({ user: userId });

  if (!wishlist) {
    wishlist = await Wishlist.create({ user: userId, items: [] });
  }

  if (wishlist.hasProduct(productId)) {
    return wishlist.populate({ path: "items.product", select: "name price images slug stock" });
  }

  wishlist.items.push({ product: productId });
  await wishlist.save();

  return wishlist.populate({ path: "items.product", select: "name price images slug stock" });
};

/**
 * Remove a single product from the wishlist.
 */
const removeFromWishlist = async (userId, productId) => {
  const wishlist = await Wishlist.findOneAndUpdate(
    { user: userId },
    { $pull: { items: { product: productId } } },
    { new: true }
  ).populate({ path: "items.product", select: "name price images slug stock" });

  return wishlist;
};

/**
 * Toggle a product in/out of the wishlist — handy for a single heart button.
 * Returns the updated wishlist plus whether the product ended up added or removed.
 */
const toggleWishlist = async (userId, productId) => {
  let wishlist = await Wishlist.findOne({ user: userId });

  if (!wishlist) {
    wishlist = await Wishlist.create({ user: userId, items: [] });
  }

  const alreadyExists = wishlist.hasProduct(productId);

  if (alreadyExists) {
    wishlist.items = wishlist.items.filter(
      (item) => item.product.toString() !== productId.toString()
    );
  } else {
    wishlist.items.push({ product: productId });
  }

  await wishlist.save();
  await wishlist.populate({ path: "items.product", select: "name price images slug stock" });

  return { wishlist, added: !alreadyExists };
};

/**
 * Clear the entire wishlist.
 */
const clearWishlist = async (userId) => {
  const wishlist = await Wishlist.findOneAndUpdate(
    { user: userId },
    { $set: { items: [] } },
    { new: true, upsert: true }
  );

  return wishlist;
};

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  toggleWishlist,
  clearWishlist,
};