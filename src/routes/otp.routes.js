const express = require("express");
const router = express.Router();

const { sendEmailOTP, verifyEmailOTP } = require("../controller/otp.controller");
const { otpRateLimiter } = require("../middleware/Ratelimiter.middleware");

// otpRateLimiter Redis se check karta hai — spam OTP request rokne ke liye
router.post("/send-email", otpRateLimiter, sendEmailOTP);
router.post("/verify-email", verifyEmailOTP);

module.exports = router;