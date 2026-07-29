const { body, validationResult } = require("express-validator");
const ApiError = require("../utils/apiError");

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, "Validation failed", errors.array());
  }
  next();
};

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

// ---------------------------------------------------------------------
// REGISTER
//   Email path -> { fullName, email }
//   Phone path -> { fullName, phone, idToken }
// Exactly one of email / idToken must be present.
// ---------------------------------------------------------------------
const registerValidator = [
  body("fullName")
    .if((value, { req }) => req.body.provider !== "google")
    .trim()
    .notEmpty()
    .withMessage("Full name is required"),

  body("email")
    .if(body("idToken").not().exists())
    .trim()
    .isEmail()
    .withMessage("A valid email is required")
    .normalizeEmail(),

  body("idToken")
    .if(body("email").not().exists())
    .notEmpty()
    .withMessage("Firebase idToken is required for phone registration"),

  body("phone")
    .if((value, { req }) => req.body.idToken && req.body.provider !== "google")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required when using idToken"),

  body().custom((value) => {
    if (!value.email && !value.idToken) {
      throw new Error("Either email or idToken (with phone) is required");
    }
    return true;
  }),
];

// ---------------------------------------------------------------------
// VERIFY REGISTRATION OTP — email only (phone never hits this endpoint,
// Firebase verifies phone client-side before /register is even called)
// ---------------------------------------------------------------------
const verifyRegistrationOtpValidator = [
  body("email").trim().isEmail().withMessage("A valid email is required").normalizeEmail(),
  body("otp").trim().isLength({ min: 6, max: 6 }).withMessage("OTP must be exactly 6 digits"),
];

// ---------------------------------------------------------------------
// LOGIN
//   Email path -> { email }
//   Phone path -> { phone, idToken }
// ---------------------------------------------------------------------
const loginValidator = [
  body("email")
    .if(body("idToken").not().exists())
    .trim()
    .isEmail()
    .withMessage("A valid email is required")
    .normalizeEmail(),

  body("idToken")
    .if(body("email").not().exists())
    .notEmpty()
    .withMessage("Firebase idToken is required for phone login"),

  body("phone")
    .if(body("idToken").exists())
    .trim()
    .notEmpty()
    .withMessage("Phone number is required when using idToken"),

  body().custom((value) => {
    if (!value.email && !value.idToken) {
      throw new Error("Either email or idToken (with phone) is required");
    }
    return true;
  }),
];

// ---------------------------------------------------------------------
// VERIFY LOGIN OTP — email only
// ---------------------------------------------------------------------
const verifyLoginOtpValidator = [
  body("email").trim().isEmail().withMessage("A valid email is required").normalizeEmail(),
  body("otp").trim().isLength({ min: 6, max: 6 }).withMessage("OTP must be exactly 6 digits"),
];

// ---------------------------------------------------------------------
// RESEND OTP — email only (phone resend just calls Firebase again
// client-side, no backend endpoint involved)
// ---------------------------------------------------------------------
const resendOtpValidator = [
  body("email").trim().isEmail().withMessage("A valid email is required").normalizeEmail(),
  body("purpose")
    .isIn(["registration", "login"])
    .withMessage("purpose must be either 'registration' or 'login'"),
];

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