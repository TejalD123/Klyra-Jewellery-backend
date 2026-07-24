const express = require("express");
const router = express.Router();

const {
  createPaymentOrder,
  verifyPayment,
  processRefund,
  getPaymentById,
} = require("../controller/payment.controller");

const { protect, restrictTo } = require("../middleware/auth.middleware");

router.post("/create", protect, createPaymentOrder);
router.post("/verify", protect, verifyPayment);
router.get("/:paymentId", protect, getPaymentById);
router.post("/:paymentId/refund", protect, restrictTo("admin"), processRefund); // sirf admin refund kar sake

module.exports = router;
