const mongoose = require("mongoose");

// Kept generic (relatedModel/relatedId) instead of separate ref fields per
// type, so adding a new notification type later never needs a schema change.
const NOTIFICATION_TYPES = [
  "new_order",
  "low_stock",
  "return_requested",
  "payment_failed",
  "new_query",
  "general",
];

const notificationSchema = new mongoose.Schema(
  {
    // Scoped to "admin" for now since only the admin panel reads these.
    // If per-user notifications are ever needed, add a `recipient` ObjectId
    // ref alongside this instead of replacing it.
    recipientRole: {
      type: String,
      enum: ["admin"],
      default: "admin",
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: [true, "Notification type is required"],
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: 150,
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
      maxlength: 500,
    },
    relatedModel: {
      type: String,
      enum: ["Order", "Product", "Query", null],
      default: null,
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "relatedModel",
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ recipientRole: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);