const express = require("express");
const router = express.Router();

const {
  createAddress,
  getMyAddresses,
  getAddressById,
  getDefaultAddress,
  updateAddress,
  setDefaultAddress,
  deleteAddress,
} = require("../controller/address.controller");

const { protect } = require("../middleware/auth.middleware");

const {
  validateSchema,
} = require("../middleware/validation.middleware");

const {
  createAddressSchema,
  updateAddressSchema,
} = require("../validations/address.validation");

// All address routes require authentication
router.use(protect);

// NOTE: "/default" must come before "/:id"
router.get("/default", getDefaultAddress);

router.post(
  "/",
  validateSchema(createAddressSchema),
  createAddress
);

router.get("/", getMyAddresses);

router.get("/:id", getAddressById);

router.put(
  "/:id",
  validateSchema(updateAddressSchema),
  updateAddress
);

router.patch("/:id/set-default", setDefaultAddress);

router.delete("/:id", deleteAddress);

module.exports = router;