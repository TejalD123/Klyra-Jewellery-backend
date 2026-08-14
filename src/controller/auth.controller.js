const User = require("../models/user.model");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { createAndSendOtp, verifyOtp } = require("../services/otp.service");
const { verifyFirebaseIdToken } = require("../services/firebase.service");
const {
  generateAuthTokens,
  verifyRefreshToken,
  generateAccessToken,
} = require("../services/token.service");

// Frontend (vercel.app) aur backend (onrender.com) alag domains hain,
// isliye har request "cross-site" hoti hai — sameSite:"none" + secure:true
// zaroori hai, warna browser refreshToken cookie ko kabhi bhejta hi nahi
// aur silent token-refresh hamesha fail hoke logout kar deta hai.
const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const issueAuthSession = async (user, res) => {
  const { accessToken, refreshToken } = generateAuthTokens(user);
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });
  res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);
  return { user: user.toSafeObject(), accessToken, refreshToken };
};

// TEMP: signup form doesn't collect a username field yet — auto-generate one
// until that's added. Replace this once a username input exists.
const generateUsername = (seed) => {
  const base =
    seed
      .split("@")[0]
      .replace(/[^a-zA-Z0-9]/g, "")
      .toLowerCase() || "user";
  return `${base}${Math.floor(1000 + Math.random() * 9000)}`;
};

// ---------------------------------------------------------------------
// REGISTER
//   Google path -> { idToken, provider: "google" }        (already verified by Firebase)
//   Phone path  -> { fullName, phone, idToken }            (1-step: Firebase already verified)
//   Email path  -> { fullName, email }                     (2-step: OTP sent, verified later)
// ---------------------------------------------------------------------
const register = asyncHandler(async (req, res) => {
  const { idToken, phone, fullName, email, username, provider } = req.body;

  // ===== Google Sign-In registration — ye block phone check se PEHLE hona chahiye =====
  if (idToken && provider === "google") {
    const decoded = await verifyFirebaseIdToken(idToken);

    let user = await User.findOne({ email: decoded.email });

    if (user && user.isEmailVerified) {
      const session = await issueAuthSession(user, res);
      return res
        .status(200)
        .json(new ApiResponse(200, session, "Login successful."));
    }

    if (!user) {
      user = await User.create({
        fullName: decoded.name || fullName,
        username: username || generateUsername(decoded.email),
        email: decoded.email,
        isEmailVerified: true,
      });
    } else {
      user.isEmailVerified = true;
      await user.save();
    }

    const session = await issueAuthSession(user, res);
    return res
      .status(201)
      .json(new ApiResponse(201, session, "Registration successful."));
  }

  // ===== Phone (Firebase) registration =====
  if (idToken) {
    const decoded = await verifyFirebaseIdToken(idToken);

    if (decoded.phone_number !== phone) {
      throw new ApiError(
        401,
        "Phone number does not match the verified Firebase token.",
      );
    }

    let user = await User.findOne({ phone });

    if (user && user.isPhoneVerified) {
      const session = await issueAuthSession(user, res);
      return res
        .status(200)
        .json(new ApiResponse(200, session, "Login successful."));
    }

    if (!user) {
      user = await User.create({
        fullName,
        username: username || generateUsername(phone),
        phone,
        isPhoneVerified: true,
      });
    } else {
      user.isPhoneVerified = true;
      await user.save();
    }

    const session = await issueAuthSession(user, res);
    return res
      .status(201)
      .json(new ApiResponse(201, session, "Registration successful."));
  }

  // ===== Email registration (2-step: create unverified user, send OTP) =====
  if (!email) {
    throw new ApiError(400, "Email or a verified phone/Google token is required.");
  }
  if (!fullName) {
    throw new ApiError(400, "Full name is required.");
  }

  let user = await User.findOne({ email });

  if (user && user.isEmailVerified) {
    throw new ApiError(409, "An account with this email already exists. Please log in instead.");
  }

  if (!user) {
    // Not verified yet, so it's safe to create — verifyRegistrationOtp will
    // flip isEmailVerified to true once the OTP is confirmed.
    user = await User.create({
      fullName,
      username: username || generateUsername(email),
      email,
      isEmailVerified: false,
    });
  }
  // else: user already exists but never verified — just resend the OTP below,
  // no need to create a duplicate record.

  await createAndSendOtp(email, "registration");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { channel: "email", email },
        "An OTP has been sent to your email. Please verify to complete registration.",
      ),
    );
});

// ---------------------------------------------------------------------
// VERIFY REGISTRATION OTP — email only (phone never reaches this endpoint)
// ---------------------------------------------------------------------
const verifyRegistrationOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, "No pending registration found for this email.");
  }

  await verifyOtp(email, otp, "registration");

  user.isEmailVerified = true;
  await user.save();

  const session = await issueAuthSession(user, res);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        session,
        "Account verified successfully. You are now logged in.",
      ),
    );
});

// ---------------------------------------------------------------------
// LOGIN
//   Email path -> { email }            (2-step: sends OTP)
//   Phone path -> { phone, idToken }   (1-step: Firebase already verified)
// ---------------------------------------------------------------------
const login = asyncHandler(async (req, res) => {
  const { idToken, phone, email } = req.body;

  // ===== Phone (Firebase) login =====
  if (idToken) {
    const decoded = await verifyFirebaseIdToken(idToken);

    if (decoded.phone_number !== phone) {
      throw new ApiError(
        401,
        "Phone number does not match the verified Firebase token.",
      );
    }

    const user = await User.findOne({ phone, isPhoneVerified: true });
    if (!user) {
      throw new ApiError(404, "No account found with this phone number.");
    }

    const session = await issueAuthSession(user, res);
    return res
      .status(200)
      .json(new ApiResponse(200, session, "Login successful."));
  }

  // ===== Email login (unchanged) =====
  if (!email) {
    throw new ApiError(400, "Email is required.");
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, "No account found with this email.");
  }
  if (!user.isEmailVerified) {
    throw new ApiError(403, "Please verify your email before logging in.");
  }

  await createAndSendOtp(email, "login");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { channel: "email" },
        "An OTP has been sent to your email.",
      ),
    );
});

// ---------------------------------------------------------------------
// VERIFY LOGIN OTP — email only
// ---------------------------------------------------------------------
const verifyLoginOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email }).select("+refreshToken");
  if (!user) {
    throw new ApiError(404, "No account found with this email.");
  }

  await verifyOtp(email, otp, "login");

  const session = await issueAuthSession(user, res);

  return res
    .status(200)
    .json(new ApiResponse(200, session, "Login successful."));
});

// ---------------------------------------------------------------------
// RESEND OTP — email only (phone "resend" is just calling Firebase's
// sendPhoneOTP again on the frontend, no backend call needed)
// ---------------------------------------------------------------------
const resendOtp = asyncHandler(async (req, res) => {
  const { email, purpose } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, "No account found with this email.");
  }

  await createAndSendOtp(email, purpose);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { channel: "email" },
        "A new OTP has been sent to your email.",
      ),
    );
});

// ---------------------------------------------------------------------
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;
  if (!incomingRefreshToken)
    throw new ApiError(401, "Refresh token is required.");

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
    .json(
      new ApiResponse(
        200,
        { accessToken },
        "Access token refreshed successfully.",
      ),
    );
});

const logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } });
  res.clearCookie("refreshToken", refreshTokenCookieOptions);
  return res
    .status(200)
    .json(new ApiResponse(200, null, "Logged out successfully."));
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
