import crypto from 'node:crypto';
import { User } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { hashToken, signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/tokens.js';
import { refreshCookieName, refreshCookieOptions } from '../utils/cookies.js';
import { parseLoginRequest, parseRegisterRequest } from '../validators/auth.js';

async function issueTokens(user, req, res) {
  const tokenId = crypto.randomUUID();
  const refreshToken = signRefreshToken(user, tokenId);
  const decoded = verifyRefreshToken(refreshToken);
  await RefreshToken.create({ user: user.id, tokenHash: hashToken(refreshToken), expiresAt: new Date(decoded.exp * 1000), userAgent: req.get('user-agent'), ip: req.ip });
  res.cookie(refreshCookieName, refreshToken, refreshCookieOptions);
  return signAccessToken(user);
}

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = parseRegisterRequest(req.body);
  if (await User.exists({ email })) throw new ApiError(409, 'Email is already registered');
  const user = await User.create({ name, email, password });
  const accessToken = await issueTokens(user, req, res);
  res.status(201).json({ success: true, data: { user, accessToken } });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = parseLoginRequest(req.body);
  const user = await User.findOne({ email }).select('+password');
  if (!user || !user.isActive || !(await user.comparePassword(password))) throw new ApiError(401, 'Invalid email or password');
  const accessToken = await issueTokens(user, req, res);
  user.password = undefined;
  res.json({ success: true, data: { user, accessToken } });
});

export const refresh = asyncHandler(async (req, res) => {
  const rawToken = req.cookies[refreshCookieName];
  if (!rawToken) return res.status(204).send();
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
  res.json({ success: true, data: { user, accessToken } });
});

export const logout = asyncHandler(async (req, res) => {
  const rawToken = req.cookies[refreshCookieName];
  if (rawToken) await RefreshToken.updateOne({ tokenHash: hashToken(rawToken), revokedAt: null }, { revokedAt: new Date() });
  res.clearCookie(refreshCookieName, refreshCookieOptions);
  res.status(204).send();
});

export const me = asyncHandler(async (req, res) => res.json({ success: true, data: { user: req.user } }));
