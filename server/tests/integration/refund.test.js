import '../helpers/env.js';
import { before, after, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { startDatabase } from '../helpers/replSet.js';
import { startStripeStub } from '../helpers/stripeStub.js';
import { startApi } from '../helpers/apiClient.js';
import { bearer, createCategory, createOrderDocument, createProduct, createUser } from '../helpers/factories.js';
import { Product } from '../../src/models/Product.js';
import { Order } from '../../src/models/Order.js';

let db, stub, api, admin, alice, category, mug;

before(async () => {
  db = await startDatabase();
  stub = await startStripeStub();
  api = await startApi({ stripe: stub.stripe });
  admin = await createUser({ role: 'admin' });
  alice = await createUser();
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
  mug = await createProduct({ category, createdBy: admin, name: 'Ripple Ceramic Mug', price: 24, stock: 3 });
});

const stockOf = async () => (await Product.findById(mug._id)).stock;
const refundCalls = () => stub.calls.filter((call) => call.path === '/v1/refunds');
const expireCalls = () => stub.calls.filter((call) => call.path.endsWith('/expire'));
const adminCancel = (id) => api.request('PATCH', `/api/v1/orders/${id}/status`, { token: bearer(admin), body: { status: 'cancelled' } });
const customerCancel = (id) => api.request('POST', `/api/v1/orders/${id}/cancel`, { token: bearer(alice) });
const paidOrder = (overrides = {}) => createOrderDocument({
  user: alice, items: [{ product: mug, quantity: 2 }], status: 'processing', paymentStatus: 'paid', stripePaymentIntentId: 'pi_test_paid', ...overrides
});
const unpaidOrder = (overrides = {}) => createOrderDocument({ user: alice, items: [{ product: mug, quantity: 2 }], ...overrides });

describe('admin cancel of a paid order', () => {
  it('records the acting admin on the cancelled history entry', async () => {
    const order = await paidOrder();
    const res = await adminCancel(order.id);
    const last = res.body.data.order.statusHistory.at(-1);
    assert.equal(last.status, 'cancelled');
    assert.equal(last.by, admin.id);
  });

  it('answers 502 refund_failed and changes nothing when Stripe fails, then succeeds on retry with the same refund key', async () => {
    const order = await paidOrder();
    stub.failNext('/v1/refunds', 500);
    const failed = await adminCancel(order.id);
    assert.equal(failed.status, 502);
    assert.equal(failed.body.error.code, 'refund_failed');
    let stored = await Order.findById(order._id);
    assert.equal(stored.status, 'processing');
    assert.equal(stored.paymentStatus, 'paid');
    assert.equal(await stockOf(), 3);

    const retried = await adminCancel(order.id);
    assert.equal(retried.status, 200);
    stored = await Order.findById(order._id);
    assert.equal(stored.status, 'cancelled');
    assert.equal(stored.paymentStatus, 'refunded');
    assert.equal(await stockOf(), 5);
    assert.deepEqual(refundCalls().map((call) => call.idempotencyKey), [`refund:${order.id}`, `refund:${order.id}`]);
  });

  it('treats a charge Stripe reports as already refunded as a completed refund', async () => {
    const order = await paidOrder();
    stub.failNext('/v1/refunds', 400, 'charge_already_refunded');
    const res = await adminCancel(order.id);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.order.paymentStatus, 'refunded');
  });

  it('answers 409 refund_unavailable without calling Stripe when no payment intent was stored', async () => {
    const order = await paidOrder({ stripePaymentIntentId: undefined });
    const res = await adminCancel(order.id);
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'refund_unavailable');
    assert.equal(stub.calls.length, 0);
    assert.equal((await Order.findById(order._id)).status, 'processing');
  });

  it('cancels a processing order whose payment was already refunded in Stripe without a second refund', async () => {
    const order = await paidOrder({ paymentStatus: 'refunded' });
    const res = await adminCancel(order.id);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.order.status, 'cancelled');
    assert.equal(res.body.data.order.paymentStatus, 'refunded');
    assert.equal(refundCalls().length, 0);
    assert.equal(await stockOf(), 5);
  });

  it('refuses a second admin cancel with 409 and refunds only once', async () => {
    const order = await paidOrder();
    await adminCancel(order.id);
    const again = await adminCancel(order.id);
    assert.equal(again.status, 409);
    assert.equal(again.body.error.message, 'Cannot change status from cancelled to cancelled');
    assert.equal(refundCalls().length, 1);
    assert.equal(await stockOf(), 5);
  });

  it('refunds with one key and restores stock once when two admins cancel at the same moment', async () => {
    const order = await paidOrder();
    const results = await Promise.all([adminCancel(order.id), adminCancel(order.id)]);
    assert.ok(results.every((res) => res.status === 200 || res.status === 409), results.map((res) => res.status).join());
    assert.ok(results.some((res) => res.status === 200));
    assert.equal(await stockOf(), 5);
    assert.equal(new Set(refundCalls().map((call) => call.idempotencyKey)).size, 1);
    assert.equal((await Order.findById(order._id)).statusHistory.filter((entry) => entry.status === 'cancelled').length, 1);
  });
});

