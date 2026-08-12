const Joi = require("joi");

const stateRateSchema = Joi.object({
  state: Joi.string().trim().min(1).required(),
  charge: Joi.number().min(0).required(),
});

const createDeliveryAgencySchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  contactPerson: Joi.string().trim().allow("", null),
  phone: Joi.string().trim().allow("", null),
  email: Joi.string().trim().email({ tlds: false }).allow("", null),
  defaultCharge: Joi.number().min(0).required(),
  isActive: Joi.boolean(),
  stateRates: Joi.array().items(stateRateSchema).default([]),
});

const updateDeliveryAgencySchema = Joi.object({
  name: Joi.string().trim().min(1).max(100),
  contactPerson: Joi.string().trim().allow("", null),
  phone: Joi.string().trim().allow("", null),
  email: Joi.string().trim().email({ tlds: false }).allow("", null),
  defaultCharge: Joi.number().min(0),
  isActive: Joi.boolean(),
  stateRates: Joi.array().items(stateRateSchema),
});

module.exports = { createDeliveryAgencySchema, updateDeliveryAgencySchema };