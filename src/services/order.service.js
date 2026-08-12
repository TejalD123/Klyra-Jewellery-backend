const mongoose = require("mongoose");
const Order = require("../models/order.model");
const Cart = require("../models/cart.model");
const Product = require("../models/product.model");
const Address = require("../models/address.model");
const DeliveryAgency = require("../models/deliveryAgency.model");
const ApiError = require("../utils/apiError");
const { notifyAdmins } = require("./notification.service");

// Simple shipping-charge rule: free above ₹2000, else flat ₹99.
const calculateShippingCharge = (subtotal) => (subtotal >= 2000 ? 0 : 99);

// Statuses at which a whole order (or an individual item) can still be cancelled
const CANCELLABLE_ORDER_STATUSES = ["placed", "confirmed", "processing", "packed"];

// How long each delivery stage lasts before auto-advancing. 2 minutes for a
// live demo — swap this one number for something like 2 days in production.
const DELIVERY_STAGE_DURATION_MS = 2 * 60 * 1000;

const assignDeliveryService = async (orderId, deliveryAgencyId) => {
  // TEMP DEBUG — will show up directly in the browser's alert/response
  console.log(">>> assignDeliveryService called with:", { orderId, deliveryAgencyId });

  const agency = await DeliveryAgency.findById(deliveryAgencyId);

  console.log(">>> DeliveryAgency.findById result:", agency);

  if (!agency || !agency.isActive) {
    throw ApiError.badRequest(
      `DEBUGXYZ received id="${deliveryAgencyId}" type=${typeof deliveryAgencyId} agencyFound=${!!agency} isActive=${agency ? agency.isActive : "N/A"}`
    );
  }

  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound("Order not found");
  if (order.cancellation?.isCancelled) throw ApiError.badRequest("Cannot update a cancelled order");

  const charge = agency.getRateForState(order.shippingAddress?.state);

  order.orderStatus = "shipped";
  order.deliveryAgencyId = agency._id;
  order.deliveryAgency = agency.name;
  order.deliveryCharge = charge;
  order.stageStartedAt = new Date();
  await order.save();
  return order;
};

// Demo "live tracking" — no cron job needed. Every time an order is read
// (admin list, user list, order detail), check whether enough time has
// passed in its current delivery stage and auto-advance it if so.
const autoAdvanceDeliveryStatus = async (order) => {
  if (!order || !order.stageStartedAt) return order;
  if (!["shipped", "out_for_delivery"].includes(order.orderStatus)) return order;

  const elapsed = Date.now() - new Date(order.stageStartedAt).getTime();
  if (elapsed < DELIVERY_STAGE_DURATION_MS) return order;

  if (order.orderStatus === "shipped") {
    order.orderStatus = "out_for_delivery";
    order.stageStartedAt = new Date();
  } else if (order.orderStatus === "out_for_delivery") {
    order.orderStatus = "delivered";
    order.stageStartedAt = null;
  }

  await order.save();
  return order;
};

const autoAdvanceMany = (orders) => Promise.all(orders.map(autoAdvanceDeliveryStatus));

const findOwnedOrder = async (orderId, userId, role) => {
  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound("Order not found");

  const isOwner = order.user.toString() === userId;
  const isAdmin = role === "admin";
  if (!isOwner && !isAdmin) throw ApiError.forbidden("Access denied");

  return autoAdvanceDeliveryStatus(order);
};

const createOrderService = async (userId, { addressId, paymentMethod, couponDiscount = 0 }) => {
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
          priceAtOrderTime: product.finalPrice,
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

  await notifyAdmins({
    type: "new_order",
    title: "New order placed",
    message: `${order.orderNumber} — ₹${order.pricing.totalAmount}`,
    relatedModel: "Order",
    relatedId: order._id,
  });

  return order;
};

const getMyOrdersService = async (userId, { orderStatus, page = 1, limit = 10 }) => {
  const filter = { user: userId };
  if (orderStatus) filter.orderStatus = orderStatus;

  const pageNum = Math.max(parseInt(page, 10), 1);
  const limitNum = Math.max(parseInt(limit, 10), 1);

  const [orders, total] = await Promise.all([
    Order.find(filter).sort("-createdAt").skip((pageNum - 1) * limitNum).limit(limitNum),
    Order.countDocuments(filter),
  ]);

  await autoAdvanceMany(orders);

  return {
    orders,
    pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
  };
};

const getOrderByIdService = async (id, userId, role) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw ApiError.badRequest("Invalid order id");
  return findOwnedOrder(id, userId, role);
};

const getOrderByOrderNumberService = async (orderNumber, userId, role) => {
  const order = await Order.findOne({ orderNumber });
  if (!order) throw ApiError.notFound("Order not found");

  const isOwner = order.user.toString() === userId;
  const isAdmin = role === "admin";
  if (!isOwner && !isAdmin) throw ApiError.forbidden("Access denied");

  return autoAdvanceDeliveryStatus(order);
};

const cancelOrderService = async (orderId, userId, role, reason = "") => {
  const order = await findOwnedOrder(orderId, userId, role);

  if (order.cancellation?.isCancelled) throw ApiError.badRequest("Order is already cancelled");
  if (!CANCELLABLE_ORDER_STATUSES.includes(order.orderStatus)) {
    throw ApiError.badRequest(`Order cannot be cancelled once it is "${order.orderStatus}"`);
  }

  await Promise.all(
    order.items
      .filter((item) => item.product && item.itemStatus === "active")
      .map((item) => Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } }))
  );

  order.items.forEach((item) => {
    if (item.itemStatus === "active") item.itemStatus = "cancelled";
  });

  order.orderStatus = "cancelled";
  order.cancellation = {
    isCancelled: true,
    reason,
    cancelledAt: new Date(),
    cancelledBy: role === "admin" ? "admin" : "user",
  };
  order.statusHistory.push({
    status: "cancelled",
    timestamp: new Date(),
    note: reason || `Cancelled by ${role === "admin" ? "admin" : "user"}`,
  });

  await order.save();

  await notifyAdmins({
    type: "order_cancelled",
    title: "Order cancelled",
    message: `${order.orderNumber} was cancelled by ${role === "admin" ? "admin" : "the customer"}${reason ? ` — ${reason}` : ""}`,
    relatedModel: "Order",
    relatedId: order._id,
  });

  return order;
};

