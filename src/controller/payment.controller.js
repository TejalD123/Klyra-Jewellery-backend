const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/apiResponse");
const {
  createPaymentOrderService,
  verifyPaymentService,
  processRefundService,
  getPaymentByIdService,
} = require("../services/payment.service");

const createPaymentOrder = asyncHandler(async (req, res) => {
  const { orderId, paymentMethod } = req.body;
  const result = await createPaymentOrderService({ orderId, paymentMethod, userId: req.user.id });
  const message = result.isCod ? "COD payment recorded" : "Razorpay order created";
  return res.status(201).json(new ApiResponse(201, result, message));
});

const verifyPayment = asyncHandler(async (req, res) => {
  const result = await verifyPaymentService(req.body);
  if (!result.verified) {
    return res.status(400).json(new ApiResponse(400, null, "Payment verification failed"));
  }
  return res.status(200).json(new ApiResponse(200, result.payment, "Payment verified successfully"));
});

const processRefund = asyncHandler(async (req, res) => {
  const payment = await processRefundService(req.params.paymentId, req.body);
  return res.status(200).json(new ApiResponse(200, payment, "Refund processed"));
});

const getPaymentById = asyncHandler(async (req, res) => {
  const payment = await getPaymentByIdService(req.params.paymentId);
  return res.status(200).json(new ApiResponse(200, payment));
});

module.exports = { createPaymentOrder, verifyPayment, processRefund, getPaymentById };