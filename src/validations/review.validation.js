const Joi = require("joi");

const createReviewSchema = Joi.object({
  name: Joi.string().trim().min(1).max(60).required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().trim().max(1000).allow("", null),
});

module.exports = { createReviewSchema };