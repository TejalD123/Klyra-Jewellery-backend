const mongoose = require("mongoose");
const Category = require("../models/category.model");
const Product = require("../models/product.model");
const ApiError = require("../utils/apiError");
const {
  uploadImageBuffer,
  deleteImage,
  extractPublicId,
} = require("./cloudinary.service");

const createCategoryService = async ({ body, file, userId }) => {
  const { name, description, parentCategory, metalTypes, attributes, displayOrder, isActive } = body;

  const existing = await Category.findOne({
    name: { $regex: `^${name}$`, $options: "i" },
  });
  if (existing) throw ApiError.conflict("Category with this name already exists");

  if (parentCategory) {
    const parentExists = await Category.findById(parentCategory);
    if (!parentExists) throw ApiError.badRequest("Parent category not found");
  }

  let imageUrl = "";
  if (file) {
    const result = await uploadImageBuffer(file.buffer, "categories");
    imageUrl = result.secure_url;
  }

  return Category.create({
    name,
    description,
    parentCategory: parentCategory || null,
    metalTypes,
    attributes,
    displayOrder,
    isActive,
    image: imageUrl,
    createdBy: userId,
  });
};

const getAllCategoriesService = async (query) => {
  const { parentCategory, metalType, isActive, search, page = 1, limit = 20, sort = "displayOrder" } = query;

  const filter = {};
  if (parentCategory === "null") filter.parentCategory = null;
  else if (parentCategory) filter.parentCategory = parentCategory;
  if (metalType) filter.metalTypes = metalType.toLowerCase();
  if (isActive !== undefined) filter.isActive = isActive === "true";
  if (search) filter.$text = { $search: search };

  const pageNum = Math.max(parseInt(page, 10), 1);
  const limitNum = Math.max(parseInt(limit, 10), 1);
  const skip = (pageNum - 1) * limitNum;

  const [categories, total] = await Promise.all([
    Category.find(filter).populate("parentCategory", "name slug").sort(sort).skip(skip).limit(limitNum),
    Category.countDocuments(filter),
  ]);

  return {
    categories,
    pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
  };
};

const getCategoryTreeService = async () => {
  const categories = await Category.find({ isActive: true }).sort("displayOrder").lean();

  const buildTree = (parentId = null) =>
    categories
      .filter((cat) => String(cat.parentCategory) === String(parentId))
      .map((cat) => ({ ...cat, children: buildTree(cat._id) }));

  return buildTree(null);
};

const getCategoryByIdService = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest("Invalid category id");
  }

  const category = await Category.findById(id).populate("parentCategory", "name slug");
  if (!category) throw ApiError.notFound("Category not found");

  return category;
};

const getCategoryBySlugService = async (slug) => {
  const category = await Category.findOne({ slug }).populate("parentCategory", "name slug");
  if (!category) throw ApiError.notFound("Category not found");

  return category;
};

const getSubcategoriesService = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest("Invalid category id");
  }

  return Category.find({ parentCategory: id, isActive: true }).sort("displayOrder");
};

const updateCategoryService = async ({ id, body, file }) => {
  const category = await Category.findById(id);
  if (!category) throw ApiError.notFound("Category not found");

  if (body.parentCategory && String(body.parentCategory) === String(id)) {
    throw ApiError.badRequest("A category cannot be its own parent");
  }

  if (body.parentCategory) {
    const parentExists = await Category.findById(body.parentCategory);
    if (!parentExists) throw ApiError.badRequest("Parent category not found");
  }

  if (body.name && body.name !== category.name) {
    const dup = await Category.findOne({
      _id: { $ne: id },
      name: { $regex: `^${body.name}$`, $options: "i" },
    });
    if (dup) throw ApiError.conflict("Category with this name already exists");
  }

  if (file) {
    if (category.image) {
      await deleteImage(extractPublicId(category.image));
    }
    const result = await uploadImageBuffer(file.buffer, "categories");
    body.image = result.secure_url;
  }

  Object.assign(category, body);
  await category.save();

  return category;
};

const toggleCategoryStatusService = async (id) => {
  const category = await Category.findById(id);
  if (!category) throw ApiError.notFound("Category not found");

  category.isActive = !category.isActive;
  await category.save();

  return category;
};

const deleteCategoryService = async (id) => {
  const category = await Category.findById(id);
  if (!category) throw ApiError.notFound("Category not found");

  const [hasSubcategories, hasProducts] = await Promise.all([
    Category.exists({ parentCategory: id }),
    Product.exists({ category: id }),
  ]);

  if (hasSubcategories) throw ApiError.badRequest("Cannot delete: has subcategories");
  if (hasProducts) throw ApiError.badRequest("Cannot delete: products linked");

  if (category.image) await deleteImage(extractPublicId(category.image));
  await category.deleteOne();
};

module.exports = {
  createCategoryService,
  getAllCategoriesService,
  getCategoryTreeService,
  getCategoryByIdService,
  getCategoryBySlugService,
  getSubcategoriesService,
  updateCategoryService,
  toggleCategoryStatusService,
  deleteCategoryService,
};