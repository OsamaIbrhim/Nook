import '../helpers/env.js';
import { before, after, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { startDatabase } from '../helpers/replSet.js';
import { startApi } from '../helpers/apiClient.js';
import { bearer, createUser } from '../helpers/factories.js';
import { RefreshToken } from '../../src/models/RefreshToken.js';
import { User } from '../../src/models/User.js';

let db, api, ipCounter = 0;

before(async () => {
  db = await startDatabase();
  api = await startApi();
});

after(async () => {
  await api.stop();
  await db.stop();
});

beforeEach(async () => {
  await db.clear('User', 'RefreshToken');
});

const freshIp = () => `192.168.0.${++ipCounter}`;
const post = (path, options = {}) => api.request('POST', `/api/v1/auth${path}`, { ip: freshIp(), ...options });
const refreshCookieOf = (res) => res.setCookies.find((cookie) => cookie.startsWith('refreshToken='));
const cookieHeader = (setCookie) => setCookie.split(';')[0];

async function registerAlice() {
  const res = await post('/register', { body: { name: 'Alice', email: 'alice@example.test', password: 'Passw0rd-test' } });
  return { res, cookie: cookieHeader(refreshCookieOf(res)), token: res.body.data.accessToken };
}

describe('register', () => {
  it('creates a customer, returns an access token and sets the refresh cookie', async () => {
    const { res } = await registerAlice();
    assert.equal(res.status, 201);
    assert.equal(res.body.data.user.email, 'alice@example.test');
    assert.equal(res.body.data.user.role, 'customer');
    assert.equal(res.body.data.user.isActive, true);
    assert.equal('password' in res.body.data.user, false);
    assert.equal(typeof res.body.data.accessToken, 'string');
    const cookie = refreshCookieOf(res);
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /Path=\/api\/v1\/auth/);
    assert.match(cookie, /SameSite=Lax/i);
    assert.match(cookie, /Max-Age=604800(;|$)/);
    assert.equal(await RefreshToken.countDocuments(), 1);
  });

  it('lowercases and trims the email and ignores a client-supplied role', async () => {
    const res = await post('/register', { body: { name: 'Bob', email: '  Bob@Example.TEST ', password: 'Passw0rd-test', role: 'admin' } });
    assert.equal(res.body.data.user.email, 'bob@example.test');
    assert.equal(res.body.data.user.role, 'customer');
  });

  it('rejects a duplicate email, a short password, a bad email and a missing field', async () => {
    await registerAlice();
    const duplicate = await post('/register', { body: { name: 'Alice 2', email: 'ALICE@example.test', password: 'Passw0rd-test' } });
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.error.message, 'Email is already registered');
    const short = await post('/register', { body: { name: 'Eve', email: 'eve@example.test', password: 'short' } });
    assert.equal(short.status, 400);
    assert.equal(short.body.error.message, 'Password must be at least 8 characters');
    const badEmail = await post('/register', { body: { name: 'Eve', email: 'not-an-email', password: 'Passw0rd-test' } });
    assert.equal(badEmail.body.error.message, 'Invalid email address');
    const missing = await post('/register', { body: { name: 'Eve', email: 'eve@example.test' } });
    assert.equal(missing.body.error.message, 'Missing required fields: password');
  });
});

describe('login', () => {
  it('returns the user and an access token for correct credentials', async () => {
    await createUser({ email: 'carol@example.test', password: 'Passw0rd-test' });
    const res = await post('/login', { body: { email: ' CAROL@example.test', password: 'Passw0rd-test' } });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.user.email, 'carol@example.test');
    assert.equal('password' in res.body.data.user, false);
    assert.ok(refreshCookieOf(res));
  });

  it('answers wrong password, unknown email and deactivated user with the same 401', async () => {
    await createUser({ email: 'carol@example.test', password: 'Passw0rd-test' });
    await createUser({ email: 'dave@example.test', password: 'Passw0rd-test', isActive: false });
    for (const body of [
      { email: 'carol@example.test', password: 'wrong-password' },
      { email: 'nobody@example.test', password: 'Passw0rd-test' },
      { email: 'dave@example.test', password: 'Passw0rd-test' }
    ]) {
      const res = await post('/login', { body });
      assert.equal(res.status, 401);
      assert.equal(res.body.error.message, 'Invalid email or password');
    }
  });

  it('limits register, login and refresh to 20 requests per client address per window', async () => {
    const ip = freshIp();
    const attempt = () => api.request('POST', '/api/v1/auth/login', { ip, body: { email: 'nobody@example.test', password: 'Passw0rd-test' } });
    for (let i = 0; i < 20; i += 1) assert.equal((await attempt()).status, 401);
    const limited = await attempt();
    assert.equal(limited.status, 429);
    assert.equal(limited.body.error.message, 'Too many authentication attempts');
  });
});

