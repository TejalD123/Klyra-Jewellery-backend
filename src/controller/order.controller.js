const mongoose = require("mongoose");
const Order = require("../models/order.model");
const Cart = require("../models/cart.model");
const Product = require("../models/product.model");
const Address = require("../models/address.model");
const ApiResponse = require("../utils/apiResponse");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");

// Simple shipping-charge rule: free above ₹2000, else flat ₹99.
const calculateShippingCharge = (subtotal) => (subtotal >= 2000 ? 0 : 99);

// Statuses at which a whole order (or an individual item) can still be cancelled
const CANCELLABLE_ORDER_STATUSES = ["placed", "confirmed", "processing"];

/**
 * @desc    Place an order — converts the logged-in user's cart into an Order.
 * @route   POST /api/orders
 * @access  Private
 */
const createOrder = asyncHandler(async (req, res) => {
  const { addressId, paymentMethod, couponDiscount = 0 } = req.body;
  const userId = req.user.id;

  const address = await Address.findOne({ _id: addressId, user: userId });
  if (!address) throw ApiError.badRequest("Shipping address not found");

  const cart = await Cart.findOne({ user: userId }).populate("items.product");
  if (!cart || cart.items.length === 0) {
    throw ApiError.badRequest("Your cart is empty");
  }

  const session = await mongoose.startSession();
  let order;

  try {
    await session.withTransaction(async () => {
      const orderItems = [];

      for (const cartItem of cart.items) {
        const product = cartItem.product;
        if (!product || !product.isActive) {
          throw ApiError.badRequest(
            `"${product?.name || "A product"}" in your cart is no longer available`
          );
        }
        if (product.stock < cartItem.quantity) {
          throw ApiError.badRequest(
            `Only ${product.stock} unit(s) of "${product.name}" left in stock`
          );
        }

        orderItems.push({
          product: product._id,
          name: product.name,
          image: product.images?.[0] || "",
          metalType: product.metalType,
          size: cartItem.size,
          quantity: cartItem.quantity,
          priceAtOrderTime: product.finalPrice, // freeze current price
          itemStatus: "active",
        });

        await Product.updateOne(
          { _id: product._id },
          { $inc: { stock: -cartItem.quantity } },
          { session }
        );
      }

      const subtotal = orderItems.reduce(
        (sum, item) => sum + item.priceAtOrderTime * item.quantity,
        0
      );
      const shippingCharge = calculateShippingCharge(subtotal);
      const totalAmount = Math.max(subtotal - couponDiscount + shippingCharge, 0);

      const [createdOrder] = await Order.create(
        [
          {
            user: userId,
            items: orderItems,
            shippingAddress: {
              fullName: address.fullName,
              phoneNumber: address.phoneNumber,
              addressLine1: address.addressLine1,
              addressLine2: address.addressLine2,
              city: address.city,
              state: address.state,
              pincode: address.pincode,
            },
            pricing: { subtotal, couponDiscount, shippingCharge, totalAmount },
            paymentMethod,
            paymentStatus: "pending",
            orderStatus: "placed",
          },
        ],
        { session }
      );

      order = createdOrder;

      cart.items = [];
      await cart.save({ session });
    });
  } finally {
    session.endSession();
  }

  return res
    .status(201)
    .json(new ApiResponse(201, order, "Order placed successfully"));
});

/**
 * @desc    Get logged-in user's own orders (paginated, filterable by status)
 * @route   GET /api/orders/my
 * @access  Private
 */
const getMyOrders = asyncHandler(async (req, res) => {
  const { orderStatus, page = 1, limit = 10 } = req.query;

  const filter = { user: req.user.id };
  if (orderStatus) filter.orderStatus = orderStatus;

  const pageNum = Math.max(parseInt(page, 10), 1);
  const limitNum = Math.max(parseInt(limit, 10), 1);

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort("-createdAt")
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Order.countDocuments(filter),
  ]);

  return res.status(200).json(
    new ApiResponse(200, {
      orders,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    })
  );
});

const findOwnedOrder = async (orderId, userId, role) => {
  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound("Order not found");

  const isOwner = order.user.toString() === userId;
  const isAdmin = role === "admin";
  if (!isOwner && !isAdmin) throw ApiError.forbidden("Access denied");

  return order;
};

/**
 * @desc    Get a single order by ID (owner or admin only)
 * @route   GET /api/orders/:id
 * @access  Private
 */
const getOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest("Invalid order id");
  }

  const order = await findOwnedOrder(id, req.user.id, req.user.role);
  return res.status(200).json(new ApiResponse(200, order));
});

