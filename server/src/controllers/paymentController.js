import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Order } from '../models/Order.js';
import { WebhookEvent } from '../models/WebhookEvent.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { assertObjectId, requireFields } from '../validators/common.js';
import { restoreOrderInventory } from '../services/inventoryService.js';
import { shopPolicy } from '../config/shopPolicy.js';
import { isAwaitingPayment } from '../domain/orderStatus.js';
import { toMinorUnits } from '../domain/money.js';
import { checkoutSessionExpiryUnix, isExpired } from '../domain/reservation.js';

const clientBaseUrl = env.clientUrl.split(',')[0].trim().replace(/\/$/, '');

export const createCheckoutSession = asyncHandler(async (req, res) => {
  requireFields(req.body, ['orderId']); assertObjectId(req.body.orderId, 'orderId');
  const { getStripe, now } = req.app.locals;
  const order = await Order.findOne({ _id: req.body.orderId, user: req.user.id });
  if (!order) throw new ApiError(404, 'Order not found');
  if (!isAwaitingPayment(order)) throw new ApiError(409, 'Order is not eligible for checkout');
  if (isExpired(order, now())) throw new ApiError(409, 'Inventory reservation has expired; cancel this order and create another');
  if (order.stripeCheckoutSessionId) {
    const existing = await getStripe().checkout.sessions.retrieve(order.stripeCheckoutSessionId);
    if (existing.status === 'open') return res.json({ success: true, data: { sessionId: existing.id, url: existing.url } });
  }
  const session = await getStripe().checkout.sessions.create({
    mode: 'payment',
    customer_email: req.user.email,
    line_items: order.items.map((item) => ({ price_data: { currency: order.currency, product_data: { name: item.name, ...(item.image && { images: [item.image.startsWith('http') ? item.image : new URL(item.image.replace(/^\//, ''), `${clientBaseUrl}/`).toString()] }) }, unit_amount: toMinorUnits(item.unitPrice) }, quantity: item.quantity })),
    metadata: { orderId: order.id, userId: req.user.id },
    payment_intent_data: { metadata: { orderId: order.id } },
    success_url: `${clientBaseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${clientBaseUrl}/orders/${order.id}`,
    expires_at: checkoutSessionExpiryUnix(now(), shopPolicy)
  });
  order.stripeCheckoutSessionId = session.id;
  order.reservationExpiresAt = new Date(session.expires_at * 1000);
  await order.save();
  res.status(201).json({ success: true, data: { sessionId: session.id, url: session.url } });
});

export const stripeWebhook = async (req, res, next) => {
  try {
    if (!env.stripeWebhookSecret) throw new ApiError(503, 'Stripe webhook is not configured');
    const event = req.app.locals.getStripe().webhooks.constructEvent(req.body, req.headers['stripe-signature'], env.stripeWebhookSecret);
    if (await WebhookEvent.exists({ stripeEventId: event.id })) return res.json({ received: true });
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await WebhookEvent.create([{ stripeEventId: event.id, type: event.type }], { session });
        if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
          const checkout = event.data.object;
          const order = await Order.findById(checkout.metadata?.orderId).session(session);
          if (order && order.paymentStatus !== 'paid') {
            order.paymentStatus = 'paid'; order.status = 'processing'; order.stripePaymentIntentId = checkout.payment_intent;
            order.statusHistory.push({ status: 'processing' }); await order.save({ session });
          }
        }
        if (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') {
          const checkout = event.data.object;
          const order = await Order.findById(checkout.metadata?.orderId).session(session);
          if (order && isAwaitingPayment(order)) {
            await restoreOrderInventory(order, session); order.paymentStatus = event.type.endsWith('failed') ? 'failed' : 'unpaid'; order.status = 'cancelled';
            order.statusHistory.push({ status: 'cancelled' }); await order.save({ session });
          }
        }
      });
    } finally { await session.endSession(); }
    res.json({ received: true });
  } catch (error) { next(error); }
};
