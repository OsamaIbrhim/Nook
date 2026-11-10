import '../helpers/env.js';
import { before, after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { startDatabase } from '../helpers/replSet.js';
import { startStripeStub } from '../helpers/stripeStub.js';
import { startApi } from '../helpers/apiClient.js';
import { address, bearer, createCategory, createProduct, createUser } from '../helpers/factories.js';
import { assertMatchesContract } from '../helpers/contract.js';

let db, stub, api, admin, alice, mug;

before(async () => {
  db = await startDatabase();
  stub = await startStripeStub();
  api = await startApi({ stripe: stub.stripe });
  admin = await createUser({ role: 'admin' });
  alice = await createUser();
  const home = await createCategory({ name: 'Home', slug: 'home' });
  mug = await createProduct({ category: home, createdBy: admin, name: 'Ripple Ceramic Mug', slug: 'ripple-ceramic-mug', price: 24, compareAtPrice: 32, stock: 5 });
});

after(async () => {
  await api.stop();
  await stub.stop();
  await db.stop();
});

const KEY = '3f9b2c1e-8d4a-4b6f-9c2d-1a7e5f0b8c33';

describe('responses conform to the OpenAPI document', () => {
  it('catalog and shop config', async () => {
    assertMatchesContract('listProducts', 200, (await api.request('GET', '/api/v1/products')).body);
    assertMatchesContract('getProduct', 200, (await api.request('GET', '/api/v1/products/ripple-ceramic-mug')).body);
    assertMatchesContract('listCategories', 200, (await api.request('GET', '/api/v1/categories')).body);
    assertMatchesContract('getShopConfig', 200, (await api.request('GET', '/api/v1/shop/config')).body);
  });

  it('cart quote, including an unavailable line and a validation failure', async () => {
    const quote = await api.request('POST', '/api/v1/cart/quote', { body: { lines: [{ productId: mug.id, quantity: 2 }, { productId: 'a'.repeat(24), quantity: 1 }] } });
    assertMatchesContract('quoteCart', 200, quote.body);
    const invalid = await api.request('POST', '/api/v1/cart/quote', { body: { lines: [] } });
    assertMatchesContract('quoteCart', 400, invalid.body);
  });

  it('order lifecycle: create, replay, read, list, session lookup, cancel', async () => {
    const token = bearer(alice);
    const body = { items: [{ product: mug.id, quantity: 1 }], shippingAddress: address };
    const created = await api.request('POST', '/api/v1/orders', { token, body, headers: { 'idempotency-key': KEY } });
    assert.equal(created.status, 201);
    assertMatchesContract('createOrder', 201, created.body);
    const replay = await api.request('POST', '/api/v1/orders', { token, body, headers: { 'idempotency-key': KEY } });
    assert.equal(replay.status, 200);
    assertMatchesContract('createOrder', 200, replay.body);
    const orderId = created.body.data.order._id;
    assertMatchesContract('getOrder', 200, (await api.request('GET', `/api/v1/orders/${orderId}`, { token })).body);
    assertMatchesContract('listMyOrders', 200, (await api.request('GET', '/api/v1/orders/mine', { token })).body);
    const session = await api.request('POST', '/api/v1/payments/checkout-session', { token, body: { orderId } });
    assertMatchesContract('createCheckoutSession', 201, session.body);
    const bySession = await api.request('GET', `/api/v1/orders/by-session/${session.body.data.sessionId}`, { token });
    assertMatchesContract('getOrderBySession', 200, bySession.body);
    const again = await api.request('POST', '/api/v1/payments/checkout-session', { token, body: { orderId } });
    assertMatchesContract('createCheckoutSession', 200, again.body);
    assertMatchesContract('cancelOrder', 200, (await api.request('POST', `/api/v1/orders/${orderId}/cancel`, { token })).body);
    assertMatchesContract('getOrder', 404, (await api.request('GET', `/api/v1/orders/${'b'.repeat(24)}`, { token })).body);
  });

  it('auth: register, login, me, refresh, and the guest refresh answer', async () => {
    const register = await api.request('POST', '/api/v1/auth/register', { body: { name: 'Zed', email: 'zed@example.test', password: 'Passw0rd-test' }, ip: '172.16.0.1' });
    assertMatchesContract('register', 201, register.body);
    const cookie = register.setCookies.find((entry) => entry.startsWith('refreshToken=')).split(';')[0];
    const login = await api.request('POST', '/api/v1/auth/login', { body: { email: 'zed@example.test', password: 'Passw0rd-test' }, ip: '172.16.0.2' });
    assertMatchesContract('login', 200, login.body);
    assertMatchesContract('getMe', 200, (await api.request('GET', '/api/v1/auth/me', { token: login.body.data.accessToken })).body);
    const refreshed = await api.request('POST', '/api/v1/auth/refresh', { cookie, ip: '172.16.0.3' });
    assertMatchesContract('refreshSession', 200, refreshed.body);
    const guest = await api.request('POST', '/api/v1/auth/refresh', { ip: '172.16.0.4' });
    assert.equal(guest.status, 204);
    assert.equal(guest.body, null);
    assertMatchesContract('login', 401, (await api.request('POST', '/api/v1/auth/login', { body: { email: 'zed@example.test', password: 'wrong-password' }, ip: '172.16.0.5' })).body);
  });
});

describe('browser preflight', () => {
  it('allows the Idempotency-Key header from the configured client origin, with credentials', async () => {
    const res = await api.request('OPTIONS', '/api/v1/orders', {
      headers: { origin: 'http://localhost:5173', 'access-control-request-method': 'POST', 'access-control-request-headers': 'authorization, content-type, idempotency-key' }
    });
    assert.equal(res.status, 204);
    assert.match(res.headers.get('access-control-allow-headers').toLowerCase(), /idempotency-key/);
    assert.equal(res.headers.get('access-control-allow-credentials'), 'true');
  });
});
