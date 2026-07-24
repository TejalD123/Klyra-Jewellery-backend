const User = require("../models/user.model");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { createAndSendOtp, verifyOtp } = require("../services/otp.service");
const {
  generateAuthTokens,
  verifyRefreshToken,
  generateAccessToken,
} = require("../services/token.service");

/**
 * Common cookie options for the refresh token cookie.
 */
const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/**
 * Issues tokens for a user, persists the refresh token, sets the
 * refresh-token cookie, and returns the safe user object + access token.
 */
const issueAuthSession = async (user, res) => {
  const { accessToken, refreshToken } = generateAuthTokens(user);

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);

  return {
    user: user.toSafeObject(),
    accessToken,
    refreshToken,
  };
};

// ---------------------------------------------------------------------
// 1. Register (username + email + phone, no password, no fullName)
// fullName is collected later via the profile-update step, not here.
// POST /api/auth/register
// body: { username, email, phone, channel: "email"|"phone" }
// ---------------------------------------------------------------------
const register = asyncHandler(async (req, res) => {
  const { username, email, phone, channel } = req.body;

  const existingUser = await User.findOne({ $or: [{ email }, { phone }, { username }] });

  if (existingUser) {
    const alreadyActive = existingUser.isEmailVerified || existingUser.isPhoneVerified;

    if (alreadyActive) {
      throw new ApiError(409, "An account with this email, phone, or username already exists. Please log in.");
    }

    // Started registration before but never verified -> update details & resend OTP
    existingUser.username = username;
    existingUser.email = email;
    existingUser.phone = phone;
    await existingUser.save();

    const identifier = channel === "phone" ? phone : email;
    await createAndSendOtp(identifier, channel, "registration");

    return res
      .status(200)
      .json(new ApiResponse(200, { channel }, `OTP resent to your ${channel}.`));
  }

  await User.create({ username, email, phone });

  const identifier = channel === "phone" ? phone : email;
  await createAndSendOtp(identifier, channel, "registration");

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { channel },
        `Registration successful. An OTP has been sent to your ${channel} for verification.`
      )
    );
});

// ---------------------------------------------------------------------
// 2. Verify Registration OTP -> activates account & logs the user in
// POST /api/auth/verify-registration-otp
// body: { identifier, otp, channel: "email"|"phone" }
// ---------------------------------------------------------------------
const verifyRegistrationOtp = asyncHandler(async (req, res) => {
  const { identifier, otp, channel } = req.body;

  const query = channel === "phone" ? { phone: identifier } : { email: identifier };
  const user = await User.findOne(query);

  if (!user) {
    throw new ApiError(404, `No pending registration found for this ${channel}.`);
  }

  await verifyOtp(identifier, otp, "registration");

  if (channel === "phone") {
    user.isPhoneVerified = true;
  } else {
    user.isEmailVerified = true;
  }
  await user.save();

  const session = await issueAuthSession(user, res);

  return res
    .status(200)
    .json(new ApiResponse(200, session, "Account verified successfully. You are now logged in."));
});

// ---------------------------------------------------------------------
// 3. Login - step 1: request an OTP for an existing, verified account
// POST /api/auth/login
// body: { identifier, channel: "email"|"phone" }
// ---------------------------------------------------------------------
const login = asyncHandler(async (req, res) => {
  const { identifier, channel } = req.body;

  const query = channel === "phone" ? { phone: identifier } : { email: identifier };
  const user = await User.findOne(query);

  if (!user) {
    throw new ApiError(404, `No account found with this ${channel}.`);
  }

  const isVerified = channel === "phone" ? user.isPhoneVerified : user.isEmailVerified;
  if (!isVerified) {
    throw new ApiError(403, `Please verify your ${channel} before logging in.`);
  }

  await createAndSendOtp(identifier, channel, "login");

  return res
    .status(200)
    .json(new ApiResponse(200, { channel }, `An OTP has been sent to your ${channel}.`));
});

// ---------------------------------------------------------------------
// 4. Login - step 2: verify OTP & issue session
// POST /api/auth/verify-login-otp
// body: { identifier, otp, channel: "email"|"phone" }
// ---------------------------------------------------------------------
const verifyLoginOtp = asyncHandler(async (req, res) => {
  const { identifier, otp, channel } = req.body;

  const query = channel === "phone" ? { phone: identifier } : { email: identifier };
  const user = await User.findOne(query).select("+refreshToken");

  if (!user) {
    throw new ApiError(404, `No account found with this ${channel}.`);
  }

  await verifyOtp(identifier, otp, "login");

  const session = await issueAuthSession(user, res);

  return res.status(200).json(new ApiResponse(200, session, "Login successful."));
});

// ---------------------------------------------------------------------
// 5. Resend OTP (works for both "registration" and "login" purposes)
// POST /api/auth/resend-otp
// body: { identifier, channel: "email"|"phone", purpose: "registration"|"login" }
// ---------------------------------------------------------------------
const resendOtp = asyncHandler(async (req, res) => {
  const { identifier, channel, purpose } = req.body;

  const query = channel === "phone" ? { phone: identifier } : { email: identifier };
  const user = await User.findOne(query);

  if (!user) {
    throw new ApiError(404, `No account found with this ${channel}.`);
  }

  await createAndSendOtp(identifier, channel, purpose);

  return res
    .status(200)
    .json(new ApiResponse(200, { channel }, `A new OTP has been sent to your ${channel}.`));
});

// ---------------------------------------------------------------------
// Bonus: Refresh Access Token
// POST /api/auth/refresh-token
// ---------------------------------------------------------------------
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh token is required.");
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(incomingRefreshToken);
  } catch (error) {
    throw new ApiError(401, "Refresh token is invalid or has expired.");
  }

  const user = await User.findById(decoded.id).select("+refreshToken");

  if (!user || user.refreshToken !== incomingRefreshToken) {
    throw new ApiError(401, "Refresh token is invalid or has been revoked.");
  }

  const accessToken = generateAccessToken(user);

  return res
    .status(200)
    .json(new ApiResponse(200, { accessToken }, "Access token refreshed successfully."));
});

// ---------------------------------------------------------------------
// Bonus: Logout
// POST /api/auth/logout
// ---------------------------------------------------------------------
const logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } });

  res.clearCookie("refreshToken", refreshTokenCookieOptions);

  return res.status(200).json(new ApiResponse(200, null, "Logged out successfully."));
});
module.exports = {
  register,
  verifyRegistrationOtp,
  login,
  verifyLoginOtp,
  resendOtp,
  refreshAccessToken,
  logout,
};
