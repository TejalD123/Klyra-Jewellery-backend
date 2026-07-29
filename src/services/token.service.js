const jwt = require("jsonwebtoken");

/**
 * Generates a short-lived JWT access token for a user.
 * Payload kept minimal on purpose (id + role) to keep tokens small.
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.ACCESS_TOKEN_SECRET, // <-- ye undefined hai
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m" },
  );
};

/**
 * Generates a longer-lived JWT refresh token for a user.
 */
const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d" },
  );
};

/**
 * Verifies a refresh token and returns its decoded payload.
 * Throws a jwt error (caught upstream) if invalid/expired.
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
};

/**
 * Verifies an access token and returns its decoded payload.
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
};

/**
 * Issues a fresh access + refresh token pair for a user.
 */
const generateAuthTokens = (user) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  return { accessToken, refreshToken };
};
module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  verifyAccessToken,
  generateAuthTokens,
};
