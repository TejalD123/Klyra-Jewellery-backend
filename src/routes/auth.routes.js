const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  register,
  verifyRegistrationOtp,
  login,
  verifyLoginOtp,
  resendOtp,
  refreshAccessToken,
  logout,
} = require("../controller/auth.controller");

const { protect } = require("../middleware/auth.middleware");

const {
  validateRequest,
  registerValidator,
  verifyRegistrationOtpValidator,
  loginValidator,
  verifyLoginOtpValidator,
  resendOtpValidator,
  refreshTokenValidator,
} = require("../middleware/validation.middleware");

const router = express.Router();

// Basic rate limiting on OTP-triggering endpoints to slow down abuse
const otpRequestLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please try again shortly." },
});

// ---------- Registration ----------
router.post("/register", otpRequestLimiter, registerValidator, validateRequest, register);
router.post(
  "/verify-registration-otp",
  verifyRegistrationOtpValidator,
  validateRequest,
  verifyRegistrationOtp
);

// ---------- Login ----------
router.post("/login", otpRequestLimiter, loginValidator, validateRequest, login);
router.post("/verify-login-otp", verifyLoginOtpValidator, validateRequest, verifyLoginOtp);

// ---------- Resend OTP ----------
router.post("/resend-otp", otpRequestLimiter, resendOtpValidator, validateRequest, resendOtp);

// ---------- Token refresh & logout ----------
router.post("/refresh-token", refreshTokenValidator, validateRequest, refreshAccessToken);
router.post("/logout", protect, logout);

module.exports = router;
