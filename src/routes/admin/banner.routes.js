const express = require("express");
const router = express.Router();

const {
  getAllBanners,
  createBanner,
  updateBanner,
  toggleBannerStatus,
  deleteBanner,
} = require("../../controller/banner.controller");

const { protect, restrictTo } = require("../../middleware/auth.middleware");
const { validateSchema } = require("../../middleware/validation.middleware");
const { createBannerSchema, updateBannerSchema } = require("../../validations/banner.validation");
const upload = require("../../middleware/upload.middleware");

router.use(protect, restrictTo("admin"));

router.get("/", getAllBanners);
router.post("/", upload.single("image"), validateSchema(createBannerSchema), createBanner);
router.patch("/:id", upload.single("image"), validateSchema(updateBannerSchema), updateBanner);
router.patch("/:id/toggle", toggleBannerStatus);
router.delete("/:id", deleteBanner);

module.exports = router;