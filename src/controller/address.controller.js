const ApiResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const {
  createAddressService,
  getMyAddressesService,
  getAddressByIdService,
  getDefaultAddressService,
  updateAddressService,
  setDefaultAddressService,
  deleteAddressService,
} = require("../services/address.service");

const createAddress = asyncHandler(async (req, res) => {
  const address = await createAddressService({ body: req.body, userId: req.user.id });
  return res.status(201).json(new ApiResponse(201, address, "Address added successfully"));
});

const getMyAddresses = asyncHandler(async (req, res) => {
  const addresses = await getMyAddressesService(req.user.id);
  return res.status(200).json(new ApiResponse(200, addresses));
});

const getAddressById = asyncHandler(async (req, res) => {
  const address = await getAddressByIdService(req.params.id, req.user.id);
  return res.status(200).json(new ApiResponse(200, address));
});

const getDefaultAddress = asyncHandler(async (req, res) => {
  const address = await getDefaultAddressService(req.user.id);
  return res.status(200).json(new ApiResponse(200, address));
});

const updateAddress = asyncHandler(async (req, res) => {
  const address = await updateAddressService(req.params.id, req.user.id, req.body);
  return res.status(200).json(new ApiResponse(200, address, "Address updated successfully"));
});

const setDefaultAddress = asyncHandler(async (req, res) => {
  const address = await setDefaultAddressService(req.params.id, req.user.id);
  return res.status(200).json(new ApiResponse(200, address, "Default address updated"));
});

const deleteAddress = asyncHandler(async (req, res) => {
  await deleteAddressService(req.params.id, req.user.id);
  return res.status(200).json(new ApiResponse(200, null, "Address deleted successfully"));
});

module.exports = {
  createAddress,
  getMyAddresses,
  getAddressById,
  getDefaultAddress,
  updateAddress,
  setDefaultAddress,
  deleteAddress,
};