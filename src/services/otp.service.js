const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const Otp = require("../models/otp.model");
const ApiError = require("../utils/apiError");
const { sendOtpEmail } = require("./email.service");

const OTP_EXPIRY_MINUTES = Number(process.env.OTP_EXPIRY_MINUTES) || 5;
const MAX_ATTEMPTS = 5;

const generateOtpCode = () => crypto.randomInt(100000, 999999).toString();

/**
 * Email OTP only — phone verification is fully handled by Firebase now.
 */
const createAndSendOtp = async (email, purpose = "registration") => {
  const otpCode = generateOtpCode();
  const hashedOtp = await bcrypt.hash(otpCode, 10);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await Otp.deleteMany({ identifier: email, purpose, isVerified: false });

  await Otp.create({
    identifier: email,
    channel: "email",
    purpose,
    otpCode: hashedOtp,
    expiresAt,
  });

  await sendOtpEmail(email, otpCode, purpose);

  return true;
};

const verifyOtp = async (email, enteredOtp, purpose = "registration") => {
  const otpRecord = await Otp.findOne({ identifier: email, purpose, isVerified: false }).sort({
    createdAt: -1,
  });

  if (!otpRecord) {
    throw new ApiError(400, "OTP not found or already used. Please request a new one.");
  }
  if (otpRecord.expiresAt < new Date()) {
    throw new ApiError(400, "OTP has expired. Please request a new one.");
  }
  if (otpRecord.attempts >= MAX_ATTEMPTS) {
    throw new ApiError(429, "Too many incorrect attempts. Please request a new OTP.");
  }

  const isMatch = await bcrypt.compare(enteredOtp, otpRecord.otpCode);
  if (!isMatch) {
    otpRecord.attempts += 1;
    await otpRecord.save();
    throw new ApiError(400, "Incorrect OTP. Please try again.");
  }

  otpRecord.isVerified = true;
  await otpRecord.save();
  return true;
};

module.exports = { createAndSendOtp, verifyOtp };