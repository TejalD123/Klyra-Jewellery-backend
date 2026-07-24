const multer = require("multer");
const ApiError = require("../utils/apiError");

// Files temporarily go into memory buffer, then category.controller.js
// uploads req.file.buffer to Cloudinary using cloudinary.service.js
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

// category.routes.js -> upload.single("image")
// product.routes.js  -> upload.array("images", 8)
module.exports = upload;