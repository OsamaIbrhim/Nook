import { QuoteRequest } from '../contract/schemas.js';
import { parseWith } from './parse.js';

export function parseQuoteRequest(body) {
  const { lines } = parseWith(QuoteRequest, body, 'Invalid cart');
  return lines.map(({ productId, quantity }) => ({ productId: productId.toLowerCase(), quantity }));
}
