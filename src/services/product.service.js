const Product = require("../models/product.model");
const Category = require("../models/category.model");
const ApiError = require("../utils/apiError");
const {
  uploadMultipleImages,
  deleteImage,
  extractPublicId,
} = require("./cloudinary.service");

const createProductService = async ({ body, files, userId }) => {
  const category = await Category.findById(body.category);
  if (!category) throw ApiError.badRequest("Category not found");

  if (body.sku) {
    const dupSku = await Product.findOne({ sku: body.sku.toUpperCase() });
    if (dupSku) throw ApiError.conflict("SKU already in use");
  }

  let images = [];
  if (files && files.length > 0) {
    images = await uploadMultipleImages(files, "products");
  }

  return Product.create({ ...body, images, createdBy: userId });
};

// Accepts either a single category id ("507f...") or a comma-separated
// list ("507f...,507f...") — the storefront's FilterSidebar can select
// multiple categories/subcategories at once. Resolves each id to itself
// + its direct subcategories, then flattens/dedupes into one id list.
const resolveCategoryIds = async (categoryParam) => {
  const ids = String(categoryParam)
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  const idLists = await Promise.all(
    ids.map(async (id) => {
      const subcategories = await Category.find({ parentCategory: id }).select("_id");
      return [id, ...subcategories.map((c) => c._id.toString())];
    })
  );

  return [...new Set(idLists.flat())];
};

const getAllProductsService = async (query) => {
  const {
    category, metalType, stoneType, purity, minPrice, maxPrice,
    isFeatured, isBestseller, isCustomizable, isActive, inStock, search, size,
    page = 1, limit = 20, sort = "-createdAt",
    ...rest
  } = query;

  const filter = {};
  if (category) {
    const categoryIds = await resolveCategoryIds(category);
    filter.category = { $in: categoryIds };
  }
  if (metalType) filter.metalType = metalType.toLowerCase();
  if (stoneType) filter.stoneType = stoneType;
  if (purity) filter.purity = purity;
  if (isFeatured !== undefined) filter.isFeatured = isFeatured === "true";
  // NEW — Bestseller / Customizable ("Features" section in the search
  // sidebar). isBestseller already existed on the model but wasn't
  // filterable from the search API before.
  if (isBestseller !== undefined) filter.isBestseller = isBestseller === "true";
  if (isCustomizable !== undefined) filter.isCustomizable = isCustomizable === "true";
  if (isActive !== undefined) filter.isActive = isActive === "true";
  if (inStock === "true") filter.stock = { $gt: 0 };
  if (minPrice || maxPrice) {
    filter.finalPrice = {};
    if (minPrice) filter.finalPrice.$gte = Number(minPrice);
    if (maxPrice) filter.finalPrice.$lte = Number(maxPrice);
  }
  if (search) filter.$text = { $search: search };

  // NEW — Size filter (sizeOptions on the product). Accepts a single size
  // ("54") or a comma-separated list ("50,52,54") from the sidebar
  // checkboxes; matches a product if ANY of its sizeOptions is in the
  // requested list.
  if (size) {
    const sizes = String(size).split(",").map((s) => s.trim()).filter(Boolean);
    if (sizes.length > 0) filter.sizeOptions = { $in: sizes };
  }

  const attributeFilters = Object.entries(rest)
    .filter(([key, value]) => key.startsWith("attr_") && value)
    .map(([key, value]) => ({
      $elemMatch: { name: key.replace("attr_", ""), value },
    }));

  if (attributeFilters.length > 0) {
    filter.attributes = { $all: attributeFilters };
  }

  const pageNum = Math.max(parseInt(page, 10), 1);
  const limitNum = Math.max(parseInt(limit, 10), 1);
  const skip = (pageNum - 1) * limitNum;

  const [products, total] = await Promise.all([
    Product.find(filter).populate("category", "name slug").sort(sort).skip(skip).limit(limitNum),
    Product.countDocuments(filter),
  ]);

  return {
    products,
    pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
  };
};

