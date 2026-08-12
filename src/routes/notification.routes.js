const express = require("express");

const {
  getAllNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} = require("../controller/notification.controller");

const {
  validateGetNotifications,
  validateNotificationId,
} = require("../validations/notification.validation");

const { protect, restrictTo } = require("../middleware/auth.middleware");

const router = express.Router();

// Every notification route is admin-only
router.use(protect, restrictTo("admin"));

router.get("/", validateGetNotifications, getAllNotifications);
router.get("/unread-count", getUnreadCount);
router.patch("/read-all", markAllAsRead);
router.patch("/:id/read", validateNotificationId, markAsRead);
router.delete("/:id", validateNotificationId, deleteNotification);

module.exports = router;