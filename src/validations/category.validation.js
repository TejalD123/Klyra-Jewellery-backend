const Joi = require("joi");

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/).message("Invalid ObjectId");

const attributeSchema = Joi.object({
  name: Joi.string().trim().min(1).max(50).required(),
  options: Joi.array().items(Joi.string().trim()).default([]),
});

// Used when creating a new category
const createCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  description: Joi.string().trim().max(1000).allow("", null),
  parentCategory: objectId.allow(null, ""),
  metalTypes: Joi.array().items(Joi.string().trim().lowercase()).default([]),
  attributes: Joi.array().items(attributeSchema).default([]),
  displayOrder: Joi.number().integer().min(0).default(0),
  isActive: Joi.boolean().default(true),
  // image comes via multipart/form-data file (req.file), not JSON body
});

// Used when updating an existing category — all fields optional
const updateCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  description: Joi.string().trim().max(1000).allow("", null),
  parentCategory: objectId.allow(null, ""),
  metalTypes: Joi.array().items(Joi.string().trim().lowercase()),
  attributes: Joi.array().items(attributeSchema),
  displayOrder: Joi.number().integer().min(0),
  isActive: Joi.boolean(),
}).min(1); // at least one field required for update

module.exports = {
  createCategorySchema,
  updateCategorySchema,
};