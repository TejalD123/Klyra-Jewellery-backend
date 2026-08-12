const express = require("express");

const {
  getAllOrders,
  updateOrderStatus,
  updatePaymentStatus,
  updateItemReturnStatus,
  assignDelivery,
} = require("../controller/order.controller");

const {
  createDeliveryAgency,
  getAllDeliveryAgencies,
  getActiveDeliveryAgencies,
  getDeliveryAgencyById,
  updateDeliveryAgency,
  toggleDeliveryAgencyStatus,
  deleteDeliveryAgency,
} = require("../controller/deliveryagency.controller");

const {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  toggleCategoryStatus,
  deleteCategory,
} = require("../controller/category.controller");

const {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  updateStock,
  toggleFeatured,
  toggleStatus,
  deleteProduct,
} = require("../controller/product.controller");

const {
  getAllBanners,
  createBanner,
  updateBanner,
  toggleBannerStatus,
  deleteBanner,
} = require("../controller/banner.controller");

const { getDashboardStats, globalSearch } = require("../controller/admin.controller");

const { getAllUsers } = require("../controller/user.controller");

const { protect, restrictTo } = require("../middleware/auth.middleware");
const { validateAdminRequest, orderStatusValidator } = require("../middleware/admin.middleware");
const upload = require("../middleware/upload.middleware");
const { validateSchema } = require("../middleware/validation.middleware");
const parseJsonFields = require("../middleware/Parsejsonfields.middleware");

const {
  createCategorySchema,
  updateCategorySchema,
} = require("../validations/category.validation");

const {
  createProductSchema,
  updateProductSchema,
  updateStockSchema,
} = require("../validations/product.validation");

const {
  createBannerSchema,
  updateBannerSchema,
} = require("../validations/banner.validation");

const {
  createDeliveryAgencySchema,
  updateDeliveryAgencySchema,
} = require("../validations/deliveryAgency.validation");

const CATEGORY_JSON_FIELDS = ["metalTypes", "attributes"];

const PRODUCT_JSON_FIELDS = ["sizeOptions", "keepImages"];

const router = express.Router();

// Ye poora router /admin par mounted hai (index.routes.js dekho), isliye har
// path niche /api/v1/admin/... se shuru hoga. Har route sirf admin ke liye hai.
router.use(protect, restrictTo("admin"));

// ===== DASHBOARD & SEARCH =====
router.get("/dashboard", getDashboardStats);
router.get("/search", globalSearch);

// ===== ORDERS =====
router.get("/orders", getAllOrders);
router.patch("/orders/:id/status", orderStatusValidator, validateAdminRequest, updateOrderStatus);
router.patch("/orders/:id/assign-delivery", assignDelivery);
router.patch("/orders/:id/payment-status", updatePaymentStatus);
router.patch("/orders/:id/items/:itemId/return-status", updateItemReturnStatus);

// ===== DELIVERY AGENCIES =====
const DELIVERY_JSON_FIELDS = ["stateRates"];

router.get("/delivery", getAllDeliveryAgencies);
router.get("/delivery/active", getActiveDeliveryAgencies);
router.get("/delivery/:id", getDeliveryAgencyById);
router.post("/delivery", upload.single("logo"), parseJsonFields(DELIVERY_JSON_FIELDS), validateSchema(createDeliveryAgencySchema), createDeliveryAgency);
router.put("/delivery/:id", upload.single("logo"), parseJsonFields(DELIVERY_JSON_FIELDS), validateSchema(updateDeliveryAgencySchema), updateDeliveryAgency);
router.patch("/delivery/:id/toggle", toggleDeliveryAgencyStatus);
router.delete("/delivery/:id", deleteDeliveryAgency);

// ===== CATEGORIES =====
// CHANGED: upload.single("image") -> upload.uploadCategoryImages
// (handles image + posterDesktop + posterMobile in one multipart request)
router.get("/categories", getAllCategories);
router.get("/categories/:id", getCategoryById);
router.post("/categories", upload.uploadCategoryImages, parseJsonFields(CATEGORY_JSON_FIELDS), validateSchema(createCategorySchema), createCategory);
router.put("/categories/:id", upload.uploadCategoryImages, parseJsonFields(CATEGORY_JSON_FIELDS), validateSchema(updateCategorySchema), updateCategory);
router.patch("/categories/:id/toggle-status", toggleCategoryStatus);
router.delete("/categories/:id", deleteCategory);

// ===== PRODUCTS =====
router.get("/products", getAllProducts);
router.get("/products/:id", getProductById);
router.post(
  "/products",
  upload.array("images", 8),
  parseJsonFields(PRODUCT_JSON_FIELDS),
  validateSchema(createProductSchema),
  createProduct
);
router.put(
  "/products/:id",
  upload.array("images", 8),
  parseJsonFields(PRODUCT_JSON_FIELDS),
  validateSchema(updateProductSchema),
  updateProduct
);
router.patch("/products/:id/stock", validateSchema(updateStockSchema), updateStock);
router.patch("/products/:id/toggle-featured", toggleFeatured);
router.patch("/products/:id/toggle-status", toggleStatus);
router.delete("/products/:id", deleteProduct);

// ===== BANNERS =====
router.get("/banners", getAllBanners);
router.post("/banners", upload.single("image"), validateSchema(createBannerSchema), createBanner);
router.patch("/banners/:id", upload.single("image"), validateSchema(updateBannerSchema), updateBanner);
router.patch("/banners/:id/toggle", toggleBannerStatus);
router.delete("/banners/:id", deleteBanner);

// ===== USERS =====
router.get("/users", getAllUsers);

module.exports = router;