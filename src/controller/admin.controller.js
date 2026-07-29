const ApiResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { getDashboardStatsService, globalSearchService } = require("../services/admin.service");

const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await getDashboardStatsService();
  return res.status(200).json(new ApiResponse(200, stats, "Dashboard stats fetched successfully."));
});

const globalSearch = asyncHandler(async (req, res) => {
  const result = await globalSearchService(req.query.q);
  return res.status(200).json(new ApiResponse(200, result));
});

module.exports = { getDashboardStats, globalSearch };