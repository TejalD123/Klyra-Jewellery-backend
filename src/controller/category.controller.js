const mongoose = require("mongoose");
const Category = require("../models/category.model");
const Product = require("../models/product.model");
const ApiResponse = require("../utils/apiResponse");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const {
  uploadImageBuffer,
  deleteImage,
  extractPublicId,
} = require("../services/cloudinary.service");

/**
 * @desc    Create a new category
 * @route   POST /api/categories
 * @access  Admin
 */
const createCategory = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    parentCategory,
    metalTypes,
    attributes,
    displayOrder,
    isActive,
  } = req.body;

  // Check duplicate name (case-insensitive)
  const existing = await Category.findOne({
    name: { $regex: `^${name}$`, $options: "i" },
  });
  if (existing) {
    throw ApiError.conflict("Category with this name already exists");
  }

  // Validate parentCategory exists if provided
  if (parentCategory) {
    const parentExists = await Category.findById(parentCategory);
    if (!parentExists) {
      throw ApiError.badRequest("Parent category not found");
    }
  }

  let imageUrl = "";
  if (req.file) {
    const result = await uploadImageBuffer(req.file.buffer, "categories");
    imageUrl = result.secure_url;
  }

  const category = await Category.create({
    name,
    description,
    parentCategory: parentCategory || null,
    metalTypes,
    attributes,
    displayOrder,
    isActive,
    image: imageUrl,
    createdBy: req.user?.id,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, category, "Category created successfully"));
});

/**
 * @desc    Get all categories (with filters, search, pagination)
 * @route   GET /api/categories
 * @access  Public
 * Query params: parentCategory, metalType, isActive, search, page, limit, sort
 */
const getAllCategories = asyncHandler(async (req, res) => {
  const {
    parentCategory,
    metalType,
    isActive,
    search,
    page = 1,
    limit = 20,
    sort = "displayOrder",
  } = req.query;

  const filter = {};

  if (parentCategory === "null") {
    filter.parentCategory = null; // top-level categories only
  } else if (parentCategory) {
    filter.parentCategory = parentCategory;
  }

  if (metalType) filter.metalTypes = metalType.toLowerCase();
  if (isActive !== undefined) filter.isActive = isActive === "true";
  if (search) filter.$text = { $search: search };

  const pageNum = Math.max(parseInt(page, 10), 1);
  const limitNum = Math.max(parseInt(limit, 10), 1);
  const skip = (pageNum - 1) * limitNum;

  const [categories, total] = await Promise.all([
    Category.find(filter)
      .populate("parentCategory", "name slug")
      .sort(sort)
      .skip(skip)
      .limit(limitNum),
    Category.countDocuments(filter),
  ]);

  return res.status(200).json(
    new ApiResponse(200, {
      categories,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    })
  );
});

/**
 * @desc    Get full category tree (nested parent -> children), for navbar/menu
 * @route   GET /api/categories/tree
 * @access  Public
 */
const getCategoryTree = asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true })
    .sort("displayOrder")
    .lean();

  const buildTree = (parentId = null) =>
    categories
      .filter((cat) => String(cat.parentCategory) === String(parentId))
      .map((cat) => ({ ...cat, children: buildTree(cat._id) }));

  const tree = buildTree(null);

  return res.status(200).json(new ApiResponse(200, tree));
});

/**
 * @desc    Get single category by ID
 * @route   GET /api/categories/:id
 * @access  Public
 */
const getCategoryById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest("Invalid category id");
  }

  const category = await Category.findById(id).populate(
    "parentCategory",
    "name slug"
  );
  if (!category) throw ApiError.notFound("Category not found");

  return res.status(200).json(new ApiResponse(200, category));
});

/**
 * @desc    Get single category by slug (for frontend product listing pages)
 * @route   GET /api/categories/slug/:slug
 * @access  Public
 */
const getCategoryBySlug = asyncHandler(async (req, res) => {
  const category = await Category.findOne({
    slug: req.params.slug,
  }).populate("parentCategory", "name slug");

  if (!category) throw ApiError.notFound("Category not found");

  return res.status(200).json(new ApiResponse(200, category));
});

/**
 * @desc    Get direct subcategories of a category
 * @route   GET /api/categories/:id/subcategories
 * @access  Public
 */
const getSubcategories = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest("Invalid category id");
  }

  const subcategories = await Category.find({
    parentCategory: id,
    isActive: true,
  }).sort("displayOrder");

  return res.status(200).json(new ApiResponse(200, subcategories));
});

/**
 * @desc    Update a category
 * @route   PUT /api/categories/:id
 * @access  Admin
 */
const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const category = await Category.findById(id);
  if (!category) throw ApiError.notFound("Category not found");

  // Prevent a category from becoming its own parent
  if (req.body.parentCategory && String(req.body.parentCategory) === String(id)) {
    throw ApiError.badRequest("A category cannot be its own parent");
  }

  if (req.body.parentCategory) {
    const parentExists = await Category.findById(req.body.parentCategory);
    if (!parentExists) throw ApiError.badRequest("Parent category not found");
  }

  // If name changed, ensure no duplicate
  if (req.body.name && req.body.name !== category.name) {
    const dup = await Category.findOne({
      _id: { $ne: id },
      name: { $regex: `^${req.body.name}$`, $options: "i" },
    });
    if (dup) throw ApiError.conflict("Category with this name already exists");
  }

  // Handle new image upload — replace old one on Cloudinary
  if (req.file) {
    if (category.image) {
      await deleteImage(extractPublicId(category.image));
    }
    const result = await uploadImageBuffer(req.file.buffer, "categories");
    req.body.image = result.secure_url;
  }

  Object.assign(category, req.body);
  await category.save(); // triggers pre-save slug regeneration if name changed

  return res
    .status(200)
    .json(new ApiResponse(200, category, "Category updated successfully"));
});

/**
 * @desc    Toggle isActive status (quick enable/disable without full update)
 * @route   PATCH /api/categories/:id/toggle-status
 * @access  Admin
 */
const toggleCategoryStatus = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound("Category not found");

  category.isActive = !category.isActive;
  await category.save();

  return res
    .status(200)
    .json(
      new ApiResponse(200, category, `Category ${category.isActive ? "activated" : "deactivated"}`)
    );
});

/**
 * @desc    Delete a category (blocked if it has subcategories or products)
 * @route   DELETE /api/categories/:id
 * @access  Admin
 */
const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const category = await Category.findById(id);
  if (!category) throw ApiError.notFound("Category not found");

  const [hasSubcategories, hasProducts] = await Promise.all([
    Category.exists({ parentCategory: id }),
    Product.exists ? Product.exists({ category: id }) : Promise.resolve(false),
  ]);

  if (hasSubcategories) {
    throw ApiError.badRequest(
      "Cannot delete: category has subcategories. Delete or reassign them first."
    );
  }
  if (hasProducts) {
    throw ApiError.badRequest(
      "Cannot delete: products are linked to this category. Reassign or remove them first."
    );
  }

  if (category.image) {
    await deleteImage(extractPublicId(category.image));
  }

  await category.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Category deleted successfully"));
});

module.exports = {
  createCategory,
  getAllCategories,
  getCategoryTree,
  getCategoryById,
  getCategoryBySlug,
  getSubcategories,
  updateCategory,
  toggleCategoryStatus,
  deleteCategory,
};