const express = require("express");

const {
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
} = require("../controller/product.controller");

const { protect, restrictTo } = require("../middleware/auth.middleware");

const upload = require("../middleware/upload.middleware");

const { validateSchema } = require("../middleware/validation.middleware");

const parseJsonFields = require("../middleware/Parsejsonfields.middleware");

const {
  createProductSchema,
  updateProductSchema,
  updateStockSchema,
} = require("../validations/product.validation");

// NEW — nested review routes (was defined but never mounted, causing
// "Route not found" 404s on /products/:id/reviews and /reviews/eligibility)
const reviewRouter = require("./review.routes"); // ⚠️ adjust path/filename if different

const JSON_FIELDS = ["sizeOptions", "keepImages"];

const router = express.Router();

// ---------- Public routes ----------
router.get("/", getAllProducts);
router.get("/slug/:slug", getProductBySlug);
router.get("/:id", getProductById);
router.get("/:id/related", getRelatedProducts);

// ---------- Nested review routes ----------
// review.controller.js reads req.params.productId, so this mount MUST use
// ":productId" (not ":id") — mergeParams forwards the param under the exact
// name used in the path segment, it doesn't rename/alias it automatically.
router.use("/:productId/reviews", reviewRouter);

// ---------- Admin-only routes ----------
router.post(
  "/",
  protect,
  restrictTo("admin"),
  upload.array("images", 8),
  parseJsonFields(JSON_FIELDS),
  validateSchema(createProductSchema),
  createProduct
);

router.put(
  "/:id",
  protect,
  restrictTo("admin"),
  upload.array("images", 8),
  parseJsonFields(JSON_FIELDS),
  validateSchema(updateProductSchema),
  updateProduct
);

router.patch(
  "/:id/stock",
  protect,
  restrictTo("admin"),
  validateSchema(updateStockSchema),
  updateStock
);

router.patch(
  "/:id/toggle-featured",
  protect,
  restrictTo("admin"),
  toggleFeatured
);

router.patch(
  "/:id/toggle-bestseller",
  protect,
  restrictTo("admin"),
  toggleBestseller
);

router.patch(
  "/:id/toggle-status",
  protect,
  restrictTo("admin"),
  toggleStatus
);

router.delete(
  "/:id",
  protect,
  restrictTo("admin"),
  deleteProduct
);

module.exports = router;