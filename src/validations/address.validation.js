const Joi = require("joi");

const PHONE_REGEX = /^[6-9]\d{9}$/;
const PINCODE_REGEX = /^[1-9][0-9]{5}$/;

const createAddressSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(100).required(),
  phoneNumber: Joi.string().trim().pattern(PHONE_REGEX).required().messages({
    "string.pattern.base": "Enter a valid 10-digit Indian phone number",
  }),
  addressLine1: Joi.string().trim().max(200).required(),
  addressLine2: Joi.string().trim().max(200).allow("", null),
  city: Joi.string().trim().max(100).required(),
  state: Joi.string().trim().max(100).required(),
  pincode: Joi.string().trim().pattern(PINCODE_REGEX).required().messages({
    "string.pattern.base": "Enter a valid 6-digit Indian pincode",
  }),
  country: Joi.string().trim().default("India"),
  addressType: Joi.string().valid("Home", "Office", "Other").default("Home"),
  isDefault: Joi.boolean().default(false),
  // `user` is never accepted from client — always taken from req.user.id
});

const updateAddressSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(100),
  phoneNumber: Joi.string().trim().pattern(PHONE_REGEX).messages({
    "string.pattern.base": "Enter a valid 10-digit Indian phone number",
  }),
  addressLine1: Joi.string().trim().max(200),
  addressLine2: Joi.string().trim().max(200).allow("", null),
  city: Joi.string().trim().max(100),
  state: Joi.string().trim().max(100),
  pincode: Joi.string().trim().pattern(PINCODE_REGEX).messages({
    "string.pattern.base": "Enter a valid 6-digit Indian pincode",
  }),
  country: Joi.string().trim(),
  addressType: Joi.string().valid("Home", "Office", "Other"),
  isDefault: Joi.boolean(),
}).min(1);

module.exports = {
  createAddressSchema,
  updateAddressSchema,
};