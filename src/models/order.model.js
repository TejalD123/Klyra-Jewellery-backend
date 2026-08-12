const mongoose = require("mongoose");
const Counter = require("./counter.model");

const ITEM_STATUSES = [
  "active",
  "cancelled",
  "return_requested",
  "return_approved",
  "returned",
  "refunded",
];

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    // reference only, kept for admin tracking/analytics — NOT required,
    // so the order survives even if the product is later deleted
  },
  name: { type: String, required: true }, // snapshot, product delete-proof
  image: { type: String, default: "" }, // snapshot
  metalType: { type: String, default: "" },
  size: { type: String, default: "" },
  quantity: { type: Number, required: true, min: 1 },
  priceAtOrderTime: { type: Number, required: true, min: 0 }, // frozen price
  itemStatus: {
    type: String,
    enum: ITEM_STATUSES,
    default: "active", // each item tracked independently
  },
});

const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String, default: "" },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
  },
  { _id: false } // full copy, not a reference — address can change/be deleted later
);

const pricingSchema = new mongoose.Schema(
  {
    subtotal: { type: Number, required: true, min: 0 },
    couponDiscount: { type: Number, default: 0, min: 0 },
    shippingCharge: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true }, // e.g. "placed", "shipped"
    timestamp: { type: Date, default: Date.now },
    note: { type: String, default: "" }, // e.g. "Cancelled by user"
  },
  { _id: false }
);

const cancellationSchema = new mongoose.Schema(
  {
    isCancelled: { type: Boolean, default: false },
    reason: { type: String, default: "" },
    cancelledAt: { type: Date, default: null },
    cancelledBy: {
      type: String,
      enum: ["user", "admin", null],
      default: null,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      // e.g. "ORD-2026-00123" — auto-generated, see pre-save hook below
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: {
      type: [orderItemSchema],
      validate: {
        validator: (arr) => arr.length > 0,
        message: "Order must have at least one item",
      },
    },
    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },
    pricing: {
      type: pricingSchema,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["card", "upi", "cod"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded", "partially_refunded"],
      default: "pending",
    },
    orderStatus: {
      type: String,
      enum: [
        "placed",
        "confirmed",
        "processing",
        "packed",
        "shipped",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
      default: "placed",
    },
    // Dummy delivery-partner tracking (demo only — no real courier integration).
    // deliveryAgency/deliveryCharge are snapshots taken at assignment time —
    // they stay accurate even if the agency's rates change later.
    deliveryAgencyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryAgency",
      default: null,
    },
    deliveryAgency: {
      type: String,
      default: null,
    },
    deliveryCharge: {
      type: Number,
      default: null,
    },
    // Timestamp the CURRENT delivery stage ("shipped" or "out_for_delivery")
    // started — used to auto-advance the status after a short demo timer,
    // checked lazily whenever the order is read (see order.service.js).
    stageStartedAt: {
      type: Date,
      default: null,
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
    cancellation: {
      type: cancellationSchema,
      default: () => ({}), // only meaningfully filled in when order is cancelled
    },
  },
  { timestamps: true }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ paymentStatus: 1 });

// Auto-generate a gap-free, human-friendly order number: ORD-<year>-00001
orderSchema.pre("save", async function () {
  if (this.isNew && !this.orderNumber) {
    const year = new Date().getFullYear();
    const counterId = `order-${year}`;

    const counter = await Counter.findByIdAndUpdate(
      counterId,
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const padded = String(counter.seq).padStart(5, "0");
    this.orderNumber = `ORD-${year}-${padded}`;
  }

  // Track every orderStatus change for a visible timeline on the order detail page
  if (this.isNew || this.isModified("orderStatus")) {
    this.statusHistory.push({ status: this.orderStatus, timestamp: new Date() });
  }
});

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;