import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { verifyAccessToken } from '../utils/tokens.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const protect = asyncHandler(async (req, _res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) throw new ApiError(401, 'Authentication required');
  let payload;
  try { payload = verifyAccessToken(token); } catch { throw new ApiError(401, 'Invalid or expired access token'); }
  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw new ApiError(401, 'User is unavailable');
  req.user = user;
  next();
});

export const authorize = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return next(new ApiError(403, 'Insufficient permissions'));
  next();
};
