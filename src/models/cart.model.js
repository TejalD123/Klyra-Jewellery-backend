const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, "Quantity must be at least 1"],
      default: 1,
    },
    priceAtAddTime: {
      type: Number, // product.finalPrice snapshot when added to cart
      required: true,
      min: 0,
    },
    size: {
      type: String, // for rings/bracelets etc, optional
      default: "",
    },
  },
  { timestamps: true } // per-item addedAt/updatedAt, handy for "recently added"
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one cart document per user
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
  },
  { timestamps: true } // includes updatedAt as required by spec
);

cartSchema.index({ user: 1 });

// Virtual: total items count (sum of quantities)
cartSchema.virtual("totalItems").get(function () {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

// Virtual: cart total based on price snapshot at add-time
cartSchema.virtual("totalAmount").get(function () {
  return this.items.reduce(
    (sum, item) => sum + item.priceAtAddTime * item.quantity,
    0
  );
});

cartSchema.set("toJSON", { virtuals: true });
cartSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Cart", cartSchema);