const ApiResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");

// ---------------------------------------------------------------------
// Get the currently logged-in user's profile
// GET /api/users/me
// ---------------------------------------------------------------------
const getMe = asyncHandler(async (req, res) => {
  return res.status(200).json(new ApiResponse(200, req.user.toSafeObject(), "Profile fetched successfully."));
});

// ---------------------------------------------------------------------
// Update the currently logged-in user's profile (fullName, for now).
// This is where fullName gets set since it's no longer collected
// during registration.
// PATCH /api/users/me
// body: { fullName }
// ---------------------------------------------------------------------
const updateMe = asyncHandler(async (req, res) => {
  const { fullName } = req.body;

  if (fullName !== undefined) {
    req.user.fullName = fullName;
  }

  await req.user.save();

  return res.status(200).json(new ApiResponse(200, req.user.toSafeObject(), "Profile updated successfully."));
});
module.exports = { getMe, updateMe };