describe('me and role checks', () => {
  it('returns the current user for a valid access token', async () => {
    const { token } = await registerAlice();
    const res = await api.request('GET', '/api/v1/auth/me', { token });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.user.email, 'alice@example.test');
  });

  it('rejects a missing token and a malformed token with 401', async () => {
    const missing = await api.request('GET', '/api/v1/auth/me');
    assert.equal(missing.status, 401);
    assert.equal(missing.body.error.message, 'Authentication required');
    const bad = await api.request('GET', '/api/v1/auth/me', { token: 'not.a.jwt' });
    assert.equal(bad.status, 401);
    assert.equal(bad.body.error.message, 'Invalid or expired access token');
  });

  it('rejects a token of a deactivated user', async () => {
    const user = await createUser();
    const token = bearer(user);
    await User.updateOne({ _id: user._id }, { isActive: false });
    const res = await api.request('GET', '/api/v1/auth/me', { token });
    assert.equal(res.status, 401);
    assert.equal(res.body.error.message, 'User is unavailable');
  });

  it('keeps admin routes closed to customers and anonymous callers', async () => {
    const customer = await createUser();
    const admin = await createUser({ role: 'admin' });
    assert.equal((await api.request('GET', '/api/v1/admin/stats')).status, 401);
    const forbidden = await api.request('GET', '/api/v1/admin/stats', { token: bearer(customer) });
    assert.equal(forbidden.status, 403);
    assert.equal(forbidden.body.error.message, 'Insufficient permissions');
    assert.equal((await api.request('GET', '/api/v1/admin/stats', { token: bearer(admin) })).status, 200);
  });
});

describe('refresh', () => {
  it('rotates the refresh token: the old one is revoked and a new cookie is issued', async () => {
    const { cookie } = await registerAlice();
    const res = await post('/refresh', { cookie });
    assert.equal(res.status, 200);
    assert.equal(typeof res.body.data.accessToken, 'string');
    const next = cookieHeader(refreshCookieOf(res));
    assert.notEqual(next, cookie);
    assert.equal(await RefreshToken.countDocuments({ revokedAt: { $ne: null } }), 1);
    assert.equal(await RefreshToken.countDocuments({ revokedAt: null }), 1);
  });

  it('treats a replayed token as theft: 401 and every token of the user is revoked', async () => {
    const { cookie } = await registerAlice();
    const rotated = await post('/refresh', { cookie });
    const replay = await post('/refresh', { cookie });
    assert.equal(replay.status, 401);
    assert.equal(replay.body.error.message, 'Refresh token reuse detected');
    const stillValid = await post('/refresh', { cookie: cookieHeader(refreshCookieOf(rotated)) });
    assert.equal(stillValid.status, 401);
    assert.equal(await RefreshToken.countDocuments({ revokedAt: null }), 0);
  });

  it('KNOWN BUG (B5): a guest with no cookie gets 401 (desired: 204 with no error)', async () => {
    const res = await post('/refresh');
    assert.equal(res.status, 401);
    assert.equal(res.body.error.message, 'Refresh token required');
  });

  it('rejects a garbage cookie and a deactivated user', async () => {
    const garbage = await post('/refresh', { cookie: 'refreshToken=garbage' });
    assert.equal(garbage.status, 401);
    assert.equal(garbage.body.error.message, 'Invalid or expired refresh token');
    const { cookie } = await registerAlice();
    await User.updateOne({ email: 'alice@example.test' }, { isActive: false });
    const inactive = await post('/refresh', { cookie });
    assert.equal(inactive.status, 401);
    assert.equal(inactive.body.error.message, 'User is unavailable');
  });
});

describe('logout', () => {
  it('revokes the token, clears the cookie and makes the token unusable', async () => {
    const { cookie } = await registerAlice();
    const res = await api.request('POST', '/api/v1/auth/logout', { cookie });
    assert.equal(res.status, 204);
    assert.match(refreshCookieOf(res), /^refreshToken=;/);
    assert.equal(await RefreshToken.countDocuments({ revokedAt: null }), 0);
    const after = await post('/refresh', { cookie });
    assert.equal(after.status, 401);
  });

  it('answers 204 without a cookie', async () => {
    assert.equal((await api.request('POST', '/api/v1/auth/logout')).status, 204);
  });
});
