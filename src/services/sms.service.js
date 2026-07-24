const twilio = require("twilio");
const ApiError = require("../utils/apiError");

/**
 * Twilio client, configured from environment variables. Any SMS provider
 * (Twilio, MSG91, AWS SNS, etc.) can be swapped in here as long as
 * sendOtpSms keeps the same signature.
 */
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

/**
 * Builds the SMS body for the given OTP purpose.
 */
const buildOtpMessage = (otp, purpose) => {
  const expiryMinutes = process.env.OTP_EXPIRY_MINUTES || 5;

  if (purpose === "login") {
    return `Your Klyra Jewellery login OTP is ${otp}. It expires in ${expiryMinutes} minutes. Do not share it with anyone.`;
  }

  return `Your Klyra Jewellery verification OTP is ${otp}. It expires in ${expiryMinutes} minutes. Do not share it with anyone.`;
};

/**
 * Sends an OTP SMS to the given phone number for the given purpose
 * ("registration" | "login").
 */
const sendOtpSms = async (toPhone, otp, purpose = "registration") => {
  try {
    await client.messages.create({
      body: buildOtpMessage(otp, purpose),
      from: process.env.TWILIO_PHONE_NUMBER,
      to: toPhone,
    });
  } catch (error) {
    console.error("Failed to send OTP SMS:", error.message);
    throw new ApiError(500, "Failed to send OTP SMS. Please try again later.");
  }
};
module.exports = { sendOtpSms };
