const mongoose = require("mongoose");
const { Schema } = mongoose;

const wishlistItemSchema = new Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const wishlistSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one wishlist document per user
    },
    items: {
      type: [wishlistItemSchema],
      default: [],
    },
  },
  { timestamps: true }
);

// prevent duplicate products inside the same wishlist
wishlistSchema.index({ user: 1, "items.product": 1 }, { unique: false });

wishlistSchema.methods.hasProduct = function (productId) {
  return this.items.some((item) => item.product.toString() === productId.toString());
};

module.exports = mongoose.model("Wishlist", wishlistSchema);