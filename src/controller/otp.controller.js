const { createAndSendOtp, verifyOtp } = require("../services/otp.service");
const { sendOtpSchema, verifyOtpSchema } = require("../validations/otp.validation");

// POST /api/v1/otp/send-email
exports.sendEmailOTP = async (req, res, next) => {
  try {
    const { error, value } = sendOtpSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const { email, purpose } = value;
    await createAndSendOtp(email, "email", purpose || "registration");

    res.status(200).json({
      success: true,
      message: `OTP sent to ${email}`,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/otp/verify-email
exports.verifyEmailOTP = async (req, res, next) => {
  try {
    const { error, value } = verifyOtpSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const { email, otpCode, purpose } = value;
    await verifyOtp(email, otpCode, purpose || "registration");

    // Note: yaha verify hone ke baad, auth.controller aage user create/login
    // karega — yeh controller sirf OTP check karta hai, user session nahi banata
    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (err) {
    err.statusCode = 400; // OTP galat/expire — client error hai, server error nahi
    next(err);
  }
};
