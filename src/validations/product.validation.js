const Joi = require("joi");

const objectId = Joi.string()
  .regex(/^[0-9a-fA-F]{24}$/)
  .message("Invalid ObjectId");

const METAL_TYPES = ["gold", "silver", "platinum", "rosegold"];
const STONE_TYPES = ["Pearl", "Diamond", "Kundan", "Ruby", "Emerald", "None"];

// NEW — { name: "Occasion", value: "Wedding" } style pairs. Not validated
// against the category's actual attribute list here (that would need a DB
// lookup inside Joi, which is awkward) — product.service.js can do that
// check against the category document if you want it strict.
const attributeSchema = Joi.object({
  name: Joi.string().trim().min(1).max(50).required(),
  value: Joi.string().trim().min(1).max(100).required(),
});

const createProductSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).required(),
  description: Joi.string().trim().max(2000).allow("", null),
  category: objectId.required(),
  metalType: Joi.string().lowercase().valid(...METAL_TYPES).required(),
  purity: Joi.string().trim().max(30).allow("", null),
  weight: Joi.number().positive().required(),
  stoneType: Joi.string().valid(...STONE_TYPES).default("None"),
  attributes: Joi.array().items(attributeSchema).default([]), // NEW
  makingCharges: Joi.number().min(0).default(0),
  basePrice: Joi.number().min(0).required(),
  discount: Joi.number().min(0).max(100).default(0),
  stock: Joi.number().integer().min(0).default(0),
  sku: Joi.string().trim().uppercase().allow("", null),
  sizeOptions: Joi.array().items(Joi.string().trim()).default([]),
  isCustomizable: Joi.boolean().default(false),
  isFeatured: Joi.boolean().default(false),
  isBestseller: Joi.boolean().default(false),
  isActive: Joi.boolean().default(true),
});

const updateProductSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150),
  description: Joi.string().trim().max(2000).allow("", null),
  category: objectId,
  metalType: Joi.string().lowercase().valid(...METAL_TYPES),
  purity: Joi.string().trim().max(30).allow("", null),
  weight: Joi.number().positive(),
  stoneType: Joi.string().valid(...STONE_TYPES),
  attributes: Joi.array().items(attributeSchema), // NEW
  makingCharges: Joi.number().min(0),
  basePrice: Joi.number().min(0),
  discount: Joi.number().min(0).max(100),
  stock: Joi.number().integer().min(0),
  sku: Joi.string().trim().uppercase(),
  sizeOptions: Joi.array().items(Joi.string().trim()),
  isCustomizable: Joi.boolean(),
  isFeatured: Joi.boolean(),
  isBestseller: Joi.boolean(),
  isActive: Joi.boolean(),
  keepImages: Joi.array().items(Joi.string().uri()),
}).min(1);

const updateStockSchema = Joi.object({
  action: Joi.string().valid("increment", "decrement", "set").required(),
  quantity: Joi.number().integer().min(0).required(),
});

module.exports = {
  createProductSchema,
  updateProductSchema,
  updateStockSchema,
};