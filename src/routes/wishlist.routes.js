const express = require("express");
const router = express.Router();

const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  toggleWishlist,
  clearWishlist,
} = require("./wishlist.controller");

// Adjust this import to match your actual auth middleware location/name
const { protect } = require("../../middlewares/auth.middleware");

// All wishlist routes require a logged-in user
router.use(protect);

router.get("/", getWishlist);
router.post("/toggle/:productId", toggleWishlist);
router.post("/:productId", addToWishlist);
router.delete("/:productId", removeFromWishlist);
router.delete("/", clearWishlist);

module.exports = router;