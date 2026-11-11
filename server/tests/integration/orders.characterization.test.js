import '../helpers/env.js';
import { before, after, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { startDatabase } from '../helpers/replSet.js';
import { startStripeStub } from '../helpers/stripeStub.js';
import { startApi } from '../helpers/apiClient.js';
import { address, bearer, createCategory, createOrderDocument, createProduct, createUser } from '../helpers/factories.js';
import { Product } from '../../src/models/Product.js';
import { Order } from '../../src/models/Order.js';

let db, stub, api, admin, alice, bob, category, mug, lamp;

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
  await db.clear('Product', 'Order', 'WebhookEvent');
  stub.reset();
  mug = await createProduct({ category, createdBy: admin, name: 'Ripple Ceramic Mug', price: 24, stock: 5 });
  lamp = await createProduct({ category, createdBy: admin, name: 'Arc Table Lamp', price: 99.5, stock: 2 });
});

const stockOf = async (product) => (await Product.findById(product._id)).stock;
const place = (user, items) => api.request('POST', '/api/v1/orders', {
  token: bearer(user), body: { items: items.map(([product, quantity]) => ({ product: product.id, quantity })), shippingAddress: address }
});
const cancelAsCustomer = (user, id) => api.request('POST', `/api/v1/orders/${id}/cancel`, { token: bearer(user) });
const setStatus = (user, id, status) => api.request('PATCH', `/api/v1/orders/${id}/status`, { token: bearer(user), body: { status } });

