const mongoose = require("mongoose");

// One rate per Indian state — falls back to defaultCharge if the order's
// shipping state isn't listed here.
const stateRateSchema = new mongoose.Schema(
  {
    state: { type: String, required: true, trim: true },
    charge: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const deliveryAgencySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Agency name is required"],
      trim: true,
      unique: true,
    },
    logoUrl: {
      type: String, // Cloudinary URL
      default: "",
    },
    logoPublicId: {
      type: String, // Cloudinary public_id — needed to delete the logo later
      select: false,
    },
    contactPerson: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, default: "" },
    stateRates: {
      type: [stateRateSchema],
      default: [],
    },
    // Used when the order's shipping state has no specific rate above
    defaultCharge: {
      type: Number,
      required: [true, "Default charge is required"],
      min: 0,
      default: 50,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Used by order.service.js when assigning delivery — returns this agency's
// charge for a given shipping state, falling back to defaultCharge.
deliveryAgencySchema.methods.getRateForState = function (state) {
  const match = this.stateRates.find(
    (r) => r.state.trim().toLowerCase() === (state || "").trim().toLowerCase()
  );
  return match ? match.charge : this.defaultCharge;
};

module.exports = mongoose.models.DeliveryAgency || mongoose.model("DeliveryAgency", deliveryAgencySchema);