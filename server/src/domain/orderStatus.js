export const ORDER_STATUSES = Object.freeze(['pending', 'processing', 'shipped', 'delivered', 'cancelled']);
export const PAYMENT_STATUSES = Object.freeze(['unpaid', 'paid', 'failed', 'refunded']);

export const TRANSITIONS = Object.freeze({
  pending: Object.freeze(['processing', 'cancelled']),
  processing: Object.freeze(['shipped', 'cancelled']),
  shipped: Object.freeze(['delivered']),
  delivered: Object.freeze([]),
  cancelled: Object.freeze([])
});

export const AWAITING_PAYMENT = Object.freeze({ status: 'pending', paymentStatus: 'unpaid' });

export const isAwaitingPayment = (order) => order.status === AWAITING_PAYMENT.status && order.paymentStatus === AWAITING_PAYMENT.paymentStatus;

export function transitionBlocker(order, to) {
  if (!TRANSITIONS[order.status]?.includes(to)) return 'not_allowed';
  if (to === 'processing' && order.paymentStatus !== 'paid') return 'payment_required';
  return null;
}

export const canTransition = (order, to) => transitionBlocker(order, to) === null;

export function actionsFor(order, role) {
  const nextStatuses = role === 'admin' ? ORDER_STATUSES.filter((to) => canTransition(order, to)) : [];
  return {
    canPay: role === 'customer' && isAwaitingPayment(order),
    canCancel: role === 'admin' ? nextStatuses.includes('cancelled') : isAwaitingPayment(order),
    nextStatuses
  };
}
