import { ORDER_STATUSES, PAYMENT_STATUSES } from '../domain/orderStatus.js';
import { invalidRequest } from './common.js';

export function parseOrderFilters(query) {
  const fieldErrors = [];
  const filter = {};
  for (const [field, allowed] of [['status', ORDER_STATUSES], ['paymentStatus', PAYMENT_STATUSES]]) {
    if (!query[field]) continue;
    if (typeof query[field] === 'string' && allowed.includes(query[field])) filter[field] = query[field];
    else fieldErrors.push({ field, message: `must be one of ${allowed.join(', ')}` });
  }
  if (fieldErrors.length) throw invalidRequest('Invalid order filter', fieldErrors);
  return filter;
}
