import { invalidRequest, isProductId } from './common.js';

const MAX_IDS = 24;

export function parseProductIdFilters(query) {
  const fieldErrors = [];
  let ids;
  if (query.ids) {
    ids = typeof query.ids === 'string' ? query.ids.split(',') : [];
    if (!ids.length || ids.length > MAX_IDS || !ids.every(isProductId)) fieldErrors.push({ field: 'ids', message: `must be 1 to ${MAX_IDS} comma separated 24 character hex ids` });
  }
  if (query.exclude && !isProductId(query.exclude)) fieldErrors.push({ field: 'exclude', message: 'must be a 24 character hex id' });
  if (fieldErrors.length) throw invalidRequest('Invalid product filter', fieldErrors);
  return { ids: ids?.map((id) => id.toLowerCase()), exclude: query.exclude?.toLowerCase() };
}