/**
 * @desc    Get order by human-friendly order number (e.g. ORD-2026-00123)
 * @route   GET /api/orders/number/:orderNumber
 * @access  Private
 */
const getOrderByOrderNumber = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ orderNumber: req.params.orderNumber });
  if (!order) throw ApiError.notFound("Order not found");

  const isOwner = order.user.toString() === req.user.id;
  const isAdmin = req.user.role === "admin";
  if (!isOwner && !isAdmin) throw ApiError.forbidden("Access denied");

  return res.status(200).json(new ApiResponse(200, order));
});

/**
 * @desc    Cancel the ENTIRE order (all items) — only while placed/confirmed/processing
 * @route   PATCH /api/orders/:id/cancel
 * @access  Private (owner) or Admin
 */
const cancelOrder = asyncHandler(async (req, res) => {
  const { reason = "" } = req.body;
  const order = await findOwnedOrder(req.params.id, req.user.id, req.user.role);

  if (order.cancellation?.isCancelled) {
    throw ApiError.badRequest("Order is already cancelled");
  }
  if (!CANCELLABLE_ORDER_STATUSES.includes(order.orderStatus)) {
    throw ApiError.badRequest(
      `Order cannot be cancelled once it is "${order.orderStatus}"`
    );
  }

  // Restock every still-active item
  await Promise.all(
    order.items
      .filter((item) => item.product && item.itemStatus === "active")
      .map((item) =>
        Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } })
      )
  );

  order.items.forEach((item) => {
    if (item.itemStatus === "active") item.itemStatus = "cancelled";
  });

  order.orderStatus = "cancelled";
  order.cancellation = {
    isCancelled: true,
    reason,
    cancelledAt: new Date(),
    cancelledBy: req.user.role === "admin" ? "admin" : "user",
  };
  order.statusHistory.push({
    status: "cancelled",
    timestamp: new Date(),
    note: reason || `Cancelled by ${req.user.role === "admin" ? "admin" : "user"}`,
  });

  await order.save();

  return res
    .status(200)
    .json(new ApiResponse(200, order, "Order cancelled successfully"));
});

/**
 * @desc    Cancel a SINGLE item within an order (order itself stays intact)
 * @route   PATCH /api/orders/:id/items/:itemId/cancel
 * @access  Private (owner) or Admin
 */
const cancelOrderItem = asyncHandler(async (req, res) => {
  const { reason = "" } = req.body;
  const { itemId } = req.params;
  const order = await findOwnedOrder(req.params.id, req.user.id, req.user.role);

  if (!CANCELLABLE_ORDER_STATUSES.includes(order.orderStatus)) {
    throw ApiError.badRequest(
      `Items cannot be cancelled once the order is "${order.orderStatus}"`
    );
  }

  const item = order.items.id(itemId);
  if (!item) throw ApiError.notFound("Order item not found");
  if (item.itemStatus !== "active") {
    throw ApiError.badRequest(`This item is already "${item.itemStatus}"`);
  }

  // Restock this item only
  if (item.product) {
    await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } });
  }
  item.itemStatus = "cancelled";

  // Recalculate pricing to exclude cancelled items (refund handled outside this API)
  const activeItems = order.items.filter((i) => i.itemStatus === "active");
  const newSubtotal = activeItems.reduce(
    (sum, i) => sum + i.priceAtOrderTime * i.quantity,
    0
  );
  order.pricing.subtotal = newSubtotal;
  order.pricing.shippingCharge = calculateShippingCharge(newSubtotal);
  order.pricing.totalAmount = Math.max(
    newSubtotal - order.pricing.couponDiscount + order.pricing.shippingCharge,
    0
  );

  // If everything in the order is now cancelled, cancel the order itself too
  const allCancelled = order.items.every((i) => i.itemStatus === "cancelled");
  if (allCancelled) {
    order.orderStatus = "cancelled";
    order.cancellation = {
      isCancelled: true,
      reason: reason || "All items cancelled",
      cancelledAt: new Date(),
      cancelledBy: req.user.role === "admin" ? "admin" : "user",
    };
  } else if (order.paymentStatus === "paid") {
    // Partial refund owed since payment was already collected
    order.paymentStatus = "partially_refunded";
  }

  order.statusHistory.push({
    status: allCancelled ? "cancelled" : order.orderStatus,
    timestamp: new Date(),
    note: reason || "Item cancelled",
  });

  await order.save();

  return res
    .status(200)
    .json(new ApiResponse(200, order, "Item cancelled successfully"));
});

