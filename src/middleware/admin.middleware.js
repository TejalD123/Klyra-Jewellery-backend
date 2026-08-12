const { body, validationResult } = require("express-validator");
const ApiError = require("../utils/apiError");

const validateAdminRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, "Validation failed", errors.array());
  }
  next();
};

const categoryValidator = [
  body("name").trim().notEmpty().withMessage("Category name is required"),
];

const productValidator = [
  body("name").trim().notEmpty().withMessage("Product name is required"),
  body("price").isFloat({ min: 0 }).withMessage("Price must be a positive number"),
  body("category").notEmpty().withMessage("Category is required"),
  body("stock").optional().isInt({ min: 0 }).withMessage("Stock must be a non-negative integer"),
];

const orderStatusValidator = [
  body("orderStatus")
    .isIn(["placed", "confirmed", "processing", "packed", "shipped", "out_for_delivery", "delivered", "cancelled"])
    .withMessage("Invalid order status"),
];

module.exports = {
  validateAdminRequest,
  categoryValidator,
  productValidator,
  orderStatusValidator,
};