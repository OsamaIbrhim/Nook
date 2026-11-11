import crypto from 'node:crypto';
import { ApiError } from '../utils/ApiError.js';

const digest = (value) => crypto.createHash('sha256').update(value).digest();

export function requireCronSecret(req, _res, next) {
  const { cronSecret } = req.app.locals;
  if (!cronSecret) return next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
  const presented = req.get('authorization') ?? '';
  if (!crypto.timingSafeEqual(digest(presented), digest(`Bearer ${cronSecret}`))) {
    return next(new ApiError(401, 'Invalid cron credentials', undefined, { code: 'invalid_cron_secret' }));
  }
  next();
}
