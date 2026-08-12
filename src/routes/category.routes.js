const express = require("express");

const {
  createCategory,
  getAllCategories,
  getCategoryTree,
  getCategoryById,
  getCategoryBySlug,
  getSubcategories,
  updateCategory,
  toggleCategoryStatus,
  deleteCategory,
} = require("../controller/category.controller");

const { protect, restrictTo } = require("../middleware/auth.middleware");

const upload = require("../middleware/upload.middleware");

const { validateSchema } = require("../middleware/validation.middleware");

const {
  createCategorySchema,
  updateCategorySchema,
} = require("../validations/category.validation");

const router = express.Router();

// ---------- Public routes ----------
router.get("/", getAllCategories);
router.get("/tree", getCategoryTree);
router.get("/slug/:slug", getCategoryBySlug);
router.get("/:id", getCategoryById);
router.get("/:id/subcategories", getSubcategories);

// ---------- Admin-only routes ----------
// CHANGED: upload.single("image") -> upload.uploadCategoryImages
// so image + posterDesktop + posterMobile all come through in one request.
router.post(
  "/",
  protect,
  restrictTo("admin"),
  upload.uploadCategoryImages,
  validateSchema(createCategorySchema),
  createCategory
);

router.put(
  "/:id",
  protect,
  restrictTo("admin"),
  upload.uploadCategoryImages,
  validateSchema(updateCategorySchema),
  updateCategory
);

router.patch(
  "/:id/toggle-status",
  protect,
  restrictTo("admin"),
  toggleCategoryStatus
);

router.delete("/:id", protect, restrictTo("admin"), deleteCategory);

module.exports = router;