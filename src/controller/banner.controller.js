const ApiResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const {
  getActiveBannersService,
  getAllBannersService,
  createBannerService,
  updateBannerService,
  toggleBannerStatusService,
  deleteBannerService,
} = require("../services/banner.service");

const getActiveBanners = asyncHandler(async (req, res) => {
  const banners = await getActiveBannersService(req.query.type);
  return res.status(200).json(new ApiResponse(200, banners, "Banners fetched successfully."));
});

const getAllBanners = asyncHandler(async (req, res) => {
  const banners = await getAllBannersService(req.query.type);
  return res.status(200).json(new ApiResponse(200, banners, "All banners fetched successfully."));
});

const createBanner = asyncHandler(async (req, res) => {
  const banner = await createBannerService({ body: req.body, file: req.file });
  return res.status(201).json(new ApiResponse(201, banner, "Banner created successfully."));
});

const updateBanner = asyncHandler(async (req, res) => {
  const banner = await updateBannerService(req.params.id, req.body, req.file);
  return res.status(200).json(new ApiResponse(200, banner, "Banner updated successfully."));
});

const toggleBannerStatus = asyncHandler(async (req, res) => {
  const banner = await toggleBannerStatusService(req.params.id);
  return res.status(200).json(new ApiResponse(200, banner, `Banner ${banner.isActive ? "activated" : "deactivated"}.`));
});

const deleteBanner = asyncHandler(async (req, res) => {
  await deleteBannerService(req.params.id);
  return res.status(200).json(new ApiResponse(200, null, "Banner deleted successfully."));
});

module.exports = {
  getActiveBanners,
  getAllBanners,
  createBanner,
  updateBanner,
  toggleBannerStatus,
  deleteBanner,
};