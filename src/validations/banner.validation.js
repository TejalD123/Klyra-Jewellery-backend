const Joi = require("joi");

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const createBannerSchema = Joi.object({
  type: Joi.string().valid("hero", "sale").required(),
  title: Joi.string().trim().min(2).max(150).required(),
  subtitle: Joi.string().trim().max(200).allow("", null),
  ctaText: Joi.string().trim().max(40).default("Shop Now"),
  ctaLink: Joi.string().trim().max(200).default("/collections"),
  backgroundColor: Joi.string()
    .trim()
    .pattern(HEX_COLOR_REGEX)
    .messages({ "string.pattern.base": "Enter a valid hex color (e.g. #311120)" })
    .default("#311120"),
  displayOrder: Joi.number().integer().min(0).default(0),
  isActive: Joi.boolean().default(true),
  startDate: Joi.date().allow("", null),
  endDate: Joi.date().allow("", null),
  // `image` is a file — handled by multer (req.file), not part of the JSON body
});

const updateBannerSchema = Joi.object({
  type: Joi.string().valid("hero", "sale"),
  title: Joi.string().trim().min(2).max(150),
  subtitle: Joi.string().trim().max(200).allow("", null),
  ctaText: Joi.string().trim().max(40),
  ctaLink: Joi.string().trim().max(200),
  backgroundColor: Joi.string().trim().pattern(HEX_COLOR_REGEX).messages({
    "string.pattern.base": "Enter a valid hex color (e.g. #311120)",
  }),
  displayOrder: Joi.number().integer().min(0),
  isActive: Joi.boolean(),
  startDate: Joi.date().allow("", null),
  endDate: Joi.date().allow("", null),
}).min(1);

module.exports = {
  createBannerSchema,
  updateBannerSchema,
};