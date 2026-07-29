const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema(
  {
    // "hero" = homepage top banner (image + heading + CTA)
    // "sale" = promotional strip banner (offer text, usually smaller)
    type: {
      type: String,
      enum: ["hero", "sale"],
      required: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    subtitle: {
      type: String,
      trim: true,
      default: "",
    },
    image: {
      type: String, // Cloudinary URL
      required: function () {
        return this.type === "hero"; // sale banners can be text-only
      },
    },
    imagePublicId: {
      type: String, // Cloudinary public_id — needed to delete the image later
      select: false,
    },
    ctaText: {
      type: String,
      trim: true,
      default: "Shop Now",
    },
    ctaLink: {
      type: String,
      trim: true,
      default: "/collections",
    },
    // For "sale" banners — background color chip (hex), admin can pick
    backgroundColor: {
      type: String,
      default: "#311120",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Lower number = shows first (for multiple hero banners in a slider)
    displayOrder: {
      type: Number,
      default: 0,
    },
    // Optional scheduling — sale banners often expire
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Helper used by the public controller to filter "currently valid" banners
bannerSchema.methods.isCurrentlyValid = function () {
  const now = new Date();
  if (this.startDate && now < this.startDate) return false;
  if (this.endDate && now > this.endDate) return false;
  return true;
};

module.exports = mongoose.model("Banner", bannerSchema);