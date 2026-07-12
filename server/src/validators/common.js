import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js';

export function requireFields(body, fields) {
  const missing = fields.filter((field) => body[field] === undefined || body[field] === null || body[field] === '');
  if (missing.length) throw new ApiError(400, `Missing required fields: ${missing.join(', ')}`);
}

export function assertObjectId(value, label = 'id') {
  if (!mongoose.isValidObjectId(value)) throw new ApiError(400, `Invalid ${label}`);
}

export function parsePositiveInt(value, fallback, max = Infinity) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) && number > 0 ? Math.min(number, max) : fallback;
}
