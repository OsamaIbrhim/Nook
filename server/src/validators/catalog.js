import { z } from 'zod';
import { ObjectId } from '../contract/schemas.js';
import { parseWith } from './parse.js';

const MAX_IDS = 24;
const idsMessage = `must be 1 to ${MAX_IDS} comma separated 24 character hex ids`;
const ProductFilters = z.object({
  ids: z.array(ObjectId, { error: idsMessage }).min(1, idsMessage).max(MAX_IDS, idsMessage).optional(),
  exclude: ObjectId.optional()
});

export function parseProductIdFilters(query) {
  const { ids, exclude } = parseWith(ProductFilters, {
    ids: query.ids ? (typeof query.ids === 'string' ? query.ids.split(',') : []) : undefined,
    exclude: query.exclude || undefined
  }, 'Invalid product filter');
  return { ids: ids?.map((id) => id.toLowerCase()), exclude: exclude?.toLowerCase() };
}
