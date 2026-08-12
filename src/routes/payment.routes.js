const express = require("express");
const router = express.Router();

const {
  createPaymentOrder,
  verifyPayment,
  processRefund,
  getPaymentById,
} = require("../controller/payment.controller");

const { protect, restrictTo } = require("../middleware/auth.middleware");
const { validateSchema } = require("../middleware/validation.middleware");
const {
  createPaymentOrderSchema,
  verifyPaymentSchema,
  refundRequestSchema,
} = require("../validations/payment.validation");

router.use(protect);

router.post("/create", validateSchema(createPaymentOrderSchema), createPaymentOrder);
router.post("/verify", validateSchema(verifyPaymentSchema), verifyPayment);
router.get("/:paymentId", getPaymentById);
router.post("/:paymentId/refund", restrictTo("admin"), validateSchema(refundRequestSchema), processRefund);

module.exports = router;