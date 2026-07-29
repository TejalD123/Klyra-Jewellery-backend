const Banner = require("../models/banner.model");
const cloudinary = require("../config/cloudinary.config");
const ApiError = require("../utils/apiError");

const getActiveBannersService = async (type) => {
  const query = { isActive: true };
  if (type) query.type = type;

  const banners = await Banner.find(query).sort({ displayOrder: 1, createdAt: -1 });
  return banners.filter((b) => b.isCurrentlyValid());
};

const getAllBannersService = async (type) => {
  const query = {};
  if (type) query.type = type;
  return Banner.find(query).sort({ displayOrder: 1, createdAt: -1 });
};

const createBannerService = async ({ body, file }) => {
  const { type, title, subtitle, ctaText, ctaLink, backgroundColor, displayOrder, startDate, endDate } = body;

  if (type === "hero" && !file) {
    throw new ApiError(400, "Image is required for hero banners.");
  }

  return Banner.create({
    type,
    title,
    subtitle,
    ctaText,
    ctaLink,
    backgroundColor,
    displayOrder: displayOrder || 0,
    startDate: startDate || null,
    endDate: endDate || null,
    image: file?.path || undefined,
    imagePublicId: file?.filename || undefined,
  });
};

const updateBannerService = async (id, body, file) => {
  const banner = await Banner.findById(id).select("+imagePublicId");
  if (!banner) throw new ApiError(404, "Banner not found.");

  const updatableFields = [
    "title", "subtitle", "ctaText", "ctaLink",
    "backgroundColor", "displayOrder", "isActive", "startDate", "endDate",
  ];
  updatableFields.forEach((field) => {
    if (body[field] !== undefined) banner[field] = body[field];
  });

  if (file) {
    if (banner.imagePublicId) {
      await cloudinary.uploader.destroy(banner.imagePublicId).catch(() => {});
    }
    banner.image = file.path;
    banner.imagePublicId = file.filename;
  }

  await banner.save();
  return banner;
};

const toggleBannerStatusService = async (id) => {
  const banner = await Banner.findById(id);
  if (!banner) throw new ApiError(404, "Banner not found.");

  banner.isActive = !banner.isActive;
  await banner.save();
  return banner;
};

const deleteBannerService = async (id) => {
  const banner = await Banner.findById(id).select("+imagePublicId");
  if (!banner) throw new ApiError(404, "Banner not found.");

  if (banner.imagePublicId) {
    await cloudinary.uploader.destroy(banner.imagePublicId).catch(() => {});
  }
  await banner.deleteOne();
};

module.exports = {
  getActiveBannersService,
  getAllBannersService,
  createBannerService,
  updateBannerService,
  toggleBannerStatusService,
  deleteBannerService,
};