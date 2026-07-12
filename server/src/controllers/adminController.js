import { User } from '../models/User.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { assertObjectId, parsePositiveInt } from '../validators/common.js';

export const dashboardStats = asyncHandler(async (_req, res) => {
  const [users, products, orders, revenue] = await Promise.all([
    User.countDocuments(), Product.countDocuments({ isActive: true }), Order.countDocuments(),
    Order.aggregate([{ $match: { paymentStatus: 'paid' } }, { $group: { _id: null, total: { $sum: '$total' } } }])
  ]);
  res.json({ success: true, data: { users, products, orders, revenue: revenue[0]?.total || 0 } });
});
export const listUsers = asyncHandler(async (req, res) => {
  const page = parsePositiveInt(req.query.page, 1); const limit = parsePositiveInt(req.query.limit, 20, 100);
  const filter = req.query.search ? { $or: [{ name: new RegExp(String(req.query.search).slice(0, 80), 'i') }, { email: new RegExp(String(req.query.search).slice(0, 80), 'i') }] } : {};
  const [users, total] = await Promise.all([User.find(filter).sort('-createdAt').skip((page - 1) * limit).limit(limit).lean(), User.countDocuments(filter)]);
  res.json({ success: true, data: { users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
});
export const updateUser = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id);
  const updates = {};
  if (req.body.role !== undefined) { if (!['admin', 'customer'].includes(req.body.role)) throw new ApiError(400, 'Invalid role'); updates.role = req.body.role; }
  if (req.body.isActive !== undefined) {
    if (![true, false, 'true', 'false'].includes(req.body.isActive)) throw new ApiError(400, 'isActive must be a boolean');
    updates.isActive = req.body.isActive === true || req.body.isActive === 'true';
  }
  const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ success: true, data: { user } });
});
