const mongoose = require("mongoose");
const Address = require("../models/address.model");
const ApiResponse = require("../utils/apiResponse");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");

/**
 * @desc    Create a new address for the logged-in user
 * @route   POST /api/addresses
 * @access  Private (logged-in user)
 */
const createAddress = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // First address for a user is always the default, regardless of what was sent
  const existingCount = await Address.countDocuments({ user: userId });
  const isDefault = existingCount === 0 ? true : !!req.body.isDefault;

  const address = await Address.create({
    ...req.body,
    user: userId,
    isDefault,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, address, "Address added successfully"));
});

/**
 * @desc    Get all addresses of the logged-in user
 * @route   GET /api/addresses
 * @access  Private
 */
const getMyAddresses = asyncHandler(async (req, res) => {
  const addresses = await Address.find({ user: req.user.id }).sort({
    isDefault: -1,
    createdAt: -1,
  });

  return res.status(200).json(new ApiResponse(200, addresses));
});

/**
 * @desc    Get a single address by ID (must belong to logged-in user)
 * @route   GET /api/addresses/:id
 * @access  Private
 */
const getAddressById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest("Invalid address id");
  }

  const address = await Address.findOne({ _id: id, user: req.user.id });
  if (!address) throw ApiError.notFound("Address not found");

  return res.status(200).json(new ApiResponse(200, address));
});

/**
 * @desc    Get the logged-in user's default address
 * @route   GET /api/addresses/default
 * @access  Private
 */
const getDefaultAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({
    user: req.user.id,
    isDefault: true,
  });

  if (!address) throw ApiError.notFound("No default address set");

  return res.status(200).json(new ApiResponse(200, address));
});

/**
 * @desc    Update an address (must belong to logged-in user)
 * @route   PUT /api/addresses/:id
 * @access  Private
 */
const updateAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const address = await Address.findOne({ _id: id, user: req.user.id });
  if (!address) throw ApiError.notFound("Address not found");

  Object.assign(address, req.body);
  await address.save(); // pre-save hook handles isDefault uniqueness

  return res
    .status(200)
    .json(new ApiResponse(200, address, "Address updated successfully"));
});

/**
 * @desc    Set an address as default
 * @route   PATCH /api/addresses/:id/set-default
 * @access  Private
 */
const setDefaultAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const address = await Address.findOne({ _id: id, user: req.user.id });
  if (!address) throw ApiError.notFound("Address not found");

  address.isDefault = true;
  await address.save(); // pre-save hook unsets default on other addresses

  return res
    .status(200)
    .json(new ApiResponse(200, address, "Default address updated"));
});

/**
 * @desc    Delete an address (must belong to logged-in user)
 * @route   DELETE /api/addresses/:id
 * @access  Private
 */
const deleteAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const address = await Address.findOne({ _id: id, user: req.user.id });
  if (!address) throw ApiError.notFound("Address not found");

  const wasDefault = address.isDefault;
  await address.deleteOne();

  // If the deleted address was default, promote the most recent remaining one
  if (wasDefault) {
    const nextAddress = await Address.findOne({ user: req.user.id }).sort({
      createdAt: -1,
    });
    if (nextAddress) {
      nextAddress.isDefault = true;
      await nextAddress.save();
    }
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Address deleted successfully"));
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