describe('POST /orders', () => {
  it('prices the order on the server, reserves stock and adds the flat 50 shipping below 200', async () => {
    const res = await place(alice, [[mug, 2], [lamp, 1]]);
    assert.equal(res.status, 201);
    const { order } = res.body.data;
    const byName = Object.fromEntries(order.items.map((item) => [item.name, item]));
    assert.equal(byName['Ripple Ceramic Mug'].unitPrice, 24);
    assert.equal(byName['Ripple Ceramic Mug'].lineTotal, 48);
    assert.equal(byName['Arc Table Lamp'].lineTotal, 99.5);
    assert.equal(order.subtotal, 147.5);
    assert.equal(order.shipping, 50);
    assert.equal(order.total, 197.5);
    assert.equal(order.currency, 'egp');
    assert.equal(order.status, 'pending');
    assert.equal(order.paymentStatus, 'unpaid');
    assert.equal(order.inventoryReserved, true);
    assert.equal(order.user, alice.id);
    assert.equal(order.shippingAddress.country, 'EG');
    assert.equal(await stockOf(mug), 3);
    assert.equal(await stockOf(lamp), 1);
  });

  it('charges 50 shipping on a single mug: 24 + 50 = 74', async () => {
    const res = await place(alice, [[mug, 1]]);
    assert.equal(res.body.data.order.subtotal, 24);
    assert.equal(res.body.data.order.shipping, 50);
    assert.equal(res.body.data.order.total, 74);
  });

  it('charges 50 shipping at 199.00 and none at 223.00: 2 x 99.50 = 199, then + 1 x 24 = 223', async () => {
    const below = await place(alice, [[lamp, 2]]);
    assert.equal(below.body.data.order.subtotal, 199);
    assert.equal(below.body.data.order.shipping, 50);
    assert.equal(below.body.data.order.total, 249);
    await Product.updateOne({ _id: lamp._id }, { stock: 2 });
    const above = await place(alice, [[lamp, 2], [mug, 1]]);
    assert.equal(above.body.data.order.subtotal, 223);
    assert.equal(above.body.data.order.shipping, 0);
    assert.equal(above.body.data.order.total, 223);
  });

  it('applies the free shipping threshold on the subtotal: 199.99 pays 50 (total 249.99), 200.00 is free', async () => {
    const justBelow = await createProduct({ category, createdBy: admin, price: 199.99, stock: 3 });
    const exactly = await createProduct({ category, createdBy: admin, price: 200, stock: 3 });
    const paying = await place(alice, [[justBelow, 1]]);
    assert.equal(paying.body.data.order.shipping, 50);
    assert.equal(paying.body.data.order.total, 249.99);
    const free = await place(alice, [[exactly, 1]]);
    assert.equal(free.body.data.order.shipping, 0);
    assert.equal(free.body.data.order.total, 200);
  });

  it('holds the reservation for 35 minutes from creation', async () => {
    const startedAt = Date.now();
    const res = await place(alice, [[mug, 1]]);
    const expiresAt = new Date(res.body.data.order.reservationExpiresAt).getTime();
    assert.ok(expiresAt >= startedAt + 35 * 60_000 && expiresAt <= Date.now() + 35 * 60_000);
  });

  it('ignores a client-supplied price', async () => {
    const res = await api.request('POST', '/api/v1/orders', {
      token: bearer(alice), body: { items: [{ product: mug.id, quantity: 1, unitPrice: 0.01, price: 0.01 }], shippingAddress: address }
    });
    assert.equal(res.body.data.order.items[0].unitPrice, 24);
    assert.equal(res.body.data.order.total, 74);
  });

  it('merges repeated lines for the same product', async () => {
    const res = await place(alice, [[mug, 1], [mug, 2]]);
    assert.equal(res.body.data.order.items.length, 1);
    assert.equal(res.body.data.order.items[0].quantity, 3);
    assert.equal(res.body.data.order.items[0].lineTotal, 72);
    assert.equal(await stockOf(mug), 2);
  });

  it('rejects more than the available stock with 409 and leaves stock unchanged', async () => {
    const res = await place(alice, [[mug, 6]]);
    assert.equal(res.status, 409);
    assert.equal(res.body.error.message, 'Insufficient stock for Ripple Ceramic Mug');
    assert.equal(await stockOf(mug), 5);
    assert.equal(await Order.countDocuments(), 0);
  });

  it('rolls back every reservation when a later line lacks stock', async () => {
    const res = await place(alice, [[mug, 1], [lamp, 3]]);
    assert.equal(res.status, 409);
    assert.equal(await stockOf(mug), 5);
    assert.equal(await stockOf(lamp), 2);
    assert.equal(await Order.countDocuments(), 0);
  });

  it('allows ordering exactly the remaining stock', async () => {
    const res = await place(alice, [[lamp, 2]]);
    assert.equal(res.status, 201);
    assert.equal(await stockOf(lamp), 0);
  });

  it('rejects quantity 0 and quantity 100 with the same 400', async () => {
    for (const quantity of [0, 100]) {
      const res = await place(alice, [[mug, quantity]]);
      assert.equal(res.status, 400);
      assert.equal(res.body.error.message, 'Item quantity must be between 1 and 99');
    }
  });

  it('rejects an inactive product, an unknown product and a malformed id', async () => {
    await Product.updateOne({ _id: lamp._id }, { isActive: false });
    const inactive = await place(alice, [[lamp, 1]]);
    assert.equal(inactive.status, 400);
    assert.equal(inactive.body.error.message, 'One or more products are unavailable');
    const unknown = await place(alice, [[{ id: '64f000000000000000000001' }, 1]]);
    assert.equal(unknown.status, 400);
    assert.equal(unknown.body.error.message, 'One or more products are unavailable');
    const malformed = await place(alice, [[{ id: 'not-an-id' }, 1]]);
    assert.equal(malformed.status, 400);
    assert.equal(malformed.body.error.message, 'Invalid product');
  });

  it('rejects an empty cart, a missing address field and an anonymous caller', async () => {
    const empty = await api.request('POST', '/api/v1/orders', { token: bearer(alice), body: { items: [], shippingAddress: address } });
    assert.equal(empty.status, 400);
    assert.equal(empty.body.error.message, 'Cart must contain at least one item');
    const { city, ...incomplete } = address;
    const missing = await api.request('POST', '/api/v1/orders', { token: bearer(alice), body: { items: [{ product: mug.id, quantity: 1 }], shippingAddress: incomplete } });
    assert.equal(missing.status, 400);
    assert.equal(missing.body.error.message, 'Missing required fields: city');
    const anonymous = await api.request('POST', '/api/v1/orders', { body: { items: [{ product: mug.id, quantity: 1 }], shippingAddress: address } });
    assert.equal(anonymous.status, 401);
  });
});

