import { Order } from '../models/Order.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { assertObjectId, requireFields } from '../validators/common.js';
import { parseOrderFilters, parseOrderRequest } from '../validators/orders.js';
import { pageInfo, readPage } from '../http/paginate.js';
import { parseIdempotencyKey } from '../validators/idempotency.js';
import { shopPolicy } from '../config/shopPolicy.js';
import { cancelOrder, changeOrderStatus } from '../services/orderService.js';
import { placeOrder } from '../services/placeOrder.js';
import { presentOrder } from './orderPresenter.js';

const orderNotFound = () => new ApiError(404, 'Order not found', undefined, { code: 'order_not_found' });

export const createOrder = asyncHandler(async (req, res) => {
  const { lines, shippingAddress } = parseOrderRequest(req.body, shopPolicy);
  const idempotencyKey = parseIdempotencyKey(req.get('idempotency-key'));
  const { order, created } = await placeOrder({ userId: req.user.id, lines, shippingAddress, idempotencyKey, now: req.app.locals.now() });
  res.status(created ? 201 : 200).json({ success: true, data: { order: presentOrder(order, req.user.role) } });
});

export const myOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = readPage(req.query, { defaultLimit: 10, maxLimit: 50 });
  const [orders, total] = await Promise.all([Order.find({ user: req.user.id }).sort('-createdAt').skip(skip).limit(limit).lean(), Order.countDocuments({ user: req.user.id })]);
  res.json({ success: true, data: { orders: orders.map((order) => presentOrder(order, req.user.role)), pagination: pageInfo({ page, limit, total }) } });
});

export const getOrder = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id);
  const ownerFilter = req.user.role === 'admin' ? {} : { user: req.user.id };
  const order = await Order.findOne({ _id: req.params.id, ...ownerFilter }).populate('user', 'name email');
  if (!order) throw orderNotFound();
  res.json({ success: true, data: { order: presentOrder(order, req.user.role) } });
});

export const getOrderBySession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const order = /^cs_[A-Za-z0-9_]+$/.test(sessionId) ? await Order.findOne({ stripeCheckoutSessionId: sessionId, user: req.user.id }) : null;
  if (!order) throw orderNotFound();
  res.json({ success: true, data: { order: presentOrder(order, req.user.role) } });
});

export const listOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = readPage(req.query, { defaultLimit: 20, maxLimit: 100 });
  const filter = parseOrderFilters(req.query);
  const [orders, total] = await Promise.all([Order.find(filter).populate('user', 'name email').sort('-createdAt').skip(skip).limit(limit).lean(), Order.countDocuments(filter)]);
  res.json({ success: true, data: { orders: orders.map((order) => presentOrder(order, req.user.role)), pagination: pageInfo({ page, limit, total }) } });
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id); requireFields(req.body, ['status']);
  const order = await changeOrderStatus({ orderId: req.params.id, to: req.body.status, actor: { id: req.user.id, role: 'admin' }, getStripe: req.app.locals.getStripe });
  res.json({ success: true, data: { order: presentOrder(order, req.user.role) } });
});

export const cancelMyOrder = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id);
  const order = await cancelOrder({ orderId: req.params.id, actor: { id: req.user.id, role: 'customer' }, getStripe: req.app.locals.getStripe });
  res.json({ success: true, data: { order: presentOrder(order, req.user.role) } });
});
