const Cart = require("../models/cart.model");
const Product = require("../models/product.model");
const ApiError = require("../utils/apiError");

const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) cart = await Cart.create({ user: userId, items: [] });
  return cart;
};

const getCartService = async (userId) => {
  const cart = await Cart.findOne({ user: userId }).populate({
    path: "items.product",
    select: "name images finalPrice stock isActive metalType",
  });

  if (!cart || cart.items.length === 0) {
    return { items: [], totalItems: 0, totalAmount: 0 };
  }

  const items = cart.items.map((item) => {
    const product = item.product;
    const priceChanged = product && product.finalPrice !== item.priceAtAddTime;
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

  return { _id: cart._id, items, totalItems, totalAmount };
};

const addItemToCartService = async (userId, { productId, quantity = 1, size = "" }) => {
  const product = await Product.findById(productId);
  if (!product) throw ApiError.notFound("Product not found");
  if (!product.isActive) throw ApiError.badRequest("This product is currently unavailable");
  if (product.stock < quantity) throw ApiError.badRequest(`Only ${product.stock} unit(s) in stock`);

  const cart = await getOrCreateCart(userId);

  const existingItem = cart.items.find(
    (item) => item.product.toString() === productId && (item.size || "") === (size || "")
  );

  if (existingItem) {
    const newQty = existingItem.quantity + quantity;
    if (product.stock < newQty) throw ApiError.badRequest(`Only ${product.stock} unit(s) in stock`);
    existingItem.quantity = newQty;
    existingItem.priceAtAddTime = product.finalPrice;
  } else {
    cart.items.push({ product: productId, quantity, size, priceAtAddTime: product.finalPrice });
  }

  await cart.save();
  return cart;
};

const updateCartItemService = async (userId, itemId, quantity) => {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) throw ApiError.notFound("Cart not found");

  const item = cart.items.id(itemId);
  if (!item) throw ApiError.notFound("Cart item not found");

  const product = await Product.findById(item.product);
  if (!product) throw ApiError.notFound("Product no longer exists");
  if (product.stock < quantity) throw ApiError.badRequest(`Only ${product.stock} unit(s) in stock`);

  item.quantity = quantity;
  await cart.save();
  return cart;
};

const removeCartItemService = async (userId, itemId) => {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) throw ApiError.notFound("Cart not found");

  const item = cart.items.id(itemId);
  if (!item) throw ApiError.notFound("Cart item not found");

  item.deleteOne();
  await cart.save();
  return cart;
};

const clearCartService = async (userId) => {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) throw ApiError.notFound("Cart not found");

  cart.items = [];
  await cart.save();
  return cart;
};

module.exports = {
  getOrCreateCart, // order.service.js reuse karega checkout ke time
  getCartService,
  addItemToCartService,
  updateCartItemService,
  removeCartItemService,
  clearCartService,
};