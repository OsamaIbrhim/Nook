import { env } from '../config/env.js';

export const refreshCookieName = 'refreshToken';

const SAME_SITE_VALUES = ['lax', 'strict', 'none'];

export function buildRefreshCookieOptions({ cookieSecure, cookieSameSite, refreshTtlMs }) {
  const sameSite = cookieSameSite ?? (cookieSecure ? 'none' : 'lax');
  if (!SAME_SITE_VALUES.includes(sameSite)) throw new Error(`COOKIE_SAMESITE must be one of ${SAME_SITE_VALUES.join(', ')}`);
  if (sameSite === 'none' && !cookieSecure) throw new Error('COOKIE_SAMESITE=none requires a Secure cookie');
  return { httpOnly: true, secure: cookieSecure, sameSite, path: '/api/v1/auth', maxAge: refreshTtlMs };
}

export const refreshCookieOptions = buildRefreshCookieOptions(env);
