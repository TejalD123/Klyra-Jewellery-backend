const mongoose = require("mongoose");
const Address = require("../models/address.model");
const ApiError = require("../utils/apiError");

const createAddressService = async ({ body, userId }) => {
  const existingCount = await Address.countDocuments({ user: userId });
  const isDefault = existingCount === 0 ? true : !!body.isDefault;

  return Address.create({ ...body, user: userId, isDefault });
};

const getMyAddressesService = async (userId) => {
  return Address.find({ user: userId }).sort({ isDefault: -1, createdAt: -1 });
};

const getAddressByIdService = async (id, userId) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest("Invalid address id");
  }

  const address = await Address.findOne({ _id: id, user: userId });
  if (!address) throw ApiError.notFound("Address not found");
  return address;
};

const getDefaultAddressService = async (userId) => {
  const address = await Address.findOne({ user: userId, isDefault: true });
  if (!address) throw ApiError.notFound("No default address set");
  return address;
};

const updateAddressService = async (id, userId, body) => {
  const address = await Address.findOne({ _id: id, user: userId });
  if (!address) throw ApiError.notFound("Address not found");

  Object.assign(address, body);
  await address.save(); // pre-save hook handles isDefault uniqueness
  return address;
};

const setDefaultAddressService = async (id, userId) => {
  const address = await Address.findOne({ _id: id, user: userId });
  if (!address) throw ApiError.notFound("Address not found");

  address.isDefault = true;
  await address.save(); // pre-save hook unsets default on other addresses
  return address;
};

const deleteAddressService = async (id, userId) => {
  const address = await Address.findOne({ _id: id, user: userId });
  if (!address) throw ApiError.notFound("Address not found");

  const wasDefault = address.isDefault;
  await address.deleteOne();

  if (wasDefault) {
    const nextAddress = await Address.findOne({ user: userId }).sort({ createdAt: -1 });
    if (nextAddress) {
      nextAddress.isDefault = true;
      await nextAddress.save();
    }
  }
};

module.exports = {
  createAddressService,
  getMyAddressesService,
  getAddressByIdService,
  getDefaultAddressService,
  updateAddressService,
  setDefaultAddressService,
  deleteAddressService,
};