/**
 * @desc    User requests a return for a single delivered item
 * @route   PATCH /api/orders/:id/items/:itemId/return-request
 * @access  Private (owner)
 */
const requestItemReturn = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const { itemId } = req.params;
  const order = await findOwnedOrder(req.params.id, req.user.id, req.user.role);

  if (order.orderStatus !== "delivered") {
    throw ApiError.badRequest("Returns can only be requested after delivery");
  }

  const item = order.items.id(itemId);
  if (!item) throw ApiError.notFound("Order item not found");
  if (item.itemStatus !== "active") {
    throw ApiError.badRequest(`This item is already "${item.itemStatus}"`);
  }

  item.itemStatus = "return_requested";
  order.statusHistory.push({
    status: "return_requested",
    timestamp: new Date(),
    note: reason,
  });

  await order.save();

  return res
    .status(200)
    .json(new ApiResponse(200, order, "Return request submitted"));
});

/**
 * @desc    Admin progresses an item through the return workflow
 *          (return_approved -> returned -> refunded), restocks on "returned"
 * @route   PATCH /api/orders/:id/items/:itemId/return-status
 * @access  Admin
 */
const updateItemReturnStatus = asyncHandler(async (req, res) => {
  const { itemStatus, note = "" } = req.body;
  const { itemId } = req.params;
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound("Order not found");

  const item = order.items.id(itemId);
  if (!item) throw ApiError.notFound("Order item not found");

  const VALID_TRANSITIONS = {
    return_requested: ["return_approved"],
    return_approved: ["returned"],
    returned: ["refunded"],
  };
  const allowedNext = VALID_TRANSITIONS[item.itemStatus] || [];
  if (!allowedNext.includes(itemStatus)) {
    throw ApiError.badRequest(
      `Cannot move item from "${item.itemStatus}" to "${itemStatus}"`
    );
  }

  item.itemStatus = itemStatus;

  // Restock once the item is physically back
  if (itemStatus === "returned" && item.product) {
    await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } });
  }

  // Reflect refund progress at the order level
  if (itemStatus === "refunded") {
    const allRefunded = order.items.every(
      (i) => i.itemStatus === "refunded" || i.itemStatus === "cancelled"
    );
    order.paymentStatus = allRefunded ? "refunded" : "partially_refunded";
  }

  order.statusHistory.push({ status: `item_${itemStatus}`, timestamp: new Date(), note });
  await order.save();

  return res
    .status(200)
    .json(new ApiResponse(200, order, "Item return status updated"));
});

/**
 * @desc    Get all orders across all users (filters: status, payment, search)
 * @route   GET /api/orders/admin/all
 * @access  Admin
 */
const getAllOrders = asyncHandler(async (req, res) => {
  const {
    orderStatus,
    paymentStatus,
    search,
    startDate,
    endDate,
    page = 1,
    limit = 20,
  } = req.query;

  const filter = {};
  if (orderStatus) filter.orderStatus = orderStatus;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (search) filter.orderNumber = { $regex: search, $options: "i" };
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const pageNum = Math.max(parseInt(page, 10), 1);
  const limitNum = Math.max(parseInt(limit, 10), 1);

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate("user", "username email phone")
      .sort("-createdAt")
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Order.countDocuments(filter),
  ]);

  return res.status(200).json(
    new ApiResponse(200, {
      orders,
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
 * @desc    Update order status (admin fulfillment workflow)
 * @route   PATCH /api/orders/:id/status
 * @access  Admin
 */
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { orderStatus, note = "" } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound("Order not found");

  if (order.cancellation?.isCancelled) {
    throw ApiError.badRequest("Cannot change status of a cancelled order");
  }
  if (order.orderStatus === "delivered" && orderStatus !== "delivered") {
    throw ApiError.badRequest("Cannot change status of a delivered order");
  }

  order.orderStatus = orderStatus;
  await order.save();

  if (note) {
    order.statusHistory[order.statusHistory.length - 1].note = note;
    await order.save();
  }

  return res
    .status(200)
    .json(new ApiResponse(200, order, "Order status updated"));
});

/**
 * @desc    Update payment status (called by admin, or Razorpay webhook handler)
 * @route   PATCH /api/orders/:id/payment-status
 * @access  Admin
 */
const updatePaymentStatus = asyncHandler(async (req, res) => {
  const { paymentStatus } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound("Order not found");

  order.paymentStatus = paymentStatus;
  await order.save();

  return res
    .status(200)
    .json(new ApiResponse(200, order, "Payment status updated"));
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