describe('GET orders', () => {
  it('lists only the caller own orders with pagination', async () => {
    await createOrderDocument({ user: alice, items: [{ product: mug, quantity: 1 }] });
    await createOrderDocument({ user: bob, items: [{ product: mug, quantity: 1 }] });
    const res = await api.request('GET', '/api/v1/orders/mine', { token: bearer(alice) });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.orders.length, 1);
    assert.deepEqual(res.body.data.pagination, { page: 1, limit: 10, total: 1, pages: 1 });
  });

  it('lets the owner and an admin read an order', async () => {
    const order = await createOrderDocument({ user: alice, items: [{ product: mug, quantity: 1 }] });
    const owner = await api.request('GET', `/api/v1/orders/${order.id}`, { token: bearer(alice) });
    assert.equal(owner.status, 200);
    assert.equal(owner.body.data.order.user.email, alice.email);
    const adminRead = await api.request('GET', `/api/v1/orders/${order.id}`, { token: bearer(admin) });
    assert.equal(adminRead.status, 200);
  });

  it('answers 404 to another customer reading an order, so its existence is not disclosed', async () => {
    const order = await createOrderDocument({ user: alice, items: [{ product: mug, quantity: 1 }] });
    const stranger = await api.request('GET', `/api/v1/orders/${order.id}`, { token: bearer(bob) });
    assert.equal(stranger.status, 404);
    assert.equal(stranger.body.error.message, 'Order not found');
  });

  it('restricts the admin order list to admins', async () => {
    assert.equal((await api.request('GET', '/api/v1/orders', { token: bearer(alice) })).status, 403);
    assert.equal((await api.request('GET', '/api/v1/orders', { token: bearer(admin) })).status, 200);
  });
});

describe('POST /orders/:id/cancel (customer)', () => {
  it('cancels a pending unpaid order and restores the reserved stock', async () => {
    const created = await place(alice, [[mug, 2]]);
    assert.equal(await stockOf(mug), 3);
    const res = await cancelAsCustomer(alice, created.body.data.order._id);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.order.status, 'cancelled');
    assert.equal(res.body.data.order.inventoryReserved, false);
    assert.equal(await stockOf(mug), 5);
    const history = res.body.data.order.statusHistory;
    assert.equal(history.at(-1).status, 'cancelled');
    assert.equal(history.at(-1).by, alice.id);
  });

  it('answers a second sequential cancel with 200 and the cancelled order, and restores stock once', async () => {
    const created = await place(alice, [[mug, 2]]);
    const id = created.body.data.order._id;
    await cancelAsCustomer(alice, id);
    const again = await cancelAsCustomer(alice, id);
    assert.equal(again.status, 200);
    assert.equal(again.body.data.order.status, 'cancelled');
    assert.equal(again.body.data.order.statusHistory.filter((entry) => entry.status === 'cancelled').length, 1);
    assert.equal(await stockOf(mug), 5);
  });

  it('answers 404 for another customer order and 409 for a paid order', async () => {
    const order = await createOrderDocument({ user: alice, items: [{ product: mug, quantity: 1 }] });
    assert.equal((await cancelAsCustomer(bob, order.id)).status, 404);
    const paid = await createOrderDocument({ user: alice, items: [{ product: mug, quantity: 1 }], status: 'processing', paymentStatus: 'paid' });
    const res = await cancelAsCustomer(alice, paid.id);
    assert.equal(res.status, 409);
    assert.equal(res.body.error.message, 'Only pending unpaid orders can be cancelled');
  });

  it('a customer cancel racing an admin cancel restores the stock exactly once', async () => {
    const created = await place(alice, [[mug, 2]]);
    const id = created.body.data.order._id;
    assert.equal(await stockOf(mug), 3);
    const results = await Promise.all([cancelAsCustomer(alice, id), setStatus(admin, id, 'cancelled')]);
    assert.ok(results.every((res) => res.status === 200), results.map((res) => res.status).join());
    assert.equal(await stockOf(mug), 5);
    assert.equal((await Order.findById(id)).inventoryReserved, false);
  });

  it('two concurrent customer cancels restore the stock exactly once', async () => {
    const created = await place(alice, [[mug, 2]]);
    const id = created.body.data.order._id;
    const results = await Promise.all([cancelAsCustomer(alice, id), cancelAsCustomer(alice, id)]);
    assert.deepEqual(results.map((res) => res.status), [200, 200]);
    assert.equal(await stockOf(mug), 5);
  });

  it('restores every line of a multi-item order exactly once: 5 + 2, 2 + 1 after a double cancel', async () => {
    const created = await place(alice, [[mug, 2], [lamp, 1]]);
    const id = created.body.data.order._id;
    await Promise.all([cancelAsCustomer(alice, id), cancelAsCustomer(alice, id), setStatus(admin, id, 'cancelled')]);
    assert.equal(await stockOf(mug), 5);
    assert.equal(await stockOf(lamp), 2);
  });
});