const cancelOrderItemService = async (orderId, itemId, userId, role, reason = "") => {
  const order = await findOwnedOrder(orderId, userId, role);

  if (!CANCELLABLE_ORDER_STATUSES.includes(order.orderStatus)) {
    throw ApiError.badRequest(`Items cannot be cancelled once the order is "${order.orderStatus}"`);
  }

  const item = order.items.id(itemId);
  if (!item) throw ApiError.notFound("Order item not found");
  if (item.itemStatus !== "active") throw ApiError.badRequest(`This item is already "${item.itemStatus}"`);

  if (item.product) {
    await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } });
  }
  item.itemStatus = "cancelled";

  const activeItems = order.items.filter((i) => i.itemStatus === "active");
  const newSubtotal = activeItems.reduce((sum, i) => sum + i.priceAtOrderTime * i.quantity, 0);
  order.pricing.subtotal = newSubtotal;
  order.pricing.shippingCharge = calculateShippingCharge(newSubtotal);
  order.pricing.totalAmount = Math.max(
    newSubtotal - order.pricing.couponDiscount + order.pricing.shippingCharge,
    0
  );

  const allCancelled = order.items.every((i) => i.itemStatus === "cancelled");
  if (allCancelled) {
    order.orderStatus = "cancelled";
    order.cancellation = {
      isCancelled: true,
      reason: reason || "All items cancelled",
      cancelledAt: new Date(),
      cancelledBy: role === "admin" ? "admin" : "user",
    };
  } else if (order.paymentStatus === "paid") {
    order.paymentStatus = "partially_refunded";
  }

  order.statusHistory.push({
    status: allCancelled ? "cancelled" : order.orderStatus,
    timestamp: new Date(),
    note: reason || "Item cancelled",
  });

  await order.save();

  if (allCancelled) {
    await notifyAdmins({
      type: "order_cancelled",
      title: "Order cancelled",
      message: `${order.orderNumber} was cancelled (all items) by ${role === "admin" ? "admin" : "the customer"}`,
      relatedModel: "Order",
      relatedId: order._id,
    });
  }

  return order;
};

const requestItemReturnService = async (orderId, itemId, userId, role, reason) => {
  const order = await findOwnedOrder(orderId, userId, role);

  if (order.orderStatus !== "delivered") {
    throw ApiError.badRequest("Returns can only be requested after delivery");
  }

  const item = order.items.id(itemId);
  if (!item) throw ApiError.notFound("Order item not found");
  if (item.itemStatus !== "active") throw ApiError.badRequest(`This item is already "${item.itemStatus}"`);

  item.itemStatus = "return_requested";
  order.statusHistory.push({ status: "return_requested", timestamp: new Date(), note: reason });

  await order.save();

  await notifyAdmins({
    type: "return_requested",
    title: "Return requested",
    message: `${order.orderNumber} — return requested for "${item.name}"`,
    relatedModel: "Order",
    relatedId: order._id,
  });

  return order;
};

const updateItemReturnStatusService = async (orderId, itemId, itemStatus, note = "") => {
  const order = await Order.findById(orderId);
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
    throw ApiError.badRequest(`Cannot move item from "${item.itemStatus}" to "${itemStatus}"`);
  }

  item.itemStatus = itemStatus;

  if (itemStatus === "returned" && item.product) {
    await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } });
  }

  if (itemStatus === "refunded") {
    const allRefunded = order.items.every(
      (i) => i.itemStatus === "refunded" || i.itemStatus === "cancelled"
    );
    order.paymentStatus = allRefunded ? "refunded" : "partially_refunded";
  }

  order.statusHistory.push({ status: `item_${itemStatus}`, timestamp: new Date(), note });
  await order.save();
  return order;
};

const getAllOrdersService = async ({
  orderStatus, paymentStatus, search, startDate, endDate, page = 1, limit = 20,
}) => {
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

  await autoAdvanceMany(orders);

  return {
    orders,
    pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
  };
};

const updateOrderStatusService = async (orderId, orderStatus, note = "") => {
  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound("Order not found");

  if (order.cancellation?.isCancelled) throw ApiError.badRequest("Cannot change status of a cancelled order");
  if (order.orderStatus === "delivered" && orderStatus !== "delivered") {
    throw ApiError.badRequest("Cannot change status of a delivered order");
  }

  order.orderStatus = orderStatus;
  await order.save();

  if (note) {
    order.statusHistory[order.statusHistory.length - 1].note = note;
    await order.save();
  }

  return order;
};

const updatePaymentStatusService = async (orderId, paymentStatus) => {
  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound("Order not found");

  order.paymentStatus = paymentStatus;
  await order.save();

  if (paymentStatus === "failed") {
    await notifyAdmins({
      type: "payment_failed",
      title: "Payment failed",
      message: `Payment failed for order ${order.orderNumber}`,
      relatedModel: "Order",
      relatedId: order._id,
    });
  }

  return order;
};

module.exports = {
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
};