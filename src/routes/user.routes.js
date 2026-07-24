const express = require("express");
const { getMe, updateMe } = require("../controller/user.controller");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/me", protect, getMe);
router.patch("/me", protect, updateMe);

module.exports = router;
