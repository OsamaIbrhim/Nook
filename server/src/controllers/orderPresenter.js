import { actionsFor } from '../domain/orderStatus.js';
import { orderCode } from '../domain/orderCode.js';

export function presentOrder(order, role) {
  const { idempotencyKey, requestFingerprint, ...visible } = typeof order.toJSON === 'function' ? order.toJSON() : order;
  return { ...visible, code: orderCode(visible._id), actions: actionsFor(visible, role) };
}
