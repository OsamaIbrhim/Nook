import { ApiError } from '../utils/ApiError.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseIdempotencyKey(header) {
  if (header === undefined) return undefined;
  if (!UUID.test(header)) throw new ApiError(400, 'Idempotency-Key must be a UUID', undefined, { code: 'invalid_idempotency_key' });
  return header.toLowerCase();
}
