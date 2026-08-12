const express = require("express");
const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  toggleWishlist,
  clearWishlist,
} = require("../controller/wishlist.controller");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

// Every wishlist route needs a logged-in user — there's no "guest wishlist".
router.use(protect);

router.get("/", getWishlist);
router.post("/toggle/:productId", toggleWishlist);
router.post("/:productId", addToWishlist);
router.delete("/:productId", removeFromWishlist);
router.delete("/", clearWishlist);

module.exports = router;