const CATEGORY_POPULATE = {
  path: "category",
  select: "name slug attributes parentCategory",
  populate: { path: "parentCategory", select: "name slug" },
};

const getProductByIdService = async (id) => {
  if (!require("mongoose").Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest("Invalid product id");
  }
  const product = await Product.findById(id).populate(CATEGORY_POPULATE);
  if (!product) throw ApiError.notFound("Product not found");
  return product;
};

const getProductBySlugService = async (slug) => {
  const product = await Product.findOne({ slug }).populate(CATEGORY_POPULATE);
  if (!product) throw ApiError.notFound("Product not found");
  return product;
};

const getRelatedProductsService = async (id) => {
  const product = await Product.findById(id);
  if (!product) throw ApiError.notFound("Product not found");

  return Product.find({ category: product.category, _id: { $ne: id }, isActive: true })
    .limit(8)
    .select("name slug images finalPrice ratings");
};

const updateProductService = async (id, body, files) => {
  const product = await Product.findById(id);
  if (!product) throw ApiError.notFound("Product not found");

  if (body.category) {
    const categoryExists = await Category.findById(body.category);
    if (!categoryExists) throw ApiError.badRequest("Category not found");
  }

  if (body.sku && body.sku.toUpperCase() !== product.sku) {
    const dupSku = await Product.findOne({ sku: body.sku.toUpperCase(), _id: { $ne: id } });
    if (dupSku) throw ApiError.conflict("SKU already in use");
  }

  let finalImages = product.images;
  if (body.keepImages) {
    finalImages = product.images.filter((img) => body.keepImages.includes(img));
    const removed = product.images.filter((img) => !finalImages.includes(img));
    await Promise.all(removed.map((img) => deleteImage(extractPublicId(img))));
  }

  if (files && files.length > 0) {
    const newImages = await uploadMultipleImages(files, "products");
    finalImages = [...finalImages, ...newImages];
  }

  if (finalImages.length > 8) throw ApiError.badRequest("Maximum 8 images allowed per product");

  delete body.keepImages;
  Object.assign(product, body, { images: finalImages });
  await product.save();
  return product;
};

const updateStockService = async (id, action, quantity) => {
  const product = await Product.findById(id);
  if (!product) throw ApiError.notFound("Product not found");

  if (action === "increment") {
    product.stock += quantity;
  } else if (action === "decrement") {
    if (product.stock < quantity) throw ApiError.badRequest("Insufficient stock");
    product.stock -= quantity;
  } else if (action === "set") {
    product.stock = quantity;
  }

  await product.save();
  return product;
};

const toggleFeaturedService = async (id) => {
  const product = await Product.findById(id);
  if (!product) throw ApiError.notFound("Product not found");

  product.isFeatured = !product.isFeatured;
  await product.save();
  return product;
};

const toggleBestsellerService = async (id) => {
  const product = await Product.findById(id);
  if (!product) throw ApiError.notFound("Product not found");

  product.isBestseller = !product.isBestseller;
  await product.save();
  return product;
};

const toggleStatusService = async (id) => {
  const product = await Product.findById(id);
  if (!product) throw ApiError.notFound("Product not found");

  product.isActive = !product.isActive;
  await product.save();
  return product;
};

const deleteProductService = async (id) => {
  const product = await Product.findById(id);
  if (!product) throw ApiError.notFound("Product not found");

  await Promise.all(product.images.map((img) => deleteImage(extractPublicId(img))));
  await product.deleteOne();
};

module.exports = {
  createProductService,
  getAllProductsService,
  getProductByIdService,
  getProductBySlugService,
  getRelatedProductsService,
  updateProductService,
  updateStockService,
  toggleFeaturedService,
  toggleBestsellerService,
  toggleStatusService,
  deleteProductService,
};