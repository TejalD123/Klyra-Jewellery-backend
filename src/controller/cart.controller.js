const ApiResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const {
  getOrCreateCart,
  getCartService,
  addItemToCartService,
  updateCartItemService,
  removeCartItemService,
  clearCartService,
} = require("../services/cart.service");

const getCart = asyncHandler(async (req, res) => {
  const cartData = await getCartService(req.user.id);
  return res.status(200).json(new ApiResponse(200, cartData));
});

const addItemToCart = asyncHandler(async (req, res) => {
  const cart = await addItemToCartService(req.user.id, req.body);
  return res.status(200).json(new ApiResponse(200, cart, "Item added to cart"));
});

const updateCartItem = asyncHandler(async (req, res) => {
  const cart = await updateCartItemService(req.user.id, req.params.itemId, req.body.quantity);
  return res.status(200).json(new ApiResponse(200, cart, "Cart item updated"));
});

const removeCartItem = asyncHandler(async (req, res) => {
  const cart = await removeCartItemService(req.user.id, req.params.itemId);
  return res.status(200).json(new ApiResponse(200, cart, "Item removed from cart"));
});

const clearCart = asyncHandler(async (req, res) => {
  const cart = await clearCartService(req.user.id);
  return res.status(200).json(new ApiResponse(200, cart, "Cart cleared"));
});

module.exports = {
  getCart,
  addItemToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  getOrCreateCart, // order.controller.js ko chahiye toh yahi se re-export
};