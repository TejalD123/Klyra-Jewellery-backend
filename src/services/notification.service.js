const Notification = require("../models/notification.model");

/**
 * Internal helper — NOT a route handler. Call this from other controllers
 * to raise a notification, e.g. inside order.controller.js's createOrder:
 *
 *   const { notifyAdmins } = require("../services/notification.service");
 *   await notifyAdmins({
 *     type: "new_order",
 *     title: "New order placed",
 *     message: `${order.orderNumber} — ₹${order.pricing.totalAmount}`,
 *     relatedModel: "Order",
 *     relatedId: order._id,
 *   });
 *
 * Same idea for:
 *   - order.controller.js's cancelOrder      -> type: "order_cancelled"
 *   - order.controller.js's requestReturn    -> type: "return_requested"
 *   - payment.controller.js's on payment fail -> type: "payment_failed"
 *   - product.controller.js's updateStock    -> type: "low_stock"
 *   - query.controller.js's createQuery      -> type: "new_query"
 *
 * Deliberately swallows errors: a notification failing to save should
 * never break the order/product/query flow that triggered it.
 */
const notifyAdmins = async ({ type, title, message, relatedModel = null, relatedId = null }) => {
  try {
    return await Notification.create({
      type,
      title,
      message,
      relatedModel,
      relatedId,
    });
  } catch (err) {
    console.error("notifyAdmins failed:", err.message);
    return null;
  }
};

module.exports = { notifyAdmins };