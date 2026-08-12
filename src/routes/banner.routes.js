const express = require("express");
const router = express.Router();

const { getActiveBanners } = require("../controller/banner.controller");

// Public — koi auth nahi. Storefront (Hero.jsx, SalesBanner.jsx) isse
// GET /api/v1/banners/active?type=hero  aur  ?type=sale  call karte hain.
router.get("/active", getActiveBanners);

module.exports = router;