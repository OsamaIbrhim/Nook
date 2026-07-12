import mongoose from 'mongoose';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { assertObjectId, parsePositiveInt, requireFields } from '../validators/common.js';
import { env } from '../config/env.js';
import { restoreOrderInventory } from '../services/inventoryService.js';

const transitions = {
  pending: ['processing', 'cancelled'], processing: ['shipped', 'cancelled'], shipped: ['delivered'], delivered: [], cancelled: []
};

export const createOrder = asyncHandler(async (req, res) => {
  requireFields(req.body, ['items', 'shippingAddress']);
  if (!Array.isArray(req.body.items) || !req.body.items.length) throw new ApiError(400, 'Cart must contain at least one item');
  requireFields(req.body.shippingAddress, ['name', 'line1', 'city', 'postalCode', 'country']);
  const quantities = new Map();
  for (const item of req.body.items) {
    assertObjectId(item.product, 'product');
    const quantity = Number.parseInt(item.quantity, 10);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new ApiError(400, 'Item quantity must be between 1 and 99');
    quantities.set(item.product, (quantities.get(item.product) || 0) + quantity);
  }

  const session = await mongoose.startSession();
  let order;
  try {
    await session.withTransaction(async () => {
      const products = await Product.find({ _id: { $in: [...quantities.keys()] }, isActive: true }).session(session);
      if (products.length !== quantities.size) throw new ApiError(400, 'One or more products are unavailable');
      const items = [];
      for (const product of products) {
        const quantity = quantities.get(product.id);
        const reserved = await Product.updateOne({ _id: product.id, stock: { $gte: quantity } }, { $inc: { stock: -quantity } }, { session });
        if (!reserved.modifiedCount) throw new ApiError(409, `Insufficient stock for ${product.name}`);
        items.push({ product: product.id, name: product.name, image: product.images[0]?.url, unitPrice: product.price, quantity, lineTotal: product.price * quantity });
      }
      const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
      const shipping = 0;
      [order] = await Order.create([{ user: req.user.id, items, shippingAddress: req.body.shippingAddress, subtotal, shipping, total: subtotal + shipping, currency: env.currency }], { session });
    });
  } finally { await session.endSession(); }
  res.status(201).json({ success: true, data: { order } });
});

export const myOrders = asyncHandler(async (req, res) => {
  const page = parsePositiveInt(req.query.page, 1); const limit = parsePositiveInt(req.query.limit, 10, 50);
  const [orders, total] = await Promise.all([Order.find({ user: req.user.id }).sort('-createdAt').skip((page - 1) * limit).limit(limit).lean(), Order.countDocuments({ user: req.user.id })]);
  res.json({ success: true, data: { orders, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
});

export const getOrder = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id);
  const order = await Order.findById(req.params.id).populate('user', 'name email');
  if (!order) throw new ApiError(404, 'Order not found');
  if (req.user.role !== 'admin' && order.user._id.toString() !== req.user.id) throw new ApiError(403, 'Access denied');
  res.json({ success: true, data: { order } });
});

export const listOrders = asyncHandler(async (req, res) => {
  const page = parsePositiveInt(req.query.page, 1); const limit = parsePositiveInt(req.query.limit, 20, 100);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;
  const [orders, total] = await Promise.all([Order.find(filter).populate('user', 'name email').sort('-createdAt').skip((page - 1) * limit).limit(limit).lean(), Order.countDocuments(filter)]);
  res.json({ success: true, data: { orders, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id); requireFields(req.body, ['status']);
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, 'Order not found');
  if (!transitions[order.status]?.includes(req.body.status)) throw new ApiError(409, `Cannot change status from ${order.status} to ${req.body.status}`);
  if (req.body.status === 'processing' && order.paymentStatus !== 'paid') throw new ApiError(409, 'An unpaid order cannot be processed');
  if (req.body.status === 'cancelled' && order.inventoryReserved) await restoreOrderInventory(order);
  order.status = req.body.status; order.statusHistory.push({ status: req.body.status, by: req.user.id });
  await order.save();
  res.json({ success: true, data: { order } });
});

export const cancelMyOrder = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id);
  const order = await Order.findOne({ _id: req.params.id, user: req.user.id });
  if (!order) throw new ApiError(404, 'Order not found');
  if (order.status !== 'pending' || order.paymentStatus !== 'unpaid') throw new ApiError(409, 'Only pending unpaid orders can be cancelled');
  await restoreOrderInventory(order);
  order.status = 'cancelled'; order.statusHistory.push({ status: 'cancelled', by: req.user.id }); await order.save();
  res.json({ success: true, data: { order } });
});
