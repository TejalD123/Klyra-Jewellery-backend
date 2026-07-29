const { createAndSendOtp, verifyOtp } = require("../services/otp.service");
const { sendOtpSchema, verifyOtpSchema } = require("../validations/otp.validation");

exports.sendEmailOTP = async (req, res, next) => {
  try {
    const { error, value } = sendOtpSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }
    const { email, purpose } = value;
    await createAndSendOtp(email, purpose || "registration");
    res.status(200).json({ success: true, message: `OTP sent to ${email}` });
  } catch (err) {
    next(err);
  }
};

exports.verifyEmailOTP = async (req, res, next) => {
  try {
    const { error, value } = verifyOtpSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }
    const { email, otpCode, purpose } = value;
    await verifyOtp(email, otpCode, purpose || "registration");
    res.status(200).json({ success: true, message: "OTP verified successfully" });
  } catch (err) {
    err.statusCode = 400;
    next(err);
  }
};