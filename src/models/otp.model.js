const mongoose = require("mongoose");

/**
 * Generic OTP model. `identifier` holds either the email address or the
 * phone number the OTP was sent to, and `channel` tells us which one it is.
 * `purpose` tells us whether this OTP was issued for registration or login.
 */
const otpSchema = new mongoose.Schema(
  {
    identifier: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    channel: {
      type: String,
      enum: ["email", "phone"],
      required: true,
    },
    purpose: {
      type: String,
      enum: ["registration", "login"],
      required: true,
    },
    otpCode: {
      type: String, // stored as a bcrypt hash, never plain text
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Speeds up the lookup we do in otp.service.js
otpSchema.index({ identifier: 1, purpose: 1 });

const Otp = mongoose.model("Otp", otpSchema);

module.exports = Otp;