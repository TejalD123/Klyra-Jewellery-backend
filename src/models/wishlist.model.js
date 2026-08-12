const mongoose = require("mongoose");

// Separate collection (not a field on User) so we don't have to touch
// user.model.js at all. One document per user.
const wishlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
        _id: false,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Wishlist", wishlistSchema);