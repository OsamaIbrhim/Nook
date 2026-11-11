import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js';

export const invalidRequest = (message, fieldErrors) => new ApiError(400, message, undefined, { code: 'validation_failed', fieldErrors });

export const isProductId = (value) => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);

export function requireFields(body, fields, fieldPrefix = '') {
  const missing = fields.filter((field) => body[field] === undefined || body[field] === null || body[field] === '');
  if (missing.length) {
    throw invalidRequest(`Missing required fields: ${missing.join(', ')}`, missing.map((field) => ({ field: `${fieldPrefix}${field}`, message: 'is required' })));
  }
}

export function assertObjectId(value, label = 'id') {
  if (!mongoose.isValidObjectId(value)) throw new ApiError(400, `Invalid ${label}`);
}

export function parsePositiveInt(value, fallback, max = Infinity) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) && number > 0 ? Math.min(number, max) : fallback;
}
