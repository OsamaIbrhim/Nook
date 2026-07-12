import crypto from 'node:crypto';
import { User } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { hashToken, signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/tokens.js';
import { refreshCookieName, refreshCookieOptions } from '../utils/cookies.js';
import { requireFields } from '../validators/common.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function issueTokens(user, req, res) {
  const tokenId = crypto.randomUUID();
  const refreshToken = signRefreshToken(user, tokenId);
  const decoded = verifyRefreshToken(refreshToken);
  await RefreshToken.create({ user: user.id, tokenHash: hashToken(refreshToken), expiresAt: new Date(decoded.exp * 1000), userAgent: req.get('user-agent'), ip: req.ip });
  res.cookie(refreshCookieName, refreshToken, refreshCookieOptions);
  return signAccessToken(user);
}

export const register = asyncHandler(async (req, res) => {
  requireFields(req.body, ['name', 'email', 'password']);
  const email = String(req.body.email).trim().toLowerCase();
  if (!emailPattern.test(email)) throw new ApiError(400, 'Invalid email address');
  if (String(req.body.password).length < 8) throw new ApiError(400, 'Password must be at least 8 characters');
  if (await User.exists({ email })) throw new ApiError(409, 'Email is already registered');
  const user = await User.create({ name: req.body.name, email, password: req.body.password });
  const accessToken = await issueTokens(user, req, res);
  res.status(201).json({ success: true, data: { user, accessToken } });
});

export const login = asyncHandler(async (req, res) => {
  requireFields(req.body, ['email', 'password']);
  const user = await User.findOne({ email: String(req.body.email).trim().toLowerCase() }).select('+password');
  if (!user || !user.isActive || !(await user.comparePassword(req.body.password))) throw new ApiError(401, 'Invalid email or password');
  const accessToken = await issueTokens(user, req, res);
  user.password = undefined;
  res.json({ success: true, data: { user, accessToken } });
});

export const refresh = asyncHandler(async (req, res) => {
  const rawToken = req.cookies[refreshCookieName];
  if (!rawToken) throw new ApiError(401, 'Refresh token required');
  let payload;
  try { payload = verifyRefreshToken(rawToken); } catch { throw new ApiError(401, 'Invalid or expired refresh token'); }
  const stored = await RefreshToken.findOne({ tokenHash: hashToken(rawToken) });
  if (!stored || stored.revokedAt || stored.expiresAt <= new Date()) {
    if (payload?.sub) await RefreshToken.updateMany({ user: payload.sub, revokedAt: null }, { revokedAt: new Date() });
    throw new ApiError(401, 'Refresh token reuse detected');
  }
  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw new ApiError(401, 'User is unavailable');
  stored.revokedAt = new Date();
  stored.replacedBy = payload.jti;
  await stored.save();
  const accessToken = await issueTokens(user, req, res);
  res.json({ success: true, data: { accessToken } });
});

export const logout = asyncHandler(async (req, res) => {
  const rawToken = req.cookies[refreshCookieName];
  if (rawToken) await RefreshToken.updateOne({ tokenHash: hashToken(rawToken), revokedAt: null }, { revokedAt: new Date() });
  res.clearCookie(refreshCookieName, refreshCookieOptions);
  res.status(204).send();
});

export const me = asyncHandler(async (req, res) => res.json({ success: true, data: { user: req.user } }));