describe('customer cancel', () => {
  it('cannot cancel a paid order: 409, no refund, order unchanged', async () => {
    const order = await paidOrder();
    const res = await customerCancel(order.id);
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'not_cancellable');
    assert.equal(refundCalls().length, 0);
    assert.equal((await Order.findById(order._id)).paymentStatus, 'paid');
  });

  it('answers 200 for an own order that is already cancelled and refunded, without calling Stripe', async () => {
    const order = await paidOrder({ status: 'cancelled', paymentStatus: 'refunded' });
    const res = await customerCancel(order.id);
    assert.equal(res.status, 200);
    assert.equal(stub.calls.length, 0);
  });

  it('expires the open Checkout session before cancelling an order awaiting payment', async () => {
    stub.addSession('cs_open_1', 'open');
    const order = await unpaidOrder({ stripeCheckoutSessionId: 'cs_open_1' });
    const res = await customerCancel(order.id);
    assert.equal(res.status, 200);
    assert.equal(expireCalls().length, 1);
    assert.equal(expireCalls()[0].path, '/v1/checkout/sessions/cs_open_1/expire');
    assert.equal(stub.sessionStatus('cs_open_1'), 'expired');
    assert.equal(res.body.data.order.status, 'cancelled');
  });

  it('answers 409 payment_in_progress and changes nothing when the customer already completed the payment', async () => {
    stub.addSession('cs_done_1', 'complete');
    const order = await unpaidOrder({ stripeCheckoutSessionId: 'cs_done_1' });
    const res = await customerCancel(order.id);
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'payment_in_progress');
    const stored = await Order.findById(order._id);
    assert.equal(stored.status, 'pending');
    assert.equal(stored.inventoryReserved, true);
  });

  it('cancels when the stored session is already expired at Stripe', async () => {
    stub.addSession('cs_old_1', 'expired');
    const order = await unpaidOrder({ stripeCheckoutSessionId: 'cs_old_1' });
    assert.equal((await customerCancel(order.id)).status, 200);
  });

  it('answers 502 and changes nothing when Stripe cannot expire the session', async () => {
    stub.addSession('cs_open_2', 'open');
    const order = await unpaidOrder({ stripeCheckoutSessionId: 'cs_open_2' });
    stub.failNext('/v1/checkout/sessions/cs_open_2/expire', 500);
    const res = await customerCancel(order.id);
    assert.equal(res.status, 502);
    assert.equal((await Order.findById(order._id)).status, 'pending');
  });

  it('needs no Stripe call, and no Stripe configuration, to cancel an order that never reached Checkout', async () => {
    const unconfigured = await startApi();
    try {
      const order = await unpaidOrder();
      const res = await unconfigured.request('POST', `/api/v1/orders/${order.id}/cancel`, { token: bearer(alice) });
      assert.equal(res.status, 200);
    } finally { await unconfigured.stop(); }
  });
});

describe('admin status changes', () => {
  it('lets only one of two simultaneous ship requests win and records one shipped entry', async () => {
    const order = await paidOrder();
    const ship = () => api.request('PATCH', `/api/v1/orders/${order.id}/status`, { token: bearer(admin), body: { status: 'shipped' } });
    const results = await Promise.all([ship(), ship()]);
    assert.deepEqual(results.map((res) => res.status).sort(), [200, 409]);
    assert.equal((await Order.findById(order._id)).statusHistory.filter((entry) => entry.status === 'shipped').length, 1);
  });
});

describe('Order invariant', () => {
  it('rejects a cancelled order that is marked paid', async () => {
    await assert.rejects(paidOrder({ status: 'cancelled' }), /cancelled order cannot be marked paid/);
  });
});
