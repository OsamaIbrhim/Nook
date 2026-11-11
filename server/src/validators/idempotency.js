import { IdempotencyKey } from '../contract/schemas.js';
import { ApiError } from '../utils/ApiError.js';

export function parseIdempotencyKey(header) {
  if (header === undefined) return undefined;
  const parsed = IdempotencyKey.safeParse(header);
  if (!parsed.success) throw new ApiError(400, 'Idempotency-Key must be a UUID', undefined, { code: 'invalid_idempotency_key' });
  return parsed.data.toLowerCase();
}
