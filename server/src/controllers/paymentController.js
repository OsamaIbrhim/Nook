import Stripe from 'stripe';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Order } from '../models/Order.js';
import { WebhookEvent } from '../models/WebhookEvent.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { assertObjectId, requireFields } from '../validators/common.js';
import { restoreOrderInventory } from '../services/inventoryService.js';

const stripeClient = () => {
  if (!env.stripeSecret) throw new ApiError(503, 'Stripe is not configured');
  return new Stripe(env.stripeSecret);
};

export const createCheckoutSession = asyncHandler(async (req, res) => {
  requireFields(req.body, ['orderId']); assertObjectId(req.body.orderId, 'orderId');
  const order = await Order.findOne({ _id: req.body.orderId, user: req.user.id });
  if (!order) throw new ApiError(404, 'Order not found');
  if (order.status !== 'pending' || order.paymentStatus !== 'unpaid') throw new ApiError(409, 'Order is not eligible for checkout');
  if (order.reservationExpiresAt <= new Date()) throw new ApiError(409, 'Inventory reservation has expired; cancel this order and create another');
  if (order.stripeCheckoutSessionId) {
    const existing = await stripeClient().checkout.sessions.retrieve(order.stripeCheckoutSessionId);
    if (existing.status === 'open') return res.json({ success: true, data: { sessionId: existing.id, url: existing.url } });
  }
  const session = await stripeClient().checkout.sessions.create({
    mode: 'payment',
    customer_email: req.user.email,
    line_items: order.items.map((item) => ({ price_data: { currency: order.currency, product_data: { name: item.name, ...(item.image && { images: [item.image.startsWith('http') ? item.image : new URL(item.image, env.clientUrl.split(',')[0]).toString()] }) }, unit_amount: Math.round(item.unitPrice * 100) }, quantity: item.quantity })),
    metadata: { orderId: order.id, userId: req.user.id },
    payment_intent_data: { metadata: { orderId: order.id } },
    success_url: `${env.clientUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.clientUrl}/orders/${order.id}`,
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60
  });
  order.stripeCheckoutSessionId = session.id;
  order.reservationExpiresAt = new Date(session.expires_at * 1000);
  await order.save();
  res.status(201).json({ success: true, data: { sessionId: session.id, url: session.url } });
});

export const stripeWebhook = async (req, res, next) => {
  try {
    if (!env.stripeWebhookSecret) throw new ApiError(503, 'Stripe webhook is not configured');
    const event = stripeClient().webhooks.constructEvent(req.body, req.headers['stripe-signature'], env.stripeWebhookSecret);
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
          if (order && order.paymentStatus === 'unpaid' && order.status === 'pending') {
            await restoreOrderInventory(order, session); order.paymentStatus = event.type.endsWith('failed') ? 'failed' : 'unpaid'; order.status = 'cancelled';
            order.statusHistory.push({ status: 'cancelled' }); await order.save({ session });
          }
        }
      });
    } finally { await session.endSession(); }
    res.json({ received: true });
  } catch (error) { next(error); }
};
