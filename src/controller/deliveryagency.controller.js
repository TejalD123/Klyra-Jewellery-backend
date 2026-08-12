const ApiResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const {
  createDeliveryAgencyService,
  getAllDeliveryAgenciesService,
  getActiveDeliveryAgenciesService,
  getDeliveryAgencyByIdService,
  updateDeliveryAgencyService,
  toggleDeliveryAgencyStatusService,
  deleteDeliveryAgencyService,
} = require("../services/deliveryagency.service");

const createDeliveryAgency = asyncHandler(async (req, res) => {
  const agency = await createDeliveryAgencyService({ body: req.body, file: req.file });
  return res.status(201).json(new ApiResponse(201, agency, "Delivery agency created successfully"));
});

// Admin management list — all agencies, active and inactive
const getAllDeliveryAgencies = asyncHandler(async (req, res) => {
  const agencies = await getAllDeliveryAgenciesService();
  return res.status(200).json(new ApiResponse(200, agencies));
});

// Used by the Orders page's agency picker when assigning delivery — active only
const getActiveDeliveryAgencies = asyncHandler(async (req, res) => {
  const agencies = await getActiveDeliveryAgenciesService();
  return res.status(200).json(new ApiResponse(200, agencies));
});

const getDeliveryAgencyById = asyncHandler(async (req, res) => {
  const agency = await getDeliveryAgencyByIdService(req.params.id);
  return res.status(200).json(new ApiResponse(200, agency));
});

const updateDeliveryAgency = asyncHandler(async (req, res) => {
  const agency = await updateDeliveryAgencyService(req.params.id, req.body, req.file);
  return res.status(200).json(new ApiResponse(200, agency, "Delivery agency updated successfully"));
});

const toggleDeliveryAgencyStatus = asyncHandler(async (req, res) => {
  const agency = await toggleDeliveryAgencyStatusService(req.params.id);
  return res.status(200).json(
    new ApiResponse(200, agency, `Agency ${agency.isActive ? "activated" : "deactivated"}`)
  );
});

const deleteDeliveryAgency = asyncHandler(async (req, res) => {
  await deleteDeliveryAgencyService(req.params.id);
  return res.status(200).json(new ApiResponse(200, null, "Delivery agency deleted successfully"));
});

module.exports = {
  createDeliveryAgency,
  getAllDeliveryAgencies,
  getActiveDeliveryAgencies,
  getDeliveryAgencyById,
  updateDeliveryAgency,
  toggleDeliveryAgencyStatus,
  deleteDeliveryAgency,
};