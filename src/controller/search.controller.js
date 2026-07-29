const Product = require("../models/product.model");
const Category = require("../models/category.model");
const Order = require("../models/order.model");
const User = require("../models/user.model");
const ApiResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");

/**
 * @desc    Global admin quick-search — topbar search bar. Returns a small,
 *          capped set of matches per collection rather than one giant list.
 * @route   GET /api/admin/search?q=
 * @access  Admin
 *
 * NOTE: uses case-insensitive regex (substring match) rather than the
 * $text indexes on Product/Category, since a topbar "search as you type"
 * needs partial-word matches (e.g. "nec" -> "Necklace"), which $text
 * doesn't do well. User fields (username/email/phone) are the same ones
 * already trusted elsewhere in this codebase via
 * `.populate("user", "username email phone")` in order.controller.js —
 * I haven't seen user.model.js itself, so nothing beyond those three
 * fields is assumed here.
 */
const globalSearch = asyncHandler(async (req, res) => {
  const { q = "" } = req.query;
  const term = q.trim();

  if (term.length < 2) {
    return res.status(200).json(
      new ApiResponse(200, { products: [], categories: [], orders: [], users: [] })
    );
  }

  const regex = { $regex: term, $options: "i" };

  const [products, categories, orders, users] = await Promise.all([
    Product.find({ $or: [{ name: regex }, { sku: regex }] })
      .select("name slug sku finalPrice images stock isActive")
      .limit(5),
    Category.find({ name: regex })
      .select("name slug isActive")
      .limit(5),
    Order.find({ orderNumber: regex })
      .select("orderNumber orderStatus paymentStatus pricing.totalAmount createdAt")
      .limit(5),
    User.find({ $or: [{ username: regex }, { email: regex }, { phone: regex }] })
      .select("username email phone role")
      .limit(5),
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, { products, categories, orders, users }));
});

module.exports = { globalSearch };