const Joi = require("joi");

const objectId = Joi.string()
  .regex(/^[0-9a-fA-F]{24}$/)
  .message("Invalid ObjectId");

const createOrderSchema = Joi.object({
  addressId: objectId.required(),
  paymentMethod: Joi.string().valid("card", "upi", "cod").required(),
  couponCode: Joi.string().trim().allow("", null),
  couponDiscount: Joi.number().min(0).default(0), // set by coupon-validation logic later; 0 for now
});

const updateOrderStatusSchema = Joi.object({
  orderStatus: Joi.string()
    .valid("placed", "confirmed", "processing", "shipped", "delivered", "cancelled")
    .required(),
  note: Joi.string().trim().max(300).allow("", null),
});

const updatePaymentStatusSchema = Joi.object({
  paymentStatus: Joi.string()
    .valid("pending", "paid", "failed", "refunded", "partially_refunded")
    .required(),
});

// Cancel the ENTIRE order
const cancelOrderSchema = Joi.object({
  reason: Joi.string().trim().max(300).allow("", null),
});

// Cancel a SINGLE item within an order
const cancelOrderItemSchema = Joi.object({
  reason: Joi.string().trim().max(300).allow("", null),
});

// User requests a return for a single delivered item
const returnRequestSchema = Joi.object({
  reason: Joi.string().trim().max(300).required(),
});

// Admin moves an item through the return workflow
const updateItemReturnStatusSchema = Joi.object({
  itemStatus: Joi.string()
    .valid("return_approved", "returned", "refunded")
    .required(),
  note: Joi.string().trim().max(300).allow("", null),
});

module.exports = {
  createOrderSchema,
  updateOrderStatusSchema,
  updatePaymentStatusSchema,
  cancelOrderSchema,
  cancelOrderItemSchema,
  returnRequestSchema,
  updateItemReturnStatusSchema,
};