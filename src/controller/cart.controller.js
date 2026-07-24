const mongoose = require("mongoose");
const Cart = require("../models/cart.model");
const Product = require("../models/product.model");
const ApiResponse = require("../utils/apiResponse");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");

// Internal helper: get existing cart or create an empty one for the user
const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  return cart;
};

/**
 * @desc    Get logged-in user's cart (with live product details + price-change flags)
 * @route   GET /api/cart
 * @access  Private
 */
const getCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user.id }).populate({
    path: "items.product",
    select: "name images finalPrice stock isActive metalType",
  });

  if (!cart || cart.items.length === 0) {
    return res
      .status(200)
      .json(new ApiResponse(200, { items: [], totalItems: 0, totalAmount: 0 }));
  }

  // Flag items whose price changed since add-time, or that went out of stock
  const items = cart.items.map((item) => {
    const product = item.product;
    const priceChanged =
      product && product.finalPrice !== item.priceAtAddTime;
    const outOfStock = !product || !product.isActive || product.stock < item.quantity;

    return {
      _id: item._id,
      product,
      quantity: item.quantity,
      size: item.size,
      priceAtAddTime: item.priceAtAddTime,
      currentPrice: product ? product.finalPrice : null,
      priceChanged,
      outOfStock,
      lineTotal: item.priceAtAddTime * item.quantity,
    };
  });

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalAmount = items.reduce((sum, i) => sum + i.lineTotal, 0);

  return res
    .status(200)
    .json(new ApiResponse(200, { _id: cart._id, items, totalItems, totalAmount }));
});

/**
 * @desc    Add an item to cart (increments quantity if same product+size exists)
 * @route   POST /api/cart/items
 * @access  Private
 */
const addItemToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1, size = "" } = req.body;

  const product = await Product.findById(productId);
  if (!product) throw ApiError.notFound("Product not found");
  if (!product.isActive) throw ApiError.badRequest("This product is currently unavailable");
  if (product.stock < quantity) {
    throw ApiError.badRequest(`Only ${product.stock} unit(s) in stock`);
  }

  const cart = await getOrCreateCart(req.user.id);

  const existingItem = cart.items.find(
    (item) =>
      item.product.toString() === productId && (item.size || "") === (size || "")
  );

  if (existingItem) {
    const newQty = existingItem.quantity + quantity;
    if (product.stock < newQty) {
      throw ApiError.badRequest(`Only ${product.stock} unit(s) in stock`);
    }
    existingItem.quantity = newQty;
    existingItem.priceAtAddTime = product.finalPrice; // refresh price snapshot
  } else {
    cart.items.push({
      product: productId,
      quantity,
      size,
      priceAtAddTime: product.finalPrice,
    });
  }

  await cart.save();

  return res
    .status(200)
    .json(new ApiResponse(200, cart, "Item added to cart"));
});

/**
 * @desc    Update quantity of a specific cart item
 * @route   PUT /api/cart/items/:itemId
 * @access  Private
 */
const updateCartItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const { quantity } = req.body;

  const cart = await Cart.findOne({ user: req.user.id });
  if (!cart) throw ApiError.notFound("Cart not found");

  const item = cart.items.id(itemId);
  if (!item) throw ApiError.notFound("Cart item not found");

  const product = await Product.findById(item.product);
  if (!product) throw ApiError.notFound("Product no longer exists");
  if (product.stock < quantity) {
    throw ApiError.badRequest(`Only ${product.stock} unit(s) in stock`);
  }

  item.quantity = quantity;
  await cart.save();

  return res
    .status(200)
    .json(new ApiResponse(200, cart, "Cart item updated"));
});

/**
 * @desc    Remove a single item from cart
 * @route   DELETE /api/cart/items/:itemId
 * @access  Private
 */
const removeCartItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;

  const cart = await Cart.findOne({ user: req.user.id });
  if (!cart) throw ApiError.notFound("Cart not found");

  const item = cart.items.id(itemId);
  if (!item) throw ApiError.notFound("Cart item not found");

  item.deleteOne();
  await cart.save();

  return res
    .status(200)
    .json(new ApiResponse(200, cart, "Item removed from cart"));
});

/**
 * @desc    Clear entire cart
 * @route   DELETE /api/cart
 * @access  Private
 */
const clearCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user.id });
  if (!cart) throw ApiError.notFound("Cart not found");

  cart.items = [];
  await cart.save();

  return res.status(200).json(new ApiResponse(200, cart, "Cart cleared"));
});

module.exports = {
  getCart,
  addItemToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  getOrCreateCart, // exported for order.controller.js to reuse at checkout
};