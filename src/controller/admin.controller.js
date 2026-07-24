const User = require("../models/user.model");
const Category = require("../models/category.model");
const Product = require("../models/product.model");
const Order = require("../models/order.model");
const ApiResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");

// ---------------------------------------------------------------------
// ADMIN: Dashboard overview
// GET /api/admin/dashboard
// ---------------------------------------------------------------------
const getDashboardStats = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalCategories,
    totalProducts,
    totalOrders,
    ordersByStatus,
    revenueResult,
    recentOrders,
    lowStockProducts,
  ] = await Promise.all([
    User.countDocuments({ role: "user" }),
    Category.countDocuments(),
    Product.countDocuments(),
    Order.countDocuments(),
    Order.aggregate([{ $group: { _id: "$orderStatus", count: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: { orderStatus: { $ne: "cancelled" } } },
      { $group: { _id: null, total: { $sum: "$pricing.totalAmount" } } },
    ]),
    Order.find().populate("user", "username email phone").sort({ createdAt: -1 }).limit(5),
    Product.find({ stock: { $lte: 5 }, isActive: true }).select("name stock").limit(10),
  ]);

  const statusCounts = ordersByStatus.reduce((acc, curr) => {
    acc[curr._id] = curr.count;
    return acc;
  }, {});

  const stats = {
    totalUsers,
    totalCategories,
    totalProducts,
    totalOrders,
    ordersByStatus: statusCounts,
    totalRevenue: revenueResult[0]?.total || 0,
    recentOrders,
    lowStockProducts,
  };

  return res.status(200).json(new ApiResponse(200, stats, "Dashboard stats fetched successfully."));
});
module.exports = { getDashboardStats };
