const Payment = require("../models/Payment.model");
const Order = require("../models/order.model");
const {
  createRazorpayOrder,
  verifyPaymentSignature,
  initiateRefund,
} = require("./razorpay.service");

const createPaymentOrderService = async ({ orderId, paymentMethod, userId }) => {
  const order = await Order.findById(orderId);
  if (!order) {
    const err = new Error("Order not found");
    err.statusCode = 404;
    throw err;
  }

  if (paymentMethod === "cod") {
    const payment = await Payment.create({
      order: order._id,
      user: userId,
      amount: order.pricing.totalAmount,
      paymentMethod: "cod",
      gateway: "cod",
      status: "created",
    });
    return { isCod: true, payment };
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

  await Order.findByIdAndUpdate(orderId, {
    paymentStatus: "paid",
    orderStatus: "confirmed",
    $push: { statusHistory: { status: "confirmed", timestamp: new Date(), note: "Payment received" } },
  });

  return { verified: true, payment };
};

const processRefundService = async (paymentId, { amount, reason }) => {
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    const err = new Error("Payment not found");
    err.statusCode = 404;
    throw err;
  }

  if (payment.gateway === "cod") {
    const err = new Error("Cash on Delivery orders cannot be refunded online");
    err.statusCode = 400;
    throw err;
  }

  const refund = await initiateRefund(payment.razorpayPaymentId, amount, reason);

  payment.refunds.push({ refundId: refund.id, amount, reason, processedAt: new Date() });

  const totalRefunded = payment.refunds.reduce((sum, r) => sum + r.amount, 0);
  payment.status = totalRefunded >= payment.amount ? "refunded" : "partially_refunded";

  await payment.save();
  return payment;
};

const getPaymentByIdService = async (paymentId) => {
  const payment = await Payment.findById(paymentId).populate("order");
  if (!payment) {
    const err = new Error("Payment not found");
    err.statusCode = 404;
    throw err;
  }
  return payment;
};

module.exports = {
  createPaymentOrderService,
  verifyPaymentService,
  processRefundService,
  getPaymentByIdService,
};