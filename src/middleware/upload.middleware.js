const multer = require("multer");
const ApiError = require("../utils/apiError");

// Files are kept in memory as a Buffer (req.file.buffer / req.files[i].buffer).
// The actual Cloudinary upload happens later, manually, in each service file
// (category.service.js / product.service.js) via cloudinary.service.js's
// uploadImageBuffer() / uploadMultipleImages().
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(ApiError.badRequest("Only jpeg, jpg, png, webp images are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max per file
});

// ---- NEW: category poster feature -------------------------------------
// Category create/update now needs THREE optional image fields in one
// multipart request: the thumbnail "image" (used in card grids) plus
// "posterDesktop" and "posterMobile" (used for the full-width hero
// banner). upload.single() only accepts one named field, so we add a
// upload.fields() config specifically for the category form and attach
// it as a named property on the same `upload` instance — every existing
// upload.single(...) / upload.array(...) usage elsewhere is untouched.
upload.uploadCategoryImages = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "posterDesktop", maxCount: 1 },
  { name: "posterMobile", maxCount: 1 },
]);
// -------------------------------------------------------------------------

// category.routes.js / admin.routes.js -> upload.uploadCategoryImages
// product.routes.js  / admin.routes.js -> upload.array("images", 8)
// banner/delivery routes                -> upload.single(...)
module.exports = upload;