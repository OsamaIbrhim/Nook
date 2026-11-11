import '../helpers/env.js';
import { readFileSync } from 'node:fs';
import { before, after, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { startDatabase } from '../helpers/replSet.js';
import { startStripeStub } from '../helpers/stripeStub.js';
import { startApi } from '../helpers/apiClient.js';
import { address, bearer, createCategory, createOrderDocument, createProduct, createUser } from '../helpers/factories.js';
import { Product } from '../../src/models/Product.js';
import { Order } from '../../src/models/Order.js';
import { releaseExpiredReservations } from '../../src/services/inventoryService.js';

// 2026-11-09T12:00:00Z
const NOW_UNIX = 1_794_225_600;
const now = () => new Date(NOW_UNIX * 1000);
const at = (offsetSeconds) => new Date((NOW_UNIX + offsetSeconds) * 1000);
const CRON_SECRET = 'cron-secret-placeholder-0000000000000000';

let db, stub, api, cronApi, admin, alice, bob, category, mug, lamp;

before(async () => {
  db = await startDatabase();
  stub = await startStripeStub();
  api = await startApi({ stripe: stub.stripe, now });
  cronApi = await startApi({ stripe: stub.stripe, now, cronSecret: CRON_SECRET });
  admin = await createUser({ role: 'admin' });
  alice = await createUser();
  bob = await createUser();
  category = await createCategory();
});

after(async () => {
  await cronApi.stop();
  await api.stop();
  await stub.stop();
  await db.stop();
});

beforeEach(async () => {
  await db.clear('Product', 'Order');
  stub.reset();
  mug = await createProduct({ category, createdBy: admin, name: 'Ripple Ceramic Mug', price: 24, stock: 5 });
  lamp = await createProduct({ category, createdBy: admin, name: 'Arc Table Lamp', price: 99.5, stock: 5 });
});

const stockOf = async (product) => (await Product.findById(product._id)).stock;
const held = (product, quantity, overrides = {}) => createOrderDocument({ user: bob, items: [{ product, quantity }], reservationExpiresAt: at(-60), ...overrides });
const place = (user, items) => api.request('POST', '/api/v1/orders', {
  token: bearer(user), body: { items: items.map(([product, quantity]) => ({ product: product.id, quantity })), shippingAddress: address }
});

describe('releaseExpiredReservations', () => {
  it('cancels an expired unpaid order that never reached Checkout, restores its stock and returns the count', async () => {
    await Product.updateOne({ _id: mug._id }, { stock: 3 });
    const order = await held(mug, 2);
    assert.equal(await releaseExpiredReservations({ now: now() }), 1);
    const stored = await Order.findById(order._id);
    assert.equal(stored.status, 'cancelled');
    assert.equal(stored.paymentStatus, 'unpaid');
    assert.equal(stored.inventoryReserved, false);
    assert.equal(stored.statusHistory.at(-1).status, 'cancelled');
    assert.equal(await stockOf(mug), 5);
  });

  it('releases an order that expires exactly now and leaves one that expires one second later', async () => {
    const boundary = await held(mug, 1, { reservationExpiresAt: at(0) });
    const later = await held(lamp, 1, { reservationExpiresAt: at(1) });
    assert.equal(await releaseExpiredReservations({ now: now() }), 1);
    assert.equal((await Order.findById(boundary._id)).status, 'cancelled');
    assert.equal((await Order.findById(later._id)).status, 'pending');
  });

  it('leaves an expired order that has a Checkout session (the webhook owns it)', async () => {
    const order = await held(mug, 1, { stripeCheckoutSessionId: 'cs_test_open' });
    assert.equal(await releaseExpiredReservations({ now: now() }), 0);
    assert.equal((await Order.findById(order._id)).status, 'pending');
  });

  it('leaves paid and already cancelled orders', async () => {
    const paid = await held(mug, 1, { status: 'processing', paymentStatus: 'paid' });
    const cancelled = await held(mug, 1, { status: 'cancelled', inventoryReserved: false });
    assert.equal(await releaseExpiredReservations({ now: now() }), 0);
    assert.equal((await Order.findById(paid._id)).status, 'processing');
    assert.equal((await Order.findById(cancelled._id)).inventoryReserved, false);
    assert.equal(await stockOf(mug), 5);
  });

  it('stops at the batch limit: three expired orders, limit 2 releases 2 and leaves 1', async () => {
    await Promise.all([held(mug, 1), held(mug, 1), held(mug, 1)]);
    assert.equal(await releaseExpiredReservations({ now: now(), limit: 2 }), 2);
    assert.equal(await Order.countDocuments({ status: 'cancelled' }), 2);
    assert.equal(await Order.countDocuments({ status: 'pending' }), 1);
  });

  it('with productIds, releases only orders that hold one of those products', async () => {
    const holdsMug = await held(mug, 1);
    const holdsLamp = await held(lamp, 1);
    assert.equal(await releaseExpiredReservations({ productIds: [mug.id], now: now() }), 1);
    assert.equal((await Order.findById(holdsMug._id)).status, 'cancelled');
    assert.equal((await Order.findById(holdsLamp._id)).status, 'pending');
  });

  it('restores the stock once when two sweeps run at the same moment', async () => {
    await Product.updateOne({ _id: mug._id }, { stock: 3 });
    await held(mug, 2);
    const counts = await Promise.all([releaseExpiredReservations({ now: now() }), releaseExpiredReservations({ now: now() })]);
    assert.equal(counts[0] + counts[1], 1);
    assert.equal(await stockOf(mug), 5);
  });
});

describe('POST /orders releases expired holds when stock runs short', () => {
  it('succeeds after releasing an expired reservation of the same product', async () => {
    const abandoned = await held(mug, 4);
    await Product.updateOne({ _id: mug._id }, { stock: 1 });
    const res = await place(alice, [[mug, 3]]);
    assert.equal(res.status, 201);
    assert.equal((await Order.findById(abandoned._id)).status, 'cancelled');
    assert.equal(await stockOf(mug), 2);
  });

  it('answers 409 insufficient_stock with the available quantity when the hold is still live', async () => {
    await Product.updateOne({ _id: mug._id }, { stock: 1 });
    const live = await held(mug, 4, { reservationExpiresAt: at(600) });
    const res = await place(alice, [[mug, 3]]);
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'insufficient_stock');
    assert.equal(res.body.error.message, 'Insufficient stock for Ripple Ceramic Mug');
    assert.deepEqual(res.body.error.details, [{ productId: mug.id, available: 1 }]);
    assert.equal((await Order.findById(live._id)).status, 'pending');
  });

  it('does not touch expired holds on products the order does not involve', async () => {
    await Product.updateOne({ _id: mug._id }, { stock: 0 });
    const holdsLamp = await held(lamp, 1);
    const res = await place(alice, [[mug, 1]]);
    assert.equal(res.status, 409);
    assert.equal((await Order.findById(holdsLamp._id)).status, 'pending');
  });
});

