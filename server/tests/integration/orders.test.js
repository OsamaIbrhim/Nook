import '../helpers/env.js';
import { before, after, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { startDatabase } from '../helpers/replSet.js';
import { startStripeStub } from '../helpers/stripeStub.js';
import { startApi } from '../helpers/apiClient.js';
import { address, bearer, createCategory, createOrderDocument, createProduct, createUser } from '../helpers/factories.js';
import { Product } from '../../src/models/Product.js';
import { Order } from '../../src/models/Order.js';

let db, stub, api, admin, alice, bob, category, mug;

before(async () => {
  db = await startDatabase();
  stub = await startStripeStub();
  api = await startApi({ stripe: stub.stripe });
  admin = await createUser({ role: 'admin' });
  alice = await createUser();
  bob = await createUser();
  category = await createCategory();
});

after(async () => {
  await api.stop();
  await stub.stop();
  await db.stop();
});

beforeEach(async () => {
  await db.clear('Product', 'Order');
  stub.reset();
  mug = await createProduct({ category, createdBy: admin, name: 'Ripple Ceramic Mug', price: 24, stock: 5 });
});

const stockOf = async () => (await Product.findById(mug._id)).stock;
const KEY_A = '3f9b2c1e-8d4a-4b6f-9c2d-1a7e5f0b8c33';
const KEY_B = '7a1d5e90-2b3c-4d8e-a1f4-6c9b0e2d7f55';
const body = (quantity = 2, shippingAddress = address) => ({ items: [{ product: mug.id, quantity }], shippingAddress });
const place = (user, payload = body(), key) => api.request('POST', '/api/v1/orders', { token: bearer(user), body: payload, ...(key && { headers: { 'idempotency-key': key } }) });

describe('order representation', () => {
  it('serves a short code and the actions the caller may take, and none of the idempotency internals', async () => {
    const res = await place(alice, body(2), KEY_A);
    const { order } = res.body.data;
    assert.equal(order.code, order._id.slice(-8).toUpperCase());
    assert.deepEqual(order.actions, { canPay: true, canCancel: true, nextStatuses: [] });
    assert.equal('idempotencyKey' in order, false);
    assert.equal('requestFingerprint' in order, false);
    const asAdmin = await api.request('GET', `/api/v1/orders/${order._id}`, { token: bearer(admin) });
    assert.deepEqual(asAdmin.body.data.order.actions, { canPay: false, canCancel: true, nextStatuses: ['cancelled'] });
    assert.equal(asAdmin.body.data.order.code, order.code);
  });

  it('adds code and actions to the list endpoints and the cancel response', async () => {
    const paid = await createOrderDocument({ user: alice, items: [{ product: mug, quantity: 1 }], status: 'processing', paymentStatus: 'paid' });
    const mine = await api.request('GET', '/api/v1/orders/mine', { token: bearer(alice) });
    assert.deepEqual(mine.body.data.orders[0].actions, { canPay: false, canCancel: false, nextStatuses: [] });
    assert.equal(mine.body.data.orders[0].code, paid.id.slice(-8).toUpperCase());
    const all = await api.request('GET', '/api/v1/orders', { token: bearer(admin) });
    assert.deepEqual(all.body.data.orders[0].actions, { canPay: false, canCancel: true, nextStatuses: ['shipped', 'cancelled'] });
    const open = await createOrderDocument({ user: alice, items: [{ product: mug, quantity: 1 }] });
    const cancelled = await api.request('POST', `/api/v1/orders/${open.id}/cancel`, { token: bearer(alice) });
    assert.deepEqual(cancelled.body.data.order.actions, { canPay: false, canCancel: false, nextStatuses: [] });
  });
});

describe('GET /orders/:id ownership', () => {
  it('answers 404, not 403, for another customer order', async () => {
    const order = await createOrderDocument({ user: alice, items: [{ product: mug, quantity: 1 }] });
    const res = await api.request('GET', `/api/v1/orders/${order.id}`, { token: bearer(bob) });
    assert.equal(res.status, 404);
    assert.equal(res.body.error.message, 'Order not found');
    assert.equal(res.body.error.code, 'order_not_found');
  });
});

describe('GET /orders/by-session/:sessionId', () => {
  it('returns the caller order for its Checkout session', async () => {
    const order = await createOrderDocument({ user: alice, items: [{ product: mug, quantity: 1 }], stripeCheckoutSessionId: 'cs_test_by_session' });
    const res = await api.request('GET', '/api/v1/orders/by-session/cs_test_by_session', { token: bearer(alice) });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.order._id, order.id);
    assert.equal(res.body.data.order.code, order.id.slice(-8).toUpperCase());
  });

  it('answers 404 for another user session, an admin who is not the owner, an unknown session and a bad id', async () => {
    await createOrderDocument({ user: alice, items: [{ product: mug, quantity: 1 }], stripeCheckoutSessionId: 'cs_test_private' });
    for (const [user, id] of [[bob, 'cs_test_private'], [admin, 'cs_test_private'], [alice, 'cs_test_unknown'], [alice, 'not a session']]) {
      const res = await api.request('GET', `/api/v1/orders/by-session/${encodeURIComponent(id)}`, { token: bearer(user) });
      assert.equal(res.status, 404, id);
      assert.equal(res.body.error.code, 'order_not_found');
    }
  });

  it('requires authentication', async () => {
    assert.equal((await api.request('GET', '/api/v1/orders/by-session/cs_test_private')).status, 401);
  });
});

