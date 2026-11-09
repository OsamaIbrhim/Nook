import crypto from 'node:crypto';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { shopPolicy } from '../config/shopPolicy.js';
import { priceCart } from '../domain/pricing.js';
import { ApiError } from '../utils/ApiError.js';
import { releaseExpiredReservations } from './inventoryService.js';
import { inTransaction } from './transaction.js';

const ADDRESS_FIELDS = ['name', 'line1', 'line2', 'city', 'state', 'postalCode', 'country', 'phone'];

function fingerprintOf(lines, shippingAddress) {
  const merged = new Map();
  for (const { productId, quantity } of lines) merged.set(productId, (merged.get(productId) ?? 0) + quantity);
  const address = Object.fromEntries(ADDRESS_FIELDS.map((field) => {
    const value = String(shippingAddress[field] ?? '').trim();
    return [field, field === 'country' ? value.toUpperCase() : value];
  }));
  return crypto.createHash('sha256').update(JSON.stringify({ items: [...merged].sort(([a], [b]) => (a < b ? -1 : 1)), address })).digest('hex');
}

const unavailable = () => new ApiError(400, 'One or more products are unavailable');
const overLimit = () => new ApiError(400, `Item quantity must be between 1 and ${shopPolicy.maxLineQuantity}`);

function insufficientStock(shortLines, byId) {
  const [first] = shortLines;
  return new ApiError(409, `Insufficient stock for ${byId.get(first.productId).name}`, shortLines.map((line) => ({ productId: line.productId, available: byId.get(line.productId).stock })), { code: 'insufficient_stock' });
}

function replayOf(existing, fingerprint) {
  if (existing.requestFingerprint !== fingerprint) {
    throw new ApiError(409, 'This Idempotency-Key was already used for a different order request', undefined, { code: 'idempotency_key_conflict' });
  }
  return { order: existing, created: false };
}

async function reserveAndCreate({ userId, lines, shippingAddress, idempotencyKey, fingerprint }) {
  return inTransaction(async (session) => {
    if (idempotencyKey) {
      const existing = await Order.findOne({ user: userId, idempotencyKey }).session(session);
      if (existing) return replayOf(existing, fingerprint);
    }
    const products = await Product.find({ _id: { $in: lines.map((line) => line.productId) } }).session(session);
    const byId = new Map(products.map((product) => [product.id, product]));
    const quote = priceCart(lines, products, shopPolicy);
    if (quote.lines.some((line) => line.issue === 'not_found' || line.issue === 'inactive')) throw unavailable();
    if (quote.lines.some((line) => line.issue === 'quantity_capped')) throw overLimit();
    const short = quote.lines.filter((line) => line.status !== 'ok');
    if (short.length) throw insufficientStock(short, byId);

    for (const line of quote.lines) {
      const reserved = await Product.updateOne({ _id: line.productId, stock: { $gte: line.quantity } }, { $inc: { stock: -line.quantity } }, { session });
      if (!reserved.modifiedCount) throw insufficientStock([line], byId);
    }
    const items = quote.lines.map((line) => {
      const product = byId.get(line.productId);
      return { product: line.productId, name: product.name, image: product.images[0]?.url, unitPrice: line.unitPrice, quantity: line.quantity, lineTotal: line.lineTotal };
    });
    const [order] = await Order.create([{
      user: userId, items, shippingAddress, subtotal: quote.subtotal, shipping: quote.shipping, total: quote.total, currency: shopPolicy.currency,
      ...(idempotencyKey && { idempotencyKey, requestFingerprint: fingerprint })
    }], { session });
    return { order, created: true };
  });
}

const isDuplicateKey = (error) => error?.code === 11000 && 'idempotencyKey' in (error.keyPattern ?? {});

export async function placeOrder({ userId, lines, shippingAddress, idempotencyKey, now }) {
  const fingerprint = fingerprintOf(lines, shippingAddress);
  const attempt = () => reserveAndCreate({ userId, lines, shippingAddress, idempotencyKey, fingerprint });
  try {
    return await attempt();
  } catch (error) {
    if (isDuplicateKey(error)) return replayOf(await Order.findOne({ user: userId, idempotencyKey }), fingerprint);
    const productIds = lines.map((line) => line.productId);
    if (error.code !== 'insufficient_stock' || !(await releaseExpiredReservations({ productIds, now }))) throw error;
    return attempt();
  }
}
