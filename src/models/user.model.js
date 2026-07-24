const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    // Not collected at registration anymore — user fills this in later
    // (e.g. via a profile-update step), so it's optional here.
    fullName: {
      type: String,
      trim: true,
      default: "",
    },
    username: {
      type: String,
      required: [true, "Username is required"],
      trim: true,
      lowercase: true,
      unique: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username must be at most 30 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      unique: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      unique: true,
    },
    // A user only needs ONE of these two to be true (whichever channel
    // they chose to verify with during registration) to be able to log in.
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    refreshToken: {
      type: String,
      select: false,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
  }
);

/**
 * Strip sensitive/internal fields before sending the user object
 * back to the client in API responses.
 */
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.refreshToken;
  delete obj.__v;
  return obj;
};

const User = mongoose.model("User", userSchema);

module.exports = User;