const ApiResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { sendOrderConfirmationEmail } = require("../services/email.service");
const {
  createOrderService,
  getMyOrdersService,
  getOrderByIdService,
  getOrderByOrderNumberService,
  cancelOrderService,
  cancelOrderItemService,
  requestItemReturnService,
  updateItemReturnStatusService,
  getAllOrdersService,
  updateOrderStatusService,
  updatePaymentStatusService,
  assignDeliveryService,
} = require("../services/order.service");

const createOrder = asyncHandler(async (req, res) => {
  const order = await createOrderService(req.user.id, req.body);

  // Don't let an email failure break the order-placed response —
  // order is already saved in DB at this point, just log and move on.
  try {
    await sendOrderConfirmationEmail(req.user.email, order);
  } catch (err) {
    console.error("Order confirmation email failed:", err.message);
  }

  return res.status(201).json(new ApiResponse(201, order, "Order placed successfully"));
});

const getMyOrders = asyncHandler(async (req, res) => {
  const result = await getMyOrdersService(req.user.id, req.query);
  return res.status(200).json(new ApiResponse(200, result));
});

const getOrderById = asyncHandler(async (req, res) => {
  const order = await getOrderByIdService(req.params.id, req.user.id, req.user.role);
  return res.status(200).json(new ApiResponse(200, order));
});

const getOrderByOrderNumber = asyncHandler(async (req, res) => {
  const order = await getOrderByOrderNumberService(req.params.orderNumber, req.user.id, req.user.role);
  return res.status(200).json(new ApiResponse(200, order));
});

const cancelOrder = asyncHandler(async (req, res) => {
  const order = await cancelOrderService(req.params.id, req.user.id, req.user.role, req.body.reason);
  return res.status(200).json(new ApiResponse(200, order, "Order cancelled successfully"));
});

const cancelOrderItem = asyncHandler(async (req, res) => {
  const order = await cancelOrderItemService(
    req.params.id, req.params.itemId, req.user.id, req.user.role, req.body.reason
  );
  return res.status(200).json(new ApiResponse(200, order, "Item cancelled successfully"));
});

const requestItemReturn = asyncHandler(async (req, res) => {
  const order = await requestItemReturnService(
    req.params.id, req.params.itemId, req.user.id, req.user.role, req.body.reason
  );
  return res.status(200).json(new ApiResponse(200, order, "Return request submitted"));
});

const updateItemReturnStatus = asyncHandler(async (req, res) => {
  const order = await updateItemReturnStatusService(
    req.params.id, req.params.itemId, req.body.itemStatus, req.body.note
  );
  return res.status(200).json(new ApiResponse(200, order, "Item return status updated"));
});

const getAllOrders = asyncHandler(async (req, res) => {
  const result = await getAllOrdersService(req.query);
  return res.status(200).json(new ApiResponse(200, result));
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const order = await updateOrderStatusService(req.params.id, req.body.orderStatus, req.body.note);
  return res.status(200).json(new ApiResponse(200, order, "Order status updated"));
});

const updatePaymentStatus = asyncHandler(async (req, res) => {
  const order = await updatePaymentStatusService(req.params.id, req.body.paymentStatus);
  return res.status(200).json(new ApiResponse(200, order, "Payment status updated"));
});

// ===== Dummy delivery tracking (demo only) =====
const assignDelivery = asyncHandler(async (req, res) => {
  console.log("DEBUG assign-delivery req.body:", req.body); // TEMP — remove after debugging
  console.log("DEBUG assign-delivery req.params.id:", req.params.id); // TEMP — remove after debugging
  const order = await assignDeliveryService(req.params.id, req.body.deliveryAgencyId);
  return res.status(200).json(new ApiResponse(200, order, "Order shipped and assigned for delivery"));
});

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  getOrderByOrderNumber,
  cancelOrder,
  cancelOrderItem,
  requestItemReturn,
  updateItemReturnStatus,
  getAllOrders,
  updateOrderStatus,
  updatePaymentStatus,
  assignDelivery,
};