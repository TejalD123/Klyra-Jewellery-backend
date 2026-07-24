const Joi = require("joi");

const createPaymentOrderSchema = Joi.object({
  orderId: Joi.string().required(), // aapka Order model ka _id
  paymentMethod: Joi.string().valid("card", "upi", "cod", "netbanking").required(),
});

const verifyPaymentSchema = Joi.object({
  razorpayOrderId: Joi.string().required(),
  razorpayPaymentId: Joi.string().required(),
  razorpaySignature: Joi.string().required(),
  orderId: Joi.string().required(),
});

const refundRequestSchema = Joi.object({
  amount: Joi.number().positive().required(),
  reason: Joi.string().min(3).required(),
});

module.exports = { createPaymentOrderSchema, verifyPaymentSchema, refundRequestSchema };