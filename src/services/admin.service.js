const User = require("../models/user.model");
const Category = require("../models/category.model");
const Product = require("../models/product.model");
const Order = require("../models/order.model");

const getDashboardStatsService = async () => {
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

  return {
    totalUsers,
    totalCategories,
    totalProducts,
    totalOrders,
    ordersByStatus: statusCounts,
    totalRevenue: revenueResult[0]?.total || 0,
    recentOrders,
    lowStockProducts,
  };
};

const globalSearchService = async (q = "") => {
  const term = q.trim();
  if (term.length < 2) {
    return { products: [], categories: [], orders: [], users: [] };
  }

  const regex = { $regex: term, $options: "i" };
  const [products, categories, orders, users] = await Promise.all([
    Product.find({ $or: [{ name: regex }, { sku: regex }] })
      .select("name slug sku finalPrice images stock isActive")
      .limit(5),
    Category.find({ name: regex }).select("name slug isActive").limit(5),
    Order.find({ orderNumber: regex })
      .select("orderNumber orderStatus paymentStatus pricing.totalAmount createdAt")
      .limit(5),
    User.find({ $or: [{ username: regex }, { email: regex }, { phone: regex }] })
      .select("username email phone role")
      .limit(5),
  ]);

  return { products, categories, orders, users };
};

module.exports = { getDashboardStatsService, globalSearchService };