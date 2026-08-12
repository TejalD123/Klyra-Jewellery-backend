const DeliveryAgency = require("../models/deliveryAgency.model");
const ApiError = require("../utils/apiError");
const { uploadImageBuffer, deleteImage } = require("./cloudinary.service");

const createDeliveryAgencyService = async ({ body, file }) => {
  const { name, contactPerson, phone, email, stateRates, defaultCharge, isActive } = body;

  const existing = await DeliveryAgency.findOne({ name: name?.trim() });
  if (existing) throw ApiError.badRequest("An agency with this name already exists");

  let logoUrl = "";
  let logoPublicId = undefined;

  if (file) {
    const result = await uploadImageBuffer(file.buffer, "delivery-agencies");
    logoUrl = result.secure_url;
    logoPublicId = result.public_id;
  }

  return DeliveryAgency.create({
    name,
    contactPerson,
    phone,
    email,
    stateRates: stateRates || [],
    defaultCharge,
    isActive: isActive === undefined ? true : isActive === "true" || isActive === true,
    logoUrl,
    logoPublicId,
  });
};

const getAllDeliveryAgenciesService = async () => {
  return DeliveryAgency.find().sort({ name: 1 });
};

const getActiveDeliveryAgenciesService = async () => {
  return DeliveryAgency.find({ isActive: true }).sort({ name: 1 });
};

const getDeliveryAgencyByIdService = async (id) => {
  const agency = await DeliveryAgency.findById(id);
  if (!agency) throw ApiError.notFound("Delivery agency not found");
  return agency;
};

const updateDeliveryAgencyService = async (id, body, file) => {
  const agency = await DeliveryAgency.findById(id).select("+logoPublicId");
  if (!agency) throw ApiError.notFound("Delivery agency not found");

  const updatableFields = ["name", "contactPerson", "phone", "email", "stateRates", "defaultCharge"];
  updatableFields.forEach((field) => {
    if (body[field] !== undefined) agency[field] = body[field];
  });

  // isActive arrives as a string ("true"/"false") over multipart form-data
  if (body.isActive !== undefined) {
    agency.isActive = body.isActive === "true" || body.isActive === true;
  }

  if (file) {
    if (agency.logoPublicId) {
      await deleteImage(agency.logoPublicId);
    }
    const result = await uploadImageBuffer(file.buffer, "delivery-agencies");
    agency.logoUrl = result.secure_url;
    agency.logoPublicId = result.public_id;
  }

  await agency.save();
  return agency;
};

const toggleDeliveryAgencyStatusService = async (id) => {
  const agency = await DeliveryAgency.findById(id);
  if (!agency) throw ApiError.notFound("Delivery agency not found");

  agency.isActive = !agency.isActive;
  await agency.save();
  return agency;
};

const deleteDeliveryAgencyService = async (id) => {
  const agency = await DeliveryAgency.findById(id).select("+logoPublicId");
  if (!agency) throw ApiError.notFound("Delivery agency not found");

  if (agency.logoPublicId) {
    await deleteImage(agency.logoPublicId);
  }
  await agency.deleteOne();
};

module.exports = {
  createDeliveryAgencyService,
  getAllDeliveryAgenciesService,
  getActiveDeliveryAgenciesService,
  getDeliveryAgencyByIdService,
  updateDeliveryAgencyService,
  toggleDeliveryAgencyStatusService,
  deleteDeliveryAgencyService,
};