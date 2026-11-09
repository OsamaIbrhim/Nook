import mongoose from 'mongoose';
import { Order } from '../models/Order.js';
import { WebhookEvent } from '../models/WebhookEvent.js';
import { AWAITING_PAYMENT } from '../domain/orderStatus.js';
import { cancelUnpaidOrder } from './inventoryService.js';
import { refundPayment } from './paymentService.js';
import { inTransaction } from './transaction.js';

const recordEvent = (event, session) => WebhookEvent.create([{ stripeEventId: event.id, type: event.type }], { session });
const orderIdOf = (checkout) => (mongoose.isValidObjectId(checkout.metadata?.orderId) ? checkout.metadata.orderId : null);
const isDuplicateEvent = (error) => error?.code === 11000 && 'stripeEventId' in (error.keyPattern ?? {});

async function applyPayment(event, stripe) {
  const checkout = event.data.object;
  const orderId = orderIdOf(checkout);
  let refunded = false;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const outcome = await inTransaction(async (session) => {
      if (!orderId) { await recordEvent(event, session); return 'done'; }
      const claimed = await Order.findOneAndUpdate(
        { _id: orderId, ...AWAITING_PAYMENT },
        { $set: { status: 'processing', paymentStatus: 'paid', stripePaymentIntentId: checkout.payment_intent }, $push: { statusHistory: { status: 'processing', at: new Date() } } },
        { session }
      );
      if (!claimed) {
        const order = await Order.findById(orderId).session(session);
        if (order?.status === 'cancelled' && order.paymentStatus !== 'refunded') {
          if (!refunded) return 'refund_required';
          await Order.updateOne(
            { _id: orderId, status: 'cancelled', paymentStatus: order.paymentStatus },
            { $set: { paymentStatus: 'refunded', stripePaymentIntentId: checkout.payment_intent }, $push: { statusHistory: { status: 'cancelled', at: new Date(), note: 'payment received after cancellation; refunded' } } },
            { session }
          );
        }
      }
      await recordEvent(event, session);
      return 'done';
    });
    if (outcome === 'done') return;
    await refundPayment(stripe, { orderId, paymentIntentId: checkout.payment_intent });
    refunded = true;
  }
  throw new Error(`Payment for order ${orderId} could not be settled after a refund`);
}

const applyCheckoutClosed = (event) => inTransaction(async (session) => {
  const orderId = orderIdOf(event.data.object);
  if (orderId) await cancelUnpaidOrder({ filter: { _id: orderId }, paymentStatus: event.type.endsWith('failed') ? 'failed' : 'unpaid', session });
  await recordEvent(event, session);
});

const applyChargeRefunded = (event) => inTransaction(async (session) => {
  const charge = event.data.object;
  if (charge.refunded === true && charge.payment_intent) {
    await Order.updateOne({ stripePaymentIntentId: charge.payment_intent, paymentStatus: 'paid' }, { $set: { paymentStatus: 'refunded' } }, { session });
  }
  await recordEvent(event, session);
});

const recordOnly = (event) => inTransaction((session) => recordEvent(event, session));

const handlers = {
  'checkout.session.completed': applyPayment,
  'checkout.session.async_payment_succeeded': applyPayment,
  'checkout.session.expired': applyCheckoutClosed,
  'checkout.session.async_payment_failed': applyCheckoutClosed,
  'charge.refunded': applyChargeRefunded
};

export async function handleStripeEvent(event, stripe) {
  if (await WebhookEvent.exists({ stripeEventId: event.id })) return;
  try {
    await (handlers[event.type] ?? recordOnly)(event, stripe);
  } catch (error) {
    if (!isDuplicateEvent(error)) throw error;
  }
}
