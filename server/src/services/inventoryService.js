import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { AWAITING_PAYMENT } from '../domain/orderStatus.js';
import { inTransaction } from './transaction.js';

export async function returnReservedStock(claimedOrder, session) {
  if (!claimedOrder.inventoryReserved) return false;
  await Product.bulkWrite(
    claimedOrder.items.map((item) => ({ updateOne: { filter: { _id: item.product }, update: { $inc: { stock: item.quantity } } } })),
    { session }
  );
  return true;
}

export async function cancelUnpaidOrder({ filter, paymentStatus = 'unpaid', session }) {
  const original = await Order.findOneAndUpdate(
    { ...AWAITING_PAYMENT, ...filter },
    { $set: { status: 'cancelled', paymentStatus, inventoryReserved: false }, $push: { statusHistory: { status: 'cancelled', at: new Date() } } },
    { session, new: false }
  );
  if (!original) return null;
  await returnReservedStock(original, session);
  return original;
}

export async function releaseExpiredReservations({ productIds, limit = 50, now }) {
  const unstarted = { inventoryReserved: true, stripeCheckoutSessionId: { $exists: false }, reservationExpiresAt: { $lte: now } };
  const candidates = await Order.find({ ...AWAITING_PAYMENT, ...unstarted, ...(productIds && { 'items.product': { $in: productIds } }) })
    .sort({ reservationExpiresAt: 1 }).limit(limit).select('_id').lean();
  let released = 0;
  for (const candidate of candidates) {
    try {
      const cancelled = await inTransaction((session) => cancelUnpaidOrder({ filter: { _id: candidate._id, ...unstarted }, session }));
      if (cancelled) released += 1;
    } catch (error) { console.error(`Failed to release reservation ${candidate._id}:`, error.message); }
  }
  return released;
}
