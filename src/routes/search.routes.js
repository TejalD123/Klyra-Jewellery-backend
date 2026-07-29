const express = require("express");

const { globalSearch } = require("../controller/search.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", protect, restrictTo("admin"), globalSearch);

module.exports = router;