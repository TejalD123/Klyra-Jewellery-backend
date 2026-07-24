const User = require("../models/user.model");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const { verifyAccessToken } = require("../services/token.service");

/**
 * Protects a route by requiring a valid JWT access token in the
 * "Authorization: Bearer <token>" header. Attaches the authenticated
 * user document to req.user.
 */
const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    throw new ApiError(401, "Not authorized. No access token provided.");
  }

  const token = authHeader.split(" ")[1];

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (error) {
    throw new ApiError(401, "Access token is invalid or has expired.");
  }

  const user = await User.findById(decoded.id);

  if (!user) {
    throw new ApiError(401, "User belonging to this token no longer exists.");
  }

  req.user = user;
  next();
});

/**
 * Restricts a route to specific roles.
 * Usage: router.get("/admin-only", protect, restrictTo("admin"), handler)
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ApiError(403, "You do not have permission to perform this action.");
    }
    next();
  };
};

module.exports = { protect, restrictTo };
