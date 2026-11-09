import '../helpers/env.js';
import { before, after, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { startDatabase } from '../helpers/replSet.js';
import { startStripeStub } from '../helpers/stripeStub.js';
import { startApi } from '../helpers/apiClient.js';
import { bearer, createCategory, createOrderDocument, createProduct, createUser } from '../helpers/factories.js';
import { Order } from '../../src/models/Order.js';

// 2026-11-09T12:00:00Z: 20766 days since the epoch (56 years * 365 + 14 leap days = 20454 to 2026-01-01, + 304 to 1 Nov, + 8) * 86400 + 12 * 3600
const NOW_UNIX = 1_794_225_600;
const now = () => new Date(NOW_UNIX * 1000);

let db, stub, api, laterApi, admin, alice, bob, category, mug, lamp;

before(async () => {
  db = await startDatabase();
  stub = await startStripeStub();
  api = await startApi({ stripe: stub.stripe, now });
  laterApi = await startApi({ stripe: stub.stripe, now: () => new Date((NOW_UNIX + 7) * 1000) });
  admin = await createUser({ role: 'admin' });
  alice = await createUser();
  bob = await createUser();
  category = await createCategory();
});

after(async () => {
  await laterApi.stop();
  await api.stop();
  await stub.stop();
  await db.stop();
});

beforeEach(async () => {
  await db.clear('Product', 'Order');
  stub.reset();
  mug = await createProduct({ category, createdBy: admin, name: 'Ripple Ceramic Mug', price: 24, stock: 5, images: [{ url: '/products/mug.jpg', publicId: 'test/mug' }] });
  lamp = await createProduct({ category, createdBy: admin, name: 'Arc Table Lamp', price: 99.5, stock: 5, images: [{ url: 'https://cdn.example.test/lamp.jpg', publicId: 'test/lamp' }] });
});

const checkout = (user, orderId) => api.request('POST', '/api/v1/payments/checkout-session', { token: bearer(user), body: { orderId } });
const freshOrder = (overrides = {}) => createOrderDocument({
  user: alice, items: [{ product: mug, quantity: 2 }, { product: lamp, quantity: 1 }],
  reservationExpiresAt: new Date((NOW_UNIX + 600) * 1000), ...overrides
});

describe('POST /payments/checkout-session', () => {
  it('creates a Stripe session from the stored order lines and returns its url', async () => {
    const order = await freshOrder();
    const res = await checkout(alice, order.id);
    assert.equal(res.status, 201);
    assert.equal(res.body.data.sessionId, 'cs_test_1');
    assert.equal(res.body.data.url, 'https://checkout.stripe.test/cs_test_1');

    const call = stub.calls.find((c) => c.method === 'POST' && c.path === '/v1/checkout/sessions');
    assert.equal(call.params.mode, 'payment');
    assert.equal(call.params.customer_email, alice.email);
    assert.equal(call.params['metadata[orderId]'], order.id);
    assert.equal(call.params['line_items[0][price_data][currency]'], 'egp');
    assert.equal(call.params['line_items[0][price_data][unit_amount]'], '2400');
    assert.equal(call.params['line_items[0][quantity]'], '2');
    assert.equal(call.params['line_items[1][price_data][unit_amount]'], '9950');
    assert.equal(call.params['line_items[1][quantity]'], '1');
    assert.equal(call.params['line_items[0][price_data][product_data][images][0]'], 'http://localhost:5173/products/mug.jpg');
    assert.equal(call.params['line_items[1][price_data][product_data][images][0]'], 'https://cdn.example.test/lamp.jpg');
    assert.equal(call.params.success_url, 'http://localhost:5173/checkout/success?session_id={CHECKOUT_SESSION_ID}');
    assert.equal(call.params.cancel_url, `http://localhost:5173/orders/${order.id}`);
    assert.equal(call.params.expires_at, String(NOW_UNIX + 30 * 60));
  });

  it('stores the session id and moves the reservation expiry to the session expiry', async () => {
    const order = await freshOrder();
    await checkout(alice, order.id);
    const stored = await Order.findById(order._id);
    assert.equal(stored.stripeCheckoutSessionId, 'cs_test_1');
    assert.equal(stored.reservationExpiresAt.getTime(), (NOW_UNIX + 1800) * 1000);
  });

  it('returns the same open session instead of creating a second one', async () => {
    const order = await freshOrder();
    await checkout(alice, order.id);
    const second = await checkout(alice, order.id);
    assert.equal(second.status, 200);
    assert.equal(second.body.data.sessionId, 'cs_test_1');
    assert.equal(stub.calls.filter((c) => c.method === 'POST' && c.path === '/v1/checkout/sessions').length, 1);
  });

  it('creates a new session when the stored one is no longer open', async () => {
    const order = await freshOrder();
    await checkout(alice, order.id);
    stub.setSessionStatus('cs_test_1', 'expired');
    const second = await checkout(alice, order.id);
    assert.equal(second.status, 201);
    assert.equal(second.body.data.sessionId, 'cs_test_2');
  });

  it('sends a Stripe idempotency key that names the order and the session it replaces, so a re-created session is not mistaken for a replay', async () => {
    const order = await freshOrder();
    await checkout(alice, order.id);
    stub.setSessionStatus('cs_test_1', 'expired');
    await checkout(alice, order.id);
    const creations = stub.calls.filter((c) => c.method === 'POST' && c.path === '/v1/checkout/sessions');
    assert.deepEqual(creations.map((c) => c.idempotencyKey), [`session:${order.id}:first:${NOW_UNIX + 1800}`, `session:${order.id}:after-cs_test_1:${NOW_UNIX + 1800}`]);
  });

  it('survives two simultaneous requests whose clocks differ by seconds: Stripe rejects a reused key with other parameters, so the key carries the session expiry', async () => {
    stub.delaySessionCreation(150);
    const order = await freshOrder();
    const post = (client) => client.request('POST', '/api/v1/payments/checkout-session', { token: bearer(alice), body: { orderId: order.id } });
    const results = await Promise.all([post(api), post(laterApi)]);
    assert.ok(results.every((res) => res.status === 200 || res.status === 201), results.map((res) => res.status).join());
  });

  it('refuses an order whose reservation has expired', async () => {
    const order = await freshOrder({ reservationExpiresAt: new Date((NOW_UNIX - 1) * 1000) });
    const res = await checkout(alice, order.id);
    assert.equal(res.status, 409);
    assert.equal(res.body.error.message, 'Inventory reservation has expired; cancel this order and create another');
  });

  it('treats a reservation expiring exactly now as expired', async () => {
    const order = await freshOrder({ reservationExpiresAt: new Date(NOW_UNIX * 1000) });
    assert.equal((await checkout(alice, order.id)).status, 409);
  });

  it('refuses a paid order, another customer order and an anonymous caller', async () => {
    const paid = await freshOrder({ status: 'processing', paymentStatus: 'paid' });
    const notEligible = await checkout(alice, paid.id);
    assert.equal(notEligible.status, 409);
    assert.equal(notEligible.body.error.message, 'Order is not eligible for checkout');
    const open = await freshOrder();
    assert.equal((await checkout(bob, open.id)).status, 404);
    const anonymous = await api.request('POST', '/api/v1/payments/checkout-session', { body: { orderId: open.id } });
    assert.equal(anonymous.status, 401);
    assert.equal(stub.calls.length, 0);
  });

  it('answers 503 when no Stripe client is injected and no secret key is configured', async () => {
    const unconfigured = await startApi({ now });
    try {
      const order = await freshOrder();
      const res = await unconfigured.request('POST', '/api/v1/payments/checkout-session', { token: bearer(alice), body: { orderId: order.id } });
      assert.equal(res.status, 503);
      assert.equal(res.body.error.message, 'Stripe is not configured');
    } finally { await unconfigured.stop(); }
  });
});
