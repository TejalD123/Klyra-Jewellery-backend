const ApiResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { updateMeService } = require("../services/user.service");

const getMe = asyncHandler(async (req, res) => {
  return res.status(200).json(new ApiResponse(200, req.user.toSafeObject(), "Profile fetched successfully."));
});

const updateMe = asyncHandler(async (req, res) => {
  const user = await updateMeService(req.user, req.body);
  return res.status(200).json(new ApiResponse(200, user.toSafeObject(), "Profile updated successfully."));
});

module.exports = { getMe, updateMe };