describe('PATCH /orders/:id/status (admin)', () => {
  const statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  const allowed = new Set(['pending>processing', 'pending>cancelled', 'processing>shipped', 'processing>cancelled', 'shipped>delivered']);

  it('permits exactly the five documented transitions (a cancelled order is refunded, never paid)', async () => {
    for (const from of statuses) {
      for (const to of statuses) {
        const order = await createOrderDocument({ user: alice, items: [{ product: mug, quantity: 1 }], status: from, paymentStatus: from === 'cancelled' ? 'refunded' : 'paid', stripePaymentIntentId: 'pi_test_matrix', inventoryReserved: false });
        const res = await setStatus(admin, order.id, to);
        const expected = allowed.has(`${from}>${to}`) ? 200 : 409;
        assert.equal(res.status, expected, `${from} -> ${to}`);
        if (expected === 409) assert.equal(res.body.error.message, `Cannot change status from ${from} to ${to}`);
      }
    }
  });

  it('refuses to process an unpaid order', async () => {
    const order = await createOrderDocument({ user: alice, items: [{ product: mug, quantity: 1 }] });
    const res = await setStatus(admin, order.id, 'processing');
    assert.equal(res.status, 409);
    assert.equal(res.body.error.message, 'An unpaid order cannot be processed');
  });

  it('refuses an unknown status and a non-admin caller', async () => {
    const order = await createOrderDocument({ user: alice, items: [{ product: mug, quantity: 1 }], paymentStatus: 'paid' });
    const unknown = await setStatus(admin, order.id, 'teleported');
    assert.equal(unknown.status, 409);
    assert.equal(unknown.body.error.message, 'Cannot change status from pending to teleported');
    assert.equal((await setStatus(alice, order.id, 'processing')).status, 403);
  });

  it('records the acting admin in the status history', async () => {
    const order = await createOrderDocument({ user: alice, items: [{ product: mug, quantity: 1 }], status: 'processing', paymentStatus: 'paid', inventoryReserved: false });
    const res = await setStatus(admin, order.id, 'shipped');
    assert.equal(res.body.data.order.status, 'shipped');
    assert.equal(res.body.data.order.statusHistory.at(-1).by, admin.id);
  });

  it('restores reserved stock when an admin cancels a pending order', async () => {
    const created = await place(alice, [[mug, 2]]);
    const res = await setStatus(admin, created.body.data.order._id, 'cancelled');
    assert.equal(res.status, 200);
    assert.equal(await stockOf(mug), 5);
  });

  it('cancelling a paid order refunds it in full once, marks it refunded and restores the stock', async () => {
    await Product.updateOne({ _id: mug._id }, { stock: 3 });
    const order = await createOrderDocument({ user: alice, items: [{ product: mug, quantity: 2 }], status: 'processing', paymentStatus: 'paid', stripePaymentIntentId: 'pi_test_paid', inventoryReserved: true });
    const res = await setStatus(admin, order.id, 'cancelled');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.order.status, 'cancelled');
    assert.equal(res.body.data.order.paymentStatus, 'refunded');
    const refunds = stub.calls.filter((call) => call.path === '/v1/refunds');
    assert.equal(refunds.length, 1);
    assert.equal(refunds[0].params.payment_intent, 'pi_test_paid');
    assert.equal(refunds[0].idempotencyKey, `refund:${order.id}`);
    assert.equal(await stockOf(mug), 5);
  });
});
