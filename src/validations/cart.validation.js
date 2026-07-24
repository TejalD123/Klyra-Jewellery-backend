const Joi = require("joi");

const objectId = Joi.string()
  .regex(/^[0-9a-fA-F]{24}$/)
  .message("Invalid ObjectId");

const addItemSchema = Joi.object({
  productId: objectId.required(),
  quantity: Joi.number().integer().min(1).default(1),
  size: Joi.string().trim().allow("", null),
});

const updateItemSchema = Joi.object({
  quantity: Joi.number().integer().min(1).required(),
});

module.exports = {
  addItemSchema,
  updateItemSchema,
};