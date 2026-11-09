import { invalidRequest, isProductId } from './common.js';

const MAX_QUOTE_LINES = 50;

export function parseQuoteRequest(body) {
  const lines = body?.lines;
  if (!Array.isArray(lines) || lines.length < 1 || lines.length > MAX_QUOTE_LINES) {
    throw invalidRequest('Invalid cart', [{ field: 'lines', message: `must contain between 1 and ${MAX_QUOTE_LINES} lines` }]);
  }
  const fieldErrors = [];
  lines.forEach((line, index) => {
    if (!isProductId(line?.productId)) fieldErrors.push({ field: `lines[${index}].productId`, message: 'must be a 24 character hex id' });
    if (!Number.isSafeInteger(line?.quantity) || line.quantity < 1) fieldErrors.push({ field: `lines[${index}].quantity`, message: 'must be a whole number of at least 1' });
  });
  if (fieldErrors.length) throw invalidRequest('Invalid cart', fieldErrors);
  return lines.map(({ productId, quantity }) => ({ productId: productId.toLowerCase(), quantity }));
}