describe('GET /internal/jobs/release-reservations', () => {
  const path = '/api/v1/internal/jobs/release-reservations';

  it('does not exist while no cron secret is configured', async () => {
    const res = await api.request('GET', path, { headers: { authorization: `Bearer ${CRON_SECRET}` } });
    assert.equal(res.status, 404);
  });

  it('answers 401 without credentials and with a wrong secret of any length, and releases nothing', async () => {
    const order = await held(mug, 1);
    for (const authorization of [undefined, 'Bearer wrong', `Bearer ${CRON_SECRET}x`, CRON_SECRET]) {
      const res = await cronApi.request('GET', path, { headers: authorization ? { authorization } : {} });
      assert.equal(res.status, 401, String(authorization));
    }
    assert.equal((await Order.findById(order._id)).status, 'pending');
  });

  it('releases expired reservations and reports the count for the right secret', async () => {
    await Product.updateOne({ _id: mug._id }, { stock: 3 });
    await held(mug, 2);
    const res = await cronApi.request('GET', path, { headers: { authorization: `Bearer ${CRON_SECRET}` } });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { success: true, data: { released: 1 } });
    assert.equal(await stockOf(mug), 5);
  });

  it('is the route that vercel.json schedules', async () => {
    const config = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'));
    assert.equal(config.crons.length, 1);
    assert.equal(config.crons[0].path, path);
    const res = await cronApi.request('GET', config.crons[0].path, { headers: { authorization: `Bearer ${CRON_SECRET}` } });
    assert.equal(res.status, 200);
  });
});

describe('Order indexes', () => {
  it('has a partial index on the reservation expiry limited to unpaid pending orders that hold stock', async () => {
    const indexes = await Order.collection.indexes();
    const index = indexes.find((entry) => JSON.stringify(entry.key) === JSON.stringify({ reservationExpiresAt: 1 }));
    assert.ok(index, 'index on reservationExpiresAt');
    assert.deepEqual(index.partialFilterExpression, { status: 'pending', paymentStatus: 'unpaid', inventoryReserved: true });
  });
});
