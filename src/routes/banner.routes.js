const express = require("express");
const router = express.Router();

const {
  getAllBanners,
  createBanner,
  updateBanner,
  toggleBannerStatus,
  deleteBanner,
} = require("../../controller/banner.controller");

const { protect } = require("../../middleware/auth.middleware");
const { restrictTo } = require("../../middleware/auth.middleware"); // adjust import if restrictTo lives elsewhere
const upload = require("../../middleware/upload.middleware");

router.use(protect, restrictTo("admin"));

router.get("/", getAllBanners);
router.post("/", upload.single("image"), createBanner);
router.patch("/:id", upload.single("image"), updateBanner);
router.patch("/:id/toggle", toggleBannerStatus);
router.delete("/:id", deleteBanner);

module.exports = router;