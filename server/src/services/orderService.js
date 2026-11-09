import { Order } from '../models/Order.js';
import { ApiError } from '../utils/ApiError.js';
import { isAwaitingPayment, isConsistent, transitionBlocker } from '../domain/orderStatus.js';
import { returnReservedStock } from './inventoryService.js';
import { expireCheckoutSession, refundPayment } from './paymentService.js';
import { inTransaction } from './transaction.js';

const notFound = () => new ApiError(404, 'Order not found', undefined, { code: 'order_not_found' });
const ownerFilter = (actor) => (actor.role === 'admin' ? {} : { user: actor.id });

function assertCancellable(order, actor) {
  if (actor.role === 'admin') {
    if (transitionBlocker(order, 'cancelled')) throw new ApiError(409, `Cannot change status from ${order.status} to cancelled`, undefined, { code: 'not_cancellable' });
  } else if (!isAwaitingPayment(order)) {
    throw new ApiError(409, 'Only pending unpaid orders can be cancelled', undefined, { code: 'not_cancellable' });
  }
}

async function claimCancellation(order, actor, paymentStatus) {
  if (!isConsistent({ status: 'cancelled', paymentStatus })) throw new Error(`Refusing to persist a cancelled order with paymentStatus ${paymentStatus}`);
  const refunded = paymentStatus !== order.paymentStatus;
  return inTransaction(async (session) => {
    const original = await Order.findOneAndUpdate(
      { _id: order._id, status: order.status, paymentStatus: { $in: [order.paymentStatus, paymentStatus] }, ...ownerFilter(actor) },
      {
        $set: { status: 'cancelled', paymentStatus, inventoryReserved: false },
        $push: { statusHistory: { status: 'cancelled', at: new Date(), by: actor.id, ...(refunded && { note: 'payment refunded' }) } }
      },
      { session, new: false }
    );
    if (!original) return false;
    await returnReservedStock(original, session);
    return true;
  });
}

async function settlePayment(order, getStripe) {
  if (isAwaitingPayment(order) && order.stripeCheckoutSessionId) {
    await expireCheckoutSession(getStripe(), { orderId: order.id, sessionId: order.stripeCheckoutSessionId });
    return order.paymentStatus;
  }
  if (order.paymentStatus !== 'paid') return order.paymentStatus;
  if (!order.stripePaymentIntentId) {
    throw new ApiError(409, 'This paid order has no payment reference to refund; refund it in Stripe and retry', undefined, { code: 'refund_unavailable' });
  }
  await refundPayment(getStripe(), { orderId: order.id, paymentIntentId: order.stripePaymentIntentId });
  return 'refunded';
}

async function cancelLoadedOrder(order, actor, getStripe) {
  const paymentStatus = await settlePayment(order, getStripe);
  if (!(await claimCancellation(order, actor, paymentStatus))) {
    const current = await Order.findOne({ _id: order._id, ...ownerFilter(actor) });
    if (current?.status === 'cancelled') return current;
    throw new ApiError(409, 'Order changed while it was being cancelled; reload and retry', undefined, { code: 'order_changed' });
  }
  return Order.findById(order._id);
}

export async function cancelOrder({ orderId, actor, getStripe }) {
  const order = await Order.findOne({ _id: orderId, ...ownerFilter(actor) });
  if (!order) throw notFound();
  if (order.status === 'cancelled') return order;
  assertCancellable(order, actor);
  return cancelLoadedOrder(order, actor, getStripe);
}

export async function changeOrderStatus({ orderId, to, actor, getStripe }) {
  const order = await Order.findById(orderId);
  if (!order) throw notFound();
  const blocker = transitionBlocker(order, to);
  if (blocker === 'not_allowed') throw new ApiError(409, `Cannot change status from ${order.status} to ${to}`, undefined, { code: 'transition_not_allowed' });
  if (blocker === 'payment_required') throw new ApiError(409, 'An unpaid order cannot be processed', undefined, { code: 'payment_required' });
  if (to === 'cancelled') return cancelLoadedOrder(order, actor, getStripe);
  const updated = await Order.findOneAndUpdate(
    { _id: order._id, status: order.status, paymentStatus: order.paymentStatus },
    { $set: { status: to }, $push: { statusHistory: { status: to, at: new Date(), by: actor.id } } },
    { new: true }
  );
  if (!updated) throw new ApiError(409, 'Order changed while its status was being updated; reload and retry', undefined, { code: 'order_changed' });
  return updated;
}