describe('POST /orders Idempotency-Key', () => {
  it('creates the order once: 201 first, then 200 with the same order, one reservation', async () => {
    const first = await place(alice, body(2), KEY_A);
    const second = await place(alice, body(2), KEY_A);
    assert.equal(first.status, 201);
    assert.equal(second.status, 200);
    assert.equal(second.body.data.order._id, first.body.data.order._id);
    assert.equal(await Order.countDocuments(), 1);
    assert.equal(await stockOf(), 3);
  });

  it('answers a replay even when the remaining stock would no longer cover the order', async () => {
    await Product.updateOne({ _id: mug._id }, { stock: 2 });
    const first = await place(alice, body(2), KEY_A);
    assert.equal(first.status, 201);
    assert.equal((await place(alice, body(2), KEY_A)).status, 200);
  });

  it('answers 409 idempotency_key_conflict when the key is reused with a different request, and changes nothing', async () => {
    await place(alice, body(2), KEY_A);
    const differentQuantity = await place(alice, body(3), KEY_A);
    assert.equal(differentQuantity.status, 409);
    assert.equal(differentQuantity.body.error.code, 'idempotency_key_conflict');
    const differentAddress = await place(alice, body(2, { ...address, city: 'Giza' }), KEY_A);
    assert.equal(differentAddress.status, 409);
    assert.equal(await Order.countDocuments(), 1);
    assert.equal(await stockOf(), 3);
  });

  it('treats a reordered or merged copy of the same lines as the same request', async () => {
    const lamp = await createProduct({ category, createdBy: admin, name: 'Arc Table Lamp', price: 99.5, stock: 5 });
    const one = { items: [{ product: mug.id, quantity: 1 }, { product: lamp.id, quantity: 1 }, { product: mug.id, quantity: 1 }], shippingAddress: address };
    const other = { items: [{ product: lamp.id, quantity: 1 }, { product: mug.id, quantity: 2 }], shippingAddress: { ...address, country: ' EG ' } };
    const first = await place(alice, one, KEY_A);
    const second = await place(alice, other, KEY_A);
    assert.equal(first.status, 201);
    assert.equal(second.status, 200);
  });

  it('keeps keys per user: the same key from another user creates a separate order', async () => {
    const first = await place(alice, body(1), KEY_A);
    const second = await place(bob, body(1), KEY_A);
    assert.equal(second.status, 201);
    assert.notEqual(second.body.data.order._id, first.body.data.order._id);
  });

  it('creates a new order for a new key and for requests without a key', async () => {
    assert.equal((await place(alice, body(1), KEY_A)).status, 201);
    assert.equal((await place(alice, body(1), KEY_B)).status, 201);
    assert.equal((await place(alice, body(1))).status, 201);
    assert.equal((await place(alice, body(1))).status, 201);
    assert.equal(await Order.countDocuments(), 4);
  });

  it('rejects a malformed key before reserving anything', async () => {
    for (const key of ['not-a-uuid', '12345', 'x'.repeat(200)]) {
      const res = await place(alice, body(1), key);
      assert.equal(res.status, 400, key);
      assert.equal(res.body.error.code, 'invalid_idempotency_key');
    }
    assert.equal(await stockOf(), 5);
  });

  it('creates one order and one reservation when the same request arrives twice at once, even when the stock covers it only once', async () => {
    await Product.updateOne({ _id: mug._id }, { stock: 2 });
    const results = await Promise.all([place(alice, body(2), KEY_A), place(alice, body(2), KEY_A)]);
    assert.deepEqual(results.map((res) => res.status).sort(), [200, 201]);
    assert.equal(results[0].body.data.order._id, results[1].body.data.order._id);
    assert.equal(await Order.countDocuments(), 1);
    assert.equal(await stockOf(), 0);
  });
});

describe('POST /orders pricing and validation', () => {
  it('rejects merged lines above 99 for one product with the quantity error', async () => {
    await Product.updateOne({ _id: mug._id }, { stock: 500 });
    const res = await api.request('POST', '/api/v1/orders', {
      token: bearer(alice), body: { items: [{ product: mug.id, quantity: 60 }, { product: mug.id, quantity: 60 }], shippingAddress: address }
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.message, 'Item quantity must be between 1 and 99');
    assert.equal(await stockOf(), 500);
  });

  it('answers a missing address field with a stable fieldErrors list', async () => {
    const { city, postalCode, ...incomplete } = address;
    const res = await place(alice, body(1, incomplete));
    assert.equal(res.status, 400);
    assert.equal(res.body.error.message, 'Missing required fields: city, postalCode');
    assert.equal(res.body.error.code, 'validation_failed');
    assert.deepEqual(res.body.error.fieldErrors, [
      { field: 'shippingAddress.city', message: 'is required' },
      { field: 'shippingAddress.postalCode', message: 'is required' }
    ]);
  });

  it('answers a missing items list with fieldErrors for items', async () => {
    const res = await api.request('POST', '/api/v1/orders', { token: bearer(alice), body: { shippingAddress: address } });
    assert.equal(res.status, 400);
    assert.deepEqual(res.body.error.fieldErrors, [{ field: 'items', message: 'is required' }]);
  });
});
