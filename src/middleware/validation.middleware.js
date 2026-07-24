const { body, validationResult } = require("express-validator");
const ApiError = require("../utils/apiError");

/**
 * Runs after every *Validator array (express-validator). Collects
 * express-validator errors and throws a single ApiError if anything failed.
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, "Validation failed", errors.array());
  }
  next();
};

/**
 * Generic Joi-schema validator middleware factory.
 * Usage: router.post("/", validateSchema(someJoiSchema), controllerFn)
 */
const validateSchema = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details.map((err) => err.message),
      });
    }

    req.body = value;
    next();
  };
};

// Shared "channel" field used across almost every auth endpoint.
const channelField = body("channel")
  .isIn(["email", "phone"])
  .withMessage("channel must be either 'email' or 'phone'");

const registerValidator = [
  body("username")
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters")
    .matches(/^[a-zA-Z0-9_.]+$/)
    .withMessage("Username can only contain letters, numbers, underscores and dots"),
  body("email").trim().isEmail().withMessage("A valid email is required").normalizeEmail(),
  body("phone").trim().notEmpty().withMessage("Phone number is required"),
  channelField,
];

const verifyRegistrationOtpValidator = [
  body("identifier").trim().notEmpty().withMessage("identifier is required"),
  body("otp").trim().isLength({ min: 6, max: 6 }).withMessage("OTP must be exactly 6 digits"),
  channelField,
];

const loginValidator = [
  body("identifier").trim().notEmpty().withMessage("identifier is required"),
  channelField,
];

const verifyLoginOtpValidator = [
  body("identifier").trim().notEmpty().withMessage("identifier is required"),
  body("otp").trim().isLength({ min: 6, max: 6 }).withMessage("OTP must be exactly 6 digits"),
  channelField,
];

const resendOtpValidator = [
  body("identifier").trim().notEmpty().withMessage("identifier is required"),
  channelField,
  body("purpose")
    .isIn(["registration", "login"])
    .withMessage("purpose must be either 'registration' or 'login'"),
];

// Refresh token normally arrives via the httpOnly cookie, so the body
// field is optional; this validator exists mainly to keep the route
// signature consistent with the others.
const refreshTokenValidator = [
  body("refreshToken").optional().isString(),
];

module.exports = {
  validateRequest,
  validateSchema,
  registerValidator,
  verifyRegistrationOtpValidator,
  loginValidator,
  verifyLoginOtpValidator,
  resendOtpValidator,
  refreshTokenValidator,
};
