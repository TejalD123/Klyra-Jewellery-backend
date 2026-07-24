const Payment = require("../models/Payment.model");
const Order = require("../models/order.model");
const {
  createRazorpayOrder,
  verifyPaymentSignature,
  initiateRefund,
} = require("../services/razorpay.service");
const {
  createPaymentOrderSchema,
  verifyPaymentSchema,
  refundRequestSchema,
} = require("../validations/payment.validation");

// POST /api/v1/payments/create
// Yeh checkout ke time call hota hai — user "Pay Now" dabata hai
exports.createPaymentOrder = async (req, res, next) => {
  try {
    const { error, value } = createPaymentOrderSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const { orderId, paymentMethod } = value;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // COD ke liye Razorpay involve hi nahi hota — seedha payment record bana do
    if (paymentMethod === "cod") {
      const payment = await Payment.create({
        order: order._id,
        user: req.user._id, // auth middleware se aata hai
        amount: order.pricing.totalAmount,
        paymentMethod: "cod",
        gateway: "cod",
        status: "created", // COD ka status delivery ke time "captured" hoga
      });

      return res.status(201).json({ success: true, payment });
    }

    // Card/UPI/Netbanking — Razorpay order banao
    const razorpayOrder = await createRazorpayOrder(order.pricing.totalAmount, order.orderNumber);

    const payment = await Payment.create({
      order: order._id,
      user: req.user._id,
      amount: order.pricing.totalAmount,
      paymentMethod,
      gateway: "razorpay",
      razorpayOrderId: razorpayOrder.id,
      status: "created",
    });

    // Frontend ko yeh info chahiye Razorpay checkout widget kholne ke liye
    res.status(201).json({
      success: true,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key: process.env.RAZORPAY_KEY_ID, // frontend ko public key chahiye hoti hai
      paymentId: payment._id,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/payments/verify
// Razorpay checkout complete hone ke baad frontend yeh call karta hai
exports.verifyPayment = async (req, res, next) => {
  try {
    const { error, value } = verifyPaymentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } = value;

    const isValid = verifyPaymentSignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    if (!isValid) {
      await Payment.findOneAndUpdate(
        { razorpayOrderId },
        { status: "failed", failureReason: "Signature verification failed" }
      );
      return res.status(400).json({ success: false, message: "Payment verification failed" });
    }

    // Signature sahi hai — payment aur order dono update karo
    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId },
      {
        razorpayPaymentId,
        razorpaySignature,
        status: "captured",
      },
      { new: true }
    );

    await Order.findByIdAndUpdate(orderId, {
      paymentStatus: "paid",
      orderStatus: "confirmed",
      $push: {
        statusHistory: { status: "confirmed", timestamp: new Date(), note: "Payment received" },
      },
    });

    res.status(200).json({ success: true, message: "Payment verified successfully", payment });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/payments/:paymentId/refund   (admin only)
exports.processRefund = async (req, res, next) => {
  try {
    const { error, value } = refundRequestSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const { amount, reason } = value;
    const payment = await Payment.findById(req.params.paymentId);

    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    if (payment.gateway === "cod") {
      return res
        .status(400)
        .json({ success: false, message: "Cash on Delivery orders cannot be refunded online" });
    }

    const refund = await initiateRefund(payment.razorpayPaymentId, amount, reason);

    payment.refunds.push({
      refundId: refund.id,
      amount,
      reason,
      processedAt: new Date(),
    });

    // Poora amount refund hua ya partial — status update karo
    const totalRefunded = payment.refunds.reduce((sum, r) => sum + r.amount, 0);
    payment.status = totalRefunded >= payment.amount ? "refunded" : "partially_refunded";

    await payment.save();

    res.status(200).json({ success: true, message: "Refund processed", payment });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/payments/:paymentId
exports.getPaymentById = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.paymentId).populate("order");
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }
    res.status(200).json({ success: true, payment });
  } catch (err) {
    next(err);
  }
};