const Notification = require("../models/notification.model");
const ApiResponse = require("../utils/apiResponse");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");

/**
 * @desc    Get all notifications (paginated, filterable by type/isRead)
 * @route   GET /api/notifications
 * @access  Admin
 */
const getAllNotifications = asyncHandler(async (req, res) => {
  const { type, isRead, page = 1, limit = 20 } = req.query;

  const filter = { recipientRole: "admin" };
  if (type) filter.type = type;
  if (isRead !== undefined) filter.isRead = isRead === "true";

  const pageNum = Math.max(parseInt(page, 10), 1);
  const limitNum = Math.max(parseInt(limit, 10), 1);
  const skip = (pageNum - 1) * limitNum;

  const [notifications, total] = await Promise.all([
    Notification.find(filter)
      .sort("-createdAt")
      .skip(skip)
      .limit(limitNum),
    Notification.countDocuments(filter),
  ]);

  return res.status(200).json(
    new ApiResponse(200, {
      notifications,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    })
  );
});

/**
 * @desc    Get unread count — for the sidebar/topbar bell badge
 * @route   GET /api/notifications/unread-count
 * @access  Admin
 */
const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({
    recipientRole: "admin",
    isRead: false,
  });

  return res.status(200).json(new ApiResponse(200, { count }));
});

/**
 * @desc    Mark a single notification as read
 * @route   PATCH /api/notifications/:id/read
 * @access  Admin
 */
const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const notification = await Notification.findByIdAndUpdate(
    id,
    { isRead: true, readAt: new Date() },
    { new: true }
  );
  if (!notification) throw ApiError.notFound("Notification not found");

  return res.status(200).json(new ApiResponse(200, notification));
});

/**
 * @desc    Mark every unread notification as read
 * @route   PATCH /api/notifications/read-all
 * @access  Admin
 */
const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipientRole: "admin", isRead: false },
    { isRead: true, readAt: new Date() }
  );

  return res.status(200).json(new ApiResponse(200, null, "All notifications marked as read"));
});

/**
 * @desc    Delete a notification
 * @route   DELETE /api/notifications/:id
 * @access  Admin
 */
const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const notification = await Notification.findByIdAndDelete(id);
  if (!notification) throw ApiError.notFound("Notification not found");

  return res.status(200).json(new ApiResponse(200, null, "Notification deleted"));
});

module.exports = {
  getAllNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};