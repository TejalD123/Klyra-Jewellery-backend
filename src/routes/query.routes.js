const express = require("express");

const {
  createQuery,
  getAllQueries,
  getQueryById,
  respondToQuery,
  updateQueryStatus,
  deleteQuery,
} = require("../controller/query.controller");

const { protect, restrictTo } = require("../middleware/auth.middleware");
const { validateSchema } = require("../middleware/validation.middleware");

const {
  createQuerySchema,
  respondToQuerySchema,
  updateQueryStatusSchema,
} = require("../validations/query.validation");

const router = express.Router();

// ---------- Public ----------
// No `protect` here on purpose — contact form must work for guests too.
router.post("/", validateSchema(createQuerySchema), createQuery);

// ---------- Admin-only ----------
router.get("/", protect, restrictTo("admin"), getAllQueries);
router.get("/:id", protect, restrictTo("admin"), getQueryById);
router.patch(
  "/:id/respond",
  protect,
  restrictTo("admin"),
  validateSchema(respondToQuerySchema),
  respondToQuery
);
router.patch(
  "/:id/status",
  protect,
  restrictTo("admin"),
  validateSchema(updateQueryStatusSchema),
  updateQueryStatus
);
router.delete("/:id", protect, restrictTo("admin"), deleteQuery);

module.exports = router;