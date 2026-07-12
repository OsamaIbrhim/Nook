import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const signAccessToken = (user) => jwt.sign(
  { sub: user.id, role: user.role }, env.accessSecret, { expiresIn: env.accessTtl }
);

export const signRefreshToken = (user, tokenId) => jwt.sign(
  { sub: user.id, jti: tokenId, type: 'refresh' }, env.refreshSecret, { expiresIn: env.refreshTtl }
);

export const verifyAccessToken = (token) => jwt.verify(token, env.accessSecret);
export const verifyRefreshToken = (token) => jwt.verify(token, env.refreshSecret);
export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
