import { z } from 'zod';
import { ORDER_STATUSES, PAYMENT_STATUSES } from '../domain/orderStatus.js';
import { OrderRequest } from '../contract/schemas.js';
import { invalidRequest } from './common.js';
import { parseWith } from './parse.js';

const oneOf = (values) => z.enum(values, { error: `must be one of ${values.join(', ')}` }).optional();
const OrderFilters = z.object({ status: oneOf(ORDER_STATUSES), paymentStatus: oneOf(PAYMENT_STATUSES) });

export function parseOrderFilters(query) {
  const present = Object.fromEntries(['status', 'paymentStatus'].filter((field) => query[field]).map((field) => [field, query[field]]));
  return parseWith(OrderFilters, present, 'Invalid order filter');
}

const orderRequestMessage = (maxLineQuantity) => ([first]) => {
  if (/^items\[\d+\]\.product$/.test(first.field)) return 'Invalid product';
  if (/^items\[\d+\]\.quantity$/.test(first.field)) return `Item quantity must be between 1 and ${maxLineQuantity}`;
  if (first.field === 'items') return 'Cart must contain at least one item';
  return `Invalid order: ${first.field} ${first.message}`;
};

export function parseOrderRequest(body, { maxLineQuantity }) {
  const { items, shippingAddress } = parseWith(OrderRequest, body, orderRequestMessage(maxLineQuantity));
  const tooMany = items.flatMap((item, index) => (item.quantity > maxLineQuantity ? [{ field: `items[${index}].quantity`, message: `must be at most ${maxLineQuantity}` }] : []));
  if (tooMany.length) throw invalidRequest(`Item quantity must be between 1 and ${maxLineQuantity}`, tooMany);
  return { lines: items.map(({ product, quantity }) => ({ productId: product.toLowerCase(), quantity })), shippingAddress };
}
