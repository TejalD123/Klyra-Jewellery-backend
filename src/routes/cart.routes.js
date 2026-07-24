const express = require("express");
const router = express.Router();

const {
  getCart,
  addItemToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} = require("../controller/cart.controller");

const { protect } = require("../middleware/auth.middleware");
const { validateSchema } = require("../middleware/validation.middleware");
const { addItemSchema, updateItemSchema } = require("../validations/cart.validation");

router.use(protect); // every cart route needs a logged-in user

router.get("/", getCart);
router.post("/items", validateSchema(addItemSchema), addItemToCart);
router.put("/items/:itemId", validateSchema(updateItemSchema), updateCartItem);
router.delete("/items/:itemId", removeCartItem);
router.delete("/", clearCart);

module.exports = router;