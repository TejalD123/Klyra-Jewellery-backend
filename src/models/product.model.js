const mongoose = require("mongoose");

const ratingsSchema = new mongoose.Schema(
  {
    avgRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      minlength: 2,
      maxlength: 150,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },
    images: {
      type: [String], // cloudinary URLs
      default: [],
      validate: {
        validator: (arr) => arr.length <= 8,
        message: "Maximum 8 images allowed per product",
      },
    },
    metalType: {
      type: String,
      required: [true, "Metal type is required"],
      enum: ["gold", "silver", "platinum", "rosegold"],
      lowercase: true,
    },
    purity: {
      type: String, // e.g. "22K", "925 Sterling"
      trim: true,
      default: "",
    },
    weight: {
      type: Number, // grams
      required: [true, "Weight is required"],
      min: 0,
    },
    stoneType: {
      type: String,
      enum: ["Pearl", "Diamond", "Kundan", "Ruby", "Emerald", "None"],
      default: "None",
    },
    makingCharges: {
      type: Number,
      default: 0,
      min: 0,
    },
    basePrice: {
      type: Number,
      required: [true, "Base price is required"],
      min: 0,
    },
    discount: {
      type: Number, // percentage
      default: 0,
      min: 0,
      max: 100,
    },
    finalPrice: {
      type: Number, // auto-calculated, do not set manually
      default: 0,
      min: 0,
    },
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    sku: {
      type: String,
      unique: true,
      uppercase: true,
      trim: true,
    },
    sizeOptions: {
      type: [String],
      default: [],
    },
    isCustomizable: {
      type: Boolean,
      default: false,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    // NEW — manual admin-set flag, same pattern as isFeatured. Not
    // sales-derived (no order-count aggregation) so it stays cheap to
    // query/filter/sort on for the storefront filter bar. If you'd rather
    // it be computed from actual sales later, that's a separate aggregation
    // job — this flag can stay as a manual override either way.
    isBestseller: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    ratings: {
      type: ratingsSchema,
      default: () => ({}),
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Indexes for common queries
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ metalType: 1 });
productSchema.index({ isFeatured: 1, isActive: 1 });
productSchema.index({ isBestseller: 1, isActive: 1 }); // NEW
productSchema.index({ basePrice: 1 });
productSchema.index({ name: "text", description: "text", sku: "text" });

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

function generateSkuBase(name, metalType) {
  const namePart = name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase();
  const metalPart = (metalType || "GEN").slice(0, 2).toUpperCase();
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `${metalPart}-${namePart}-${randomPart}`;
}

// Auto slug (on name change) + auto SKU (if missing) + finalPrice calc
productSchema.pre("save", async function (next) {
  const ProductModel = this.constructor;

  // ---- Slug ----
  if (this.isModified("name")) {
    let baseSlug = slugify(this.name);
    let uniqueSlug = baseSlug;
    let counter = 1;
    while (
      await ProductModel.findOne({ slug: uniqueSlug, _id: { $ne: this._id } })
    ) {
      uniqueSlug = `${baseSlug}-${counter}`;
      counter += 1;
    }
    this.slug = uniqueSlug;
  }

  // ---- SKU (auto-generate only if not provided) ----
  if (!this.sku) {
    let sku = generateSkuBase(this.name, this.metalType);
    while (await ProductModel.findOne({ sku, _id: { $ne: this._id } })) {
      sku = generateSkuBase(this.name, this.metalType);
    }
    this.sku = sku;
  }

  // ---- finalPrice = (basePrice + makingCharges) - discount% ----
  if (
    this.isModified("basePrice") ||
    this.isModified("makingCharges") ||
    this.isModified("discount")
  ) {
    const subtotal = (this.basePrice || 0) + (this.makingCharges || 0);
    const discountAmount = (subtotal * (this.discount || 0)) / 100;
    this.finalPrice = Math.round((subtotal - discountAmount) * 100) / 100;
  }

  next();
});

module.exports = mongoose.model("Product", productSchema);