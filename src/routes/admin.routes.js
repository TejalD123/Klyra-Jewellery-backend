const express = require("express");

const {
  getAllOrders,
  updateOrderStatus,
  updatePaymentStatus,
  updateItemReturnStatus,
} = require("../controller/order.controller");

const { protect, restrictTo } = require("../middleware/auth.middleware");
const { validateAdminRequest, orderStatusValidator } = require("../middleware/admin.middleware");

const router = express.Router();

// All routes here require a logged-in admin
router.use(protect, restrictTo("admin"));

router.get("/", getAllOrders);
router.patch("/:id/status", orderStatusValidator, validateAdminRequest, updateOrderStatus);
router.patch("/:id/payment-status", updatePaymentStatus);
router.patch("/:id/items/:itemId/return-status", updateItemReturnStatus);

module.exports = router;
