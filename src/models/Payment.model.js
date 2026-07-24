const mongoose = require("mongoose");

const refundSchema = new mongoose.Schema(
  {
    refundId: String, // Razorpay ka refund ID
    amount: Number,
    reason: String,
    processedAt: Date,
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: "INR",
    },

    paymentMethod: {
      type: String,
      enum: ["card", "upi", "cod", "netbanking"],
      required: true,
    },

    gateway: {
      type: String,
      enum: ["razorpay", "cod"], // COD ke liye gateway nahi lagta
      default: "razorpay",
    },

    // ===== Razorpay specific fields =====
    razorpayOrderId: {
      type: String, // Razorpay order create karte waqt milta hai
    },
    razorpayPaymentId: {
      type: String, // payment success hone ke baad milta hai
    },
    razorpaySignature: {
      type: String, // verification ke liye
    },

    status: {
      type: String,
      enum: [
        "created",
        "authorized",
        "captured",
        "failed",
        "refunded",
        "partially_refunded",
      ],
      default: "created",
    },

    failureReason: {
      type: String, // Razorpay se aaya hua error message, agar fail hua
    },

    refunds: [refundSchema], // multiple partial refunds ho sakte hain
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);