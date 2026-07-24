const redis = require("../config/redis.config");

const MAX_ATTEMPTS = 3;
const WINDOW_SECONDS = 60; // 1 minute ke andar max 3 baar OTP maang sakta hai

const otpRateLimiter = async (req, res, next) => {
  try {
    const { email, phoneNumber } = req.body;
    const identifier = email || phoneNumber;

    if (!identifier) {
      return next(); // validation middleware/schema aage isko catch kar lega
    }

    const key = `otp_attempts:${identifier}`;
    const attempts = await redis.get(key);

    if (attempts && parseInt(attempts) >= MAX_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        message: "Too many OTP requests. Please try again after a minute.",
      });
    }

    await redis.incr(key);
    await redis.expire(key, WINDOW_SECONDS); // pehli baar hi expiry set hoti hai

    next();
  } catch (err) {
    // Agar Redis down ho jaye, poora OTP flow block nahi karna — bas aage jaane do
    console.error(`⚠️ Rate limiter error: ${err.message}`);
    next();
  }
};

module.exports = { otpRateLimiter };