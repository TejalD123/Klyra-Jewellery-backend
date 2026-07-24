const Joi = require("joi");

const sendOtpSchema = Joi.object({
  email: Joi.string().email().required(),
  purpose: Joi.string().valid("registration", "login", "password_reset").optional(),
});

const verifyOtpSchema = Joi.object({
  email: Joi.string().email().required(),
  otpCode: Joi.string().length(6).pattern(/^[0-9]+$/).required(),
  purpose: Joi.string().valid("registration", "login", "password_reset").optional(),
});

module.exports = { sendOtpSchema, verifyOtpSchema };