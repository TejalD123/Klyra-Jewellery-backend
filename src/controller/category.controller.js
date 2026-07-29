const ApiResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const {
  createCategoryService,
  getAllCategoriesService,
  getCategoryTreeService,
  getCategoryByIdService,
  getCategoryBySlugService,
  getSubcategoriesService,
  updateCategoryService,
  toggleCategoryStatusService,
  deleteCategoryService,
} = require("../services/category.service");

const createCategory = asyncHandler(async (req, res) => {
  const category = await createCategoryService({
    body: req.body,
    file: req.file,
    userId: req.user?.id,
  });
  return res.status(201).json(new ApiResponse(201, category, "Category created successfully"));
});

const getAllCategories = asyncHandler(async (req, res) => {
  const result = await getAllCategoriesService(req.query);
  return res.status(200).json(new ApiResponse(200, result));
});

const getCategoryTree = asyncHandler(async (req, res) => {
  const tree = await getCategoryTreeService();
  return res.status(200).json(new ApiResponse(200, tree));
});

const getCategoryById = asyncHandler(async (req, res) => {
  const category = await getCategoryByIdService(req.params.id);
  return res.status(200).json(new ApiResponse(200, category));
});

const getCategoryBySlug = asyncHandler(async (req, res) => {
  const category = await getCategoryBySlugService(req.params.slug);
  return res.status(200).json(new ApiResponse(200, category));
});

const getSubcategories = asyncHandler(async (req, res) => {
  const subcategories = await getSubcategoriesService(req.params.id);
  return res.status(200).json(new ApiResponse(200, subcategories));
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await updateCategoryService({
    id: req.params.id,
    body: req.body,
    file: req.file,
  });
  return res.status(200).json(new ApiResponse(200, category, "Category updated successfully"));
});

const toggleCategoryStatus = asyncHandler(async (req, res) => {
  const category = await toggleCategoryStatusService(req.params.id);
  return res
    .status(200)
    .json(new ApiResponse(200, category, `Category ${category.isActive ? "activated" : "deactivated"}`));
});

const deleteCategory = asyncHandler(async (req, res) => {
  await deleteCategoryService(req.params.id);
  return res.status(200).json(new ApiResponse(200, null, "Category deleted successfully"));
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