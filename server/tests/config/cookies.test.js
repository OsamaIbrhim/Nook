import '../helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRefreshCookieOptions, refreshCookieOptions } from '../../src/utils/cookies.js';

const base = { cookieSecure: false, cookieSameSite: undefined, refreshTtlMs: 604_800_000 };

test('insecure development cookies default to SameSite Lax', () => {
  assert.deepEqual(buildRefreshCookieOptions(base), { httpOnly: true, secure: false, sameSite: 'lax', path: '/api/v1/auth', maxAge: 604_800_000 });
});

test('secure cookies default to SameSite None, the cross-site setup the live client still uses', () => {
  const options = buildRefreshCookieOptions({ ...base, cookieSecure: true });
  assert.equal(options.sameSite, 'none');
  assert.equal(options.secure, true);
});

test('COOKIE_SAMESITE overrides the default, so the move to same-origin hosting needs no code change', () => {
  assert.equal(buildRefreshCookieOptions({ ...base, cookieSecure: true, cookieSameSite: 'lax' }).sameSite, 'lax');
  assert.equal(buildRefreshCookieOptions({ ...base, cookieSecure: true, cookieSameSite: 'strict' }).sameSite, 'strict');
});

test('SameSite None without Secure is rejected because browsers drop such cookies', () => {
  assert.throws(() => buildRefreshCookieOptions({ ...base, cookieSameSite: 'none' }), /Secure/);
});

test('an unknown SameSite value is rejected', () => {
  assert.throws(() => buildRefreshCookieOptions({ ...base, cookieSameSite: 'maybe' }), /COOKIE_SAMESITE/);
});

test('the maximum age follows the refresh token lifetime', () => {
  assert.equal(buildRefreshCookieOptions({ ...base, refreshTtlMs: 3_600_000 }).maxAge, 3_600_000);
  assert.equal(refreshCookieOptions.maxAge, 604_800_000);
});
