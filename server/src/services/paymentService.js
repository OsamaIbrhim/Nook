import { ApiError } from '../utils/ApiError.js';

const providerError = (message, code) => new ApiError(502, message, undefined, { code });

function logProviderFailure(action, error, context) {
  console.error(`Stripe ${action} failed`, { ...context, type: error.type, code: error.code, statusCode: error.statusCode, message: error.message });
}

export async function refundPayment(stripe, { orderId, paymentIntentId }) {
  try {
    await stripe.refunds.create({ payment_intent: paymentIntentId, metadata: { orderId } }, { idempotencyKey: `refund:${orderId}` });
  } catch (error) {
    if (error.code === 'charge_already_refunded') return;
    logProviderFailure('refund', error, { orderId });
    throw providerError('Refund could not be issued; the order was not changed', 'refund_failed');
  }
}

export async function expireCheckoutSession(stripe, { orderId, sessionId }) {
  try {
    await stripe.checkout.sessions.expire(sessionId);
    return;
  } catch (error) {
    if (error.type !== 'StripeInvalidRequestError') {
      logProviderFailure('session expiry', error, { orderId, sessionId });
      throw providerError('Checkout session could not be closed; the order was not changed', 'session_expiry_failed');
    }
  }
  let session;
  try { session = await stripe.checkout.sessions.retrieve(sessionId); } catch (error) {
    logProviderFailure('session lookup', error, { orderId, sessionId });
    throw providerError('Checkout session could not be closed; the order was not changed', 'session_expiry_failed');
  }
  if (session.status === 'complete') {
    throw new ApiError(409, 'Payment is being completed for this order, so it cannot be cancelled now', undefined, { code: 'payment_in_progress' });
  }
  if (session.status !== 'expired') throw providerError('Checkout session could not be closed; the order was not changed', 'session_expiry_failed');
}
