const express = require("express");

const {
  createOrder,
  getMyOrders,
  getOrderById,
  getOrderByOrderNumber,
  cancelOrder,
  cancelOrderItem,
  requestItemReturn,
} = require("../controller/order.controller");

const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

// Every order route needs a logged-in account
router.use(protect);

router.post("/", createOrder);
router.get("/my", getMyOrders);
router.get("/number/:orderNumber", getOrderByOrderNumber);
router.get("/:id", getOrderById);

router.patch("/:id/cancel", cancelOrder);
router.patch("/:id/items/:itemId/cancel", cancelOrderItem);
router.patch("/:id/items/:itemId/return-request", requestItemReturn);

module.exports = router;