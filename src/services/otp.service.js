const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const Otp = require("../models/otp.model");
const ApiError = require("../utils/apiError");
const { sendOtpEmail } = require("./email.service");
const { sendOtpSms } = require("./sms.service");

const OTP_EXPIRY_MINUTES = Number(process.env.OTP_EXPIRY_MINUTES) || 5;
const MAX_ATTEMPTS = 5;

/** Generates a random 6-digit numeric OTP. */
const generateOtpCode = () => crypto.randomInt(100000, 999999).toString();

/**
 * Creates a new OTP for the given identifier (email or phone), stores its
 * hash in the DB, and dispatches it over the correct channel.
 *
 * @param {string} identifier - the email address or phone number
 * @param {"email"|"phone"} channel - which channel to send the OTP over
 * @param {"registration"|"login"} purpose - why the OTP is being issued
 */
const createAndSendOtp = async (identifier, channel, purpose = "registration") => {
  const otpCode = generateOtpCode();
  const hashedOtp = await bcrypt.hash(otpCode, 10); // plain OTP is never stored

  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // Invalidate any previous, unused OTP for this identifier + purpose
  await Otp.deleteMany({ identifier, purpose, isVerified: false });

  await Otp.create({
    identifier,
    channel,
    purpose,
    otpCode: hashedOtp,
    expiresAt,
  });

  if (channel === "email") {
    await sendOtpEmail(identifier, otpCode, purpose);
  } else {
    await sendOtpSms(identifier, otpCode, purpose);
  }

  return true;
};

/**
 * Verifies a user-entered OTP against the latest unverified OTP record
 * for that identifier + purpose. Throws ApiError on any failure.
 *
 * @returns {Promise<string>} the channel ("email" | "phone") the OTP belonged to
 */
const verifyOtp = async (identifier, enteredOtp, purpose = "registration") => {
  const otpRecord = await Otp.findOne({ identifier, purpose, isVerified: false }).sort({
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

  return otpRecord.channel;
};
module.exports = { createAndSendOtp, verifyOtp };
