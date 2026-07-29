const ApiResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const {
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
} = require("../services/product.service");

const createProduct = asyncHandler(async (req, res) => {
  const product = await createProductService({
    body: req.body,
    files: req.files,
    userId: req.user?.id,
  });
  return res.status(201).json(new ApiResponse(201, product, "Product created successfully"));
});

const getAllProducts = asyncHandler(async (req, res) => {
  const result = await getAllProductsService(req.query);
  return res.status(200).json(new ApiResponse(200, result));
});

const getProductById = asyncHandler(async (req, res) => {
  const product = await getProductByIdService(req.params.id);
  return res.status(200).json(new ApiResponse(200, product));
});

const getProductBySlug = asyncHandler(async (req, res) => {
  const product = await getProductBySlugService(req.params.slug);
  return res.status(200).json(new ApiResponse(200, product));
});

const getRelatedProducts = asyncHandler(async (req, res) => {
  const related = await getRelatedProductsService(req.params.id);
  return res.status(200).json(new ApiResponse(200, related));
});

const updateProduct = asyncHandler(async (req, res) => {
  const product = await updateProductService(req.params.id, req.body, req.files);
  return res.status(200).json(new ApiResponse(200, product, "Product updated successfully"));
});

const updateStock = asyncHandler(async (req, res) => {
  const { action, quantity } = req.body;
  const product = await updateStockService(req.params.id, action, quantity);
  return res.status(200).json(new ApiResponse(200, product, "Stock updated successfully"));
});

const toggleFeatured = asyncHandler(async (req, res) => {
  const product = await toggleFeaturedService(req.params.id);
  return res
    .status(200)
    .json(new ApiResponse(200, product, `Product ${product.isFeatured ? "marked" : "unmarked"} as featured`));
});

const toggleBestseller = asyncHandler(async (req, res) => {
  const product = await toggleBestsellerService(req.params.id);
  return res
    .status(200)
    .json(new ApiResponse(200, product, `Product ${product.isBestseller ? "marked" : "unmarked"} as bestseller`));
});

const toggleStatus = asyncHandler(async (req, res) => {
  const product = await toggleStatusService(req.params.id);
  return res
    .status(200)
    .json(new ApiResponse(200, product, `Product ${product.isActive ? "activated" : "deactivated"}`));
});

const deleteProduct = asyncHandler(async (req, res) => {
  await deleteProductService(req.params.id);
  return res.status(200).json(new ApiResponse(200, null, "Product deleted successfully"));
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
  toggleBestseller,
  toggleStatus,
  deleteProduct,
};