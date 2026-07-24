const mongoose = require("mongoose");

const attributeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true, // e.g. "stoneType"
    },
    options: {
      type: [String],
      default: [], // e.g. ["Pearl", "Diamond", "None"]
    },
  },
  { _id: false }
);

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      unique: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
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
      maxlength: 1000,
    },
    image: {
      type: String, // cloudinary URL
      default: "",
    },
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    metalTypes: {
      type: [String],
      default: [],
      // e.g. ["gold", "silver", "platinum", "diamond", "rosegold"]
    },
    attributes: {
      type: [attributeSchema],
      default: [],
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Helpful indexes for common queries
categorySchema.index({ parentCategory: 1, isActive: 1 });
categorySchema.index({ displayOrder: 1 });
categorySchema.index({ name: "text", description: "text" });

// Basic slugify helper (no external package required)
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // remove special chars
    .replace(/[\s_]+/g, "-") // spaces -> hyphen
    .replace(/-+/g, "-"); // collapse multiple hyphens
}

// Auto-generate slug from name whenever name changes
categorySchema.pre("save", async function (next) {
  if (!this.isModified("name")) return next();

  let baseSlug = slugify(this.name);
  let uniqueSlug = baseSlug;
  let counter = 1;

  const CategoryModel = this.constructor;
  // Ensure slug uniqueness (append -1, -2, ... if collision)
  while (
    await CategoryModel.findOne({
      slug: uniqueSlug,
      _id: { $ne: this._id },
    })
  ) {
    uniqueSlug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  this.slug = uniqueSlug;
  next();
});

module.exports = mongoose.model("Category", categorySchema);