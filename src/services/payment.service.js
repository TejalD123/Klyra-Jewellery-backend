const Payment = require("../models/Payment.model");
const Order = require("../models/order.model");
const ApiError = require("../utils/apiError");
const {
  createRazorpayOrder,
  verifyPaymentSignature,
  initiateRefund,
} = require("./razorpay.service");

const createPaymentOrderService = async ({ orderId, paymentMethod, userId }) => {
  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound("Order not found");
  if (order.user.toString() !== userId) throw ApiError.forbidden("Access denied");
  if (order.paymentStatus === "paid") throw ApiError.badRequest("This order is already paid for");

  if (paymentMethod === "cod") {
    const payment = await Payment.create({
      order: order._id,
      user: userId,
      amount: order.pricing.totalAmount,
      paymentMethod: "cod",
      gateway: "cod",
      status: "created",
    });
    return { isCod: true, payment, orderId: order._id };
  }

  const razorpayOrder = await createRazorpayOrder(order.pricing.totalAmount, order.orderNumber);

  const payment = await Payment.create({
    order: order._id,
    user: userId,
    amount: order.pricing.totalAmount,
    paymentMethod,
    gateway: "razorpay",
    razorpayOrderId: razorpayOrder.id,
    status: "created",
  });

  return {
    isCod: false,
    razorpayOrderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    key: process.env.RAZORPAY_KEY_ID,
    paymentId: payment._id,
    orderId: order._id,
  };
};

const verifyPaymentService = async ({ razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId }) => {
  const isValid = verifyPaymentSignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature });

  if (!isValid) {
    await Payment.findOneAndUpdate(
      { razorpayOrderId },
      { status: "failed", failureReason: "Signature verification failed" }
    );
    return { verified: false };
  }

  const payment = await Payment.findOneAndUpdate(
    { razorpayOrderId },
    { razorpayPaymentId, razorpaySignature, status: "captured" },
    { new: true }
  );
  if (!payment) throw ApiError.notFound("Payment record not found for this order");

  await Order.findByIdAndUpdate(orderId, {
    paymentStatus: "paid",
    orderStatus: "confirmed",
    $push: { statusHistory: { status: "confirmed", timestamp: new Date(), note: "Payment received" } },
  });

  return { verified: true, payment };
};

const processRefundService = async (paymentId, { amount, reason }) => {
  const payment = await Payment.findById(paymentId);
  if (!payment) throw ApiError.notFound("Payment not found");
  if (payment.gateway === "cod") throw ApiError.badRequest("Cash on Delivery orders cannot be refunded online");

  const refund = await initiateRefund(payment.razorpayPaymentId, amount, reason);

  payment.refunds.push({ refundId: refund.id, amount, reason, processedAt: new Date() });

  const totalRefunded = payment.refunds.reduce((sum, r) => sum + r.amount, 0);
  payment.status = totalRefunded >= payment.amount ? "refunded" : "partially_refunded";

  await payment.save();
  return payment;
};

const getPaymentByIdService = async (paymentId) => {
  const payment = await Payment.findById(paymentId).populate("order");
  if (!payment) throw ApiError.notFound("Payment not found");
  return payment;
};

module.exports = {
  createPaymentOrderService,
  verifyPaymentService,
  processRefundService,
  getPaymentByIdService,
};