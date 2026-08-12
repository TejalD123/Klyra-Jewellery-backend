const ApiResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { updateMeService } = require("../services/user.service");
const User = require("../models/user.model"); // ⚠️ adjust path if different

const getMe = asyncHandler(async (req, res) => {
  return res.status(200).json(new ApiResponse(200, req.user.toSafeObject(), "Profile fetched successfully."));
});

const updateMe = asyncHandler(async (req, res) => {
  const user = await updateMeService(req.user, req.body);
  return res.status(200).json(new ApiResponse(200, user.toSafeObject(), "Profile updated successfully."));
});

// Admin: paginated list of users, name/email/phone search
const getAllUsers = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 20);
  const search = (req.query.search || "").trim();

  const filter = { role: "user" }; // admins ka list nahi dakhवायचं
  if (search) {
    filter.$or = [
      { fullName: { $regex: search, $options: "i" } },
      { username: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
    ];
  }

  const total = await User.countDocuments(filter);
  const users = await User.find(filter)
    .select("-refreshToken -__v")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  return res.status(200).json(
    new ApiResponse(200, {
      users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }, "Users fetched successfully.")
  );
});

module.exports = { getMe, updateMe, getAllUsers };