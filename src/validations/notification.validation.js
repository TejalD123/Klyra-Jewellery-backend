const mongoose = require("mongoose");
const ApiError = require("../utils/apiError");
const { NOTIFICATION_TYPES } = require("../models/notification.model");

/**
 * @route GET /api/notifications
 * Bad `type`/`isRead`/`page`/`limit` values fail fast with a 400 instead of
 * silently falling through to an empty or unexpectedly-shaped result set.
 */
const validateGetNotifications = (req, res, next) => {
  const { type, isRead, page, limit } = req.query;

  if (type && !NOTIFICATION_TYPES.includes(type)) {
    return next(
      ApiError.badRequest(
        `Invalid type filter. Must be one of: ${NOTIFICATION_TYPES.join(", ")}`
      )
    );
  }

  if (isRead !== undefined && !["true", "false"].includes(isRead)) {
    return next(ApiError.badRequest("isRead must be 'true' or 'false'"));
  }

  if (page !== undefined && (Number.isNaN(Number(page)) || Number(page) < 1)) {
    return next(ApiError.badRequest("page must be a positive number"));
  }

  if (
    limit !== undefined &&
    (Number.isNaN(Number(limit)) || Number(limit) < 1 || Number(limit) > 100)
  ) {
    return next(ApiError.badRequest("limit must be between 1 and 100"));
  }

  next();
};

/**
 * @route PATCH /api/notifications/:id/read
 * @route DELETE /api/notifications/:id
 * Centralizes the ObjectId check that was previously duplicated inline in
 * markAsRead/deleteNotification.
 */
const validateNotificationId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return next(ApiError.badRequest("Invalid notification id"));
  }
  next();
};

module.exports = { validateGetNotifications, validateNotificationId };