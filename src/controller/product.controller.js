const mongoose = require("mongoose");
const Product = require("../models/product.model");
const Category = require("../models/category.model");
const ApiResponse = require("../utils/apiResponse");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const {
  uploadMultipleImages,
  deleteImage,
  extractPublicId,
} = require("../services/cloudinary.service");

/**
 * @desc    Create a new product
 * @route   POST /api/products
 * @access  Admin
 */
const createProduct = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.body.category);
  if (!category) throw ApiError.badRequest("Category not found");

  if (req.body.sku) {
    const dupSku = await Product.findOne({ sku: req.body.sku.toUpperCase() });
    if (dupSku) throw ApiError.conflict("SKU already in use");
  }

  let images = [];
  if (req.files && req.files.length > 0) {
    images = await uploadMultipleImages(req.files, "products");
  }

  const product = await Product.create({
    ...req.body,
    images,
    createdBy: req.user?.id,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, product, "Product created successfully"));
});

/**
 * @desc    Get all products (filters, search, pagination, sorting)
 * @route   GET /api/products
 * @access  Public
 * Query: category, metalType, stoneType, purity, minPrice, maxPrice,
 *        isFeatured, isActive, inStock, search, page, limit, sort
 */
const getAllProducts = asyncHandler(async (req, res) => {
  const {
    category,
    metalType,
    stoneType,
    purity,
    minPrice,
    maxPrice,
    isFeatured,
    isActive,
    inStock,
    search,
    page = 1,
    limit = 20,
    sort = "-createdAt",
  } = req.query;

  const filter = {};

  if (category) filter.category = category;
  if (metalType) filter.metalType = metalType.toLowerCase();
  if (stoneType) filter.stoneType = stoneType;
  if (purity) filter.purity = purity;
  if (isFeatured !== undefined) filter.isFeatured = isFeatured === "true";
  if (isActive !== undefined) filter.isActive = isActive === "true";
  if (inStock === "true") filter.stock = { $gt: 0 };

  if (minPrice || maxPrice) {
    filter.finalPrice = {};
    if (minPrice) filter.finalPrice.$gte = Number(minPrice);
    if (maxPrice) filter.finalPrice.$lte = Number(maxPrice);
  }

  if (search) filter.$text = { $search: search };

  const pageNum = Math.max(parseInt(page, 10), 1);
  const limitNum = Math.max(parseInt(limit, 10), 1);
  const skip = (pageNum - 1) * limitNum;

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate("category", "name slug")
      .sort(sort)
      .skip(skip)
      .limit(limitNum),
    Product.countDocuments(filter),
  ]);

  return res.status(200).json(
    new ApiResponse(200, {
      products,
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
 * @desc    Get single product by ID
 * @route   GET /api/products/:id
 * @access  Public
 */
const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest("Invalid product id");
  }

  const product = await Product.findById(id).populate(
    "category",
    "name slug attributes"
  );
  if (!product) throw ApiError.notFound("Product not found");

  return res.status(200).json(new ApiResponse(200, product));
});

/**
 * @desc    Get single product by slug (for product detail page)
 * @route   GET /api/products/slug/:slug
 * @access  Public
 */
const getProductBySlug = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug }).populate(
    "category",
    "name slug attributes"
  );
  if (!product) throw ApiError.notFound("Product not found");

  return res.status(200).json(new ApiResponse(200, product));
});

/**
 * @desc    Get related products (same category, excluding current product)
 * @route   GET /api/products/:id/related
 * @access  Public
 */
const getRelatedProducts = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await Product.findById(id);
  if (!product) throw ApiError.notFound("Product not found");

  const related = await Product.find({
    category: product.category,
    _id: { $ne: id },
    isActive: true,
  })
    .limit(8)
    .select("name slug images finalPrice ratings");

  return res.status(200).json(new ApiResponse(200, related));
});

/**
 * @desc    Update a product
 * @route   PUT /api/products/:id
 * @access  Admin
 */
const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await Product.findById(id);
  if (!product) throw ApiError.notFound("Product not found");

  if (req.body.category) {
    const categoryExists = await Category.findById(req.body.category);
    if (!categoryExists) throw ApiError.badRequest("Category not found");
  }

  if (req.body.sku && req.body.sku.toUpperCase() !== product.sku) {
    const dupSku = await Product.findOne({
      sku: req.body.sku.toUpperCase(),
      _id: { $ne: id },
    });
    if (dupSku) throw ApiError.conflict("SKU already in use");
  }

  // Keep only specified existing images (client sends URLs it wants to retain)
  let finalImages = product.images;
  if (req.body.keepImages) {
    finalImages = product.images.filter((img) =>
      req.body.keepImages.includes(img)
    );
    // delete removed images from cloudinary
    const removed = product.images.filter(
      (img) => !finalImages.includes(img)
    );
    await Promise.all(removed.map((img) => deleteImage(extractPublicId(img))));
  }

  // Add newly uploaded images
  if (req.files && req.files.length > 0) {
    const newImages = await uploadMultipleImages(req.files, "products");
    finalImages = [...finalImages, ...newImages];
  }

  if (finalImages.length > 8) {
    throw ApiError.badRequest("Maximum 8 images allowed per product");
  }

  delete req.body.keepImages;
  Object.assign(product, req.body, { images: finalImages });
  await product.save(); // recalculates slug/sku/finalPrice as needed

  return res
    .status(200)
    .json(new ApiResponse(200, product, "Product updated successfully"));
});

/**
 * @desc    Update stock (increment / decrement / set) — useful for orders & restock
 * @route   PATCH /api/products/:id/stock
 * @access  Admin
 */
const updateStock = asyncHandler(async (req, res) => {
  const { action, quantity } = req.body;
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound("Product not found");

  if (action === "increment") {
    product.stock += quantity;
  } else if (action === "decrement") {
    if (product.stock < quantity) {
      throw ApiError.badRequest("Insufficient stock");
    }
    product.stock -= quantity;
  } else if (action === "set") {
    product.stock = quantity;
  }

  await product.save();

  return res
    .status(200)
    .json(new ApiResponse(200, product, "Stock updated successfully"));
});

/**
 * @desc    Toggle isFeatured
 * @route   PATCH /api/products/:id/toggle-featured
 * @access  Admin
 */
const toggleFeatured = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound("Product not found");

  product.isFeatured = !product.isFeatured;
  await product.save();

  return res
    .status(200)
    .json(new ApiResponse(200, product, `Product ${product.isFeatured ? "marked" : "unmarked"} as featured`));
});

/**
 * @desc    Toggle isActive
 * @route   PATCH /api/products/:id/toggle-status
 * @access  Admin
 */
const toggleStatus = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound("Product not found");

  product.isActive = !product.isActive;
  await product.save();

  return res
    .status(200)
    .json(new ApiResponse(200, product, `Product ${product.isActive ? "activated" : "deactivated"}`));
});

/**
 * @desc    Delete a product
 * @route   DELETE /api/products/:id
 * @access  Admin
 */
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound("Product not found");

  // TODO: jevha Order model banशील, tevha check kar ki product
  // konatya pending/active order madhe aahe ka - asल्यास hard delete block kar,
  // fakt isActive=false (soft delete) kar.

  await Promise.all(
    product.images.map((img) => deleteImage(extractPublicId(img)))
  );

  await product.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Product deleted successfully"));
});

module.exports = {
  createProduct,
  getAllProducts,
  getProductById,
  getProductBySlug,
  getRelatedProducts,
  updateProduct,
  updateStock,
  toggleFeatured,
  toggleStatus,
  deleteProduct,
};