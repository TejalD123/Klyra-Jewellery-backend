// Requiring this runs cloudinary.config({...}) once, on the shared "cloudinary" module instance
require("../config/cloudinary.config");
const cloudinary = require("cloudinary").v2;

// Uploads a buffer (from multer memoryStorage) to Cloudinary
const uploadImageBuffer = (buffer, folder = "categories") => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result); // result.secure_url, result.public_id
      }
    );
    stream.end(buffer);
  });
};

// Uploads multiple buffers (from multer array upload) in parallel
const uploadMultipleImages = async (files = [], folder = "products") => {
  const results = await Promise.all(
    files.map((file) => uploadImageBuffer(file.buffer, folder))
  );
  return results.map((r) => r.secure_url);
};

// Deletes an image from Cloudinary using its public_id
const deleteImage = async (publicId) => {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId);
};

// Extracts Cloudinary public_id from a secure_url (folder/filename without extension)
const extractPublicId = (imageUrl) => {
  if (!imageUrl) return null;
  const parts = imageUrl.split("/");
  const fileWithExt = parts[parts.length - 1];
  const folder = parts[parts.length - 2];
  const fileName = fileWithExt.split(".")[0];
  return `${folder}/${fileName}`;
};

module.exports = {
  uploadImageBuffer,
  uploadMultipleImages,
  deleteImage,
  extractPublicId,
};