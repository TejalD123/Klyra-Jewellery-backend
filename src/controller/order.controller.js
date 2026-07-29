const ApiResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
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
} = require("../services/order.service");

const createOrder = asyncHandler(async (req, res) => {
  const order = await createOrderService(req.user.id, req.body);
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
};