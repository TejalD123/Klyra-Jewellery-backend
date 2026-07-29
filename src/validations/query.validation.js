const Joi = require("joi");

// Public — customer submits the contact/enquiry form
const createQuerySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().trim().email().required(),
  phone: Joi.string().trim().max(20).allow("", null),
  subject: Joi.string().trim().max(150).allow("", null),
  message: Joi.string().trim().min(5).max(2000).required(),
});

// Admin — responding to a query (marks it resolved)
const respondToQuerySchema = Joi.object({
  response: Joi.string().trim().min(2).max(2000).required(),
});

// Admin — moving a query through the workflow without necessarily responding yet
const updateQueryStatusSchema = Joi.object({
  status: Joi.string().valid("new", "in_progress", "resolved").required(),
});

module.exports = {
  createQuerySchema,
  respondToQuerySchema,
  updateQueryStatusSchema,
};