const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      match: [/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian phone number"],
    },
    addressLine1: {
      type: String,
      required: [true, "Address line 1 is required"],
      trim: true,
      maxlength: 200,
    },
    addressLine2: {
      type: String,
      trim: true,
      default: "",
      maxlength: 200,
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
      maxlength: 100,
    },
    state: {
      type: String,
      required: [true, "State is required"],
      trim: true,
      maxlength: 100,
    },
    pincode: {
      type: String,
      required: [true, "Pincode is required"],
      trim: true,
      match: [/^[1-9][0-9]{5}$/, "Enter a valid 6-digit Indian pincode"],
    },
    country: {
      type: String,
      trim: true,
      default: "India",
    },
    addressType: {
      type: String,
      enum: ["Home", "Office", "Other"],
      default: "Home",
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Fast lookups for "get my addresses" and default-address queries
addressSchema.index({ user: 1 });
addressSchema.index({ user: 1, isDefault: 1 });

// Ensure only ONE default address per user.
// Jevha ha address isDefault=true set hoto, tevha same user chya
// baki sagळ्या addresses cha isDefault false kela jato.
addressSchema.pre("save", async function (next) {
  if (this.isModified("isDefault") && this.isDefault === true) {
    await this.constructor.updateMany(
      { user: this.user, _id: { $ne: this._id } },
      { $set: { isDefault: false } }
    );
  }
  next();
});

module.exports = mongoose.model("Address", addressSchema);