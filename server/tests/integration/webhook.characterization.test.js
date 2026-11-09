import '../helpers/env.js';
import { before, after, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { startDatabase } from '../helpers/replSet.js';
import { startStripeStub } from '../helpers/stripeStub.js';
import { startApi } from '../helpers/apiClient.js';
import { address, bearer, createCategory, createOrderDocument, createProduct, createUser } from '../helpers/factories.js';
import { Product } from '../../src/models/Product.js';
import { Order } from '../../src/models/Order.js';
import { WebhookEvent } from '../../src/models/WebhookEvent.js';

let db, stub, api, admin, alice, category, mug;
let eventCounter = 0;

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
const reload = (order) => Order.findById(order._id);

async function pendingOrder(overrides = {}) {
  return createOrderDocument({ user: alice, items: [{ product: mug, quantity: 2 }], stripeCheckoutSessionId: 'cs_test_webhook', ...overrides });
}

function signedEvent(type, order, { id = `evt_test_${++eventCounter}`, signature } = {}) {
  const payload = JSON.stringify({
    id, object: 'event', type,
    data: { object: { id: 'cs_test_webhook', object: 'checkout.session', payment_intent: 'pi_test_webhook', metadata: { orderId: order?.id } } }
  });
  const header = signature ?? stub.stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET });
  return { id, payload, header };
}

const deliver = ({ payload, header }) => api.request('POST', '/api/v1/payments/webhook', {
  rawBody: payload, headers: { 'content-type': 'application/json', 'stripe-signature': header }
});

describe('POST /payments/webhook', () => {
  it('moves a pending unpaid order to processing and stores the payment intent on checkout.session.completed', async () => {
    const order = await pendingOrder();
    const res = await deliver(signedEvent('checkout.session.completed', order));
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { received: true });
    const stored = await reload(order);
    assert.equal(stored.status, 'processing');
    assert.equal(stored.paymentStatus, 'paid');
    assert.equal(stored.stripePaymentIntentId, 'pi_test_webhook');
    assert.equal(stored.statusHistory.at(-1).status, 'processing');
    assert.equal(await stockOf(), 3);
  });

  it('treats checkout.session.async_payment_succeeded like completed', async () => {
    const order = await pendingOrder();
    await deliver(signedEvent('checkout.session.async_payment_succeeded', order));
    const stored = await reload(order);
    assert.equal(stored.status, 'processing');
    assert.equal(stored.paymentStatus, 'paid');
  });

  it('records the event and ignores a replay of the same event id', async () => {
    const order = await pendingOrder();
    const event = signedEvent('checkout.session.completed', order);
    await deliver(event);
    await Order.updateOne({ _id: order._id }, { status: 'pending', paymentStatus: 'unpaid' });
    const replay = await deliver(event);
    assert.equal(replay.status, 200);
    const stored = await reload(order);
    assert.equal(stored.status, 'pending', 'a replayed event must not be applied a second time');
    assert.equal(await WebhookEvent.countDocuments({ stripeEventId: event.id }), 1);
  });

  it('leaves an already paid order unchanged', async () => {
    const order = await pendingOrder({ status: 'shipped', paymentStatus: 'paid', stripePaymentIntentId: 'pi_original' });
    await deliver(signedEvent('checkout.session.completed', order));
    const stored = await reload(order);
    assert.equal(stored.status, 'shipped');
    assert.equal(stored.stripePaymentIntentId, 'pi_original');
  });

  it('acknowledges an event for an unknown order and still records it', async () => {
    const res = await deliver(signedEvent('checkout.session.completed', { id: '64f000000000000000000001' }));
    assert.equal(res.status, 200);
    assert.equal(await WebhookEvent.countDocuments(), 1);
  });

  it('cancels an unpaid pending order and restores stock on checkout.session.expired', async () => {
    await Product.updateOne({ _id: mug._id }, { stock: 1 });
    const order = await pendingOrder();
    const res = await deliver(signedEvent('checkout.session.expired', order));
    assert.equal(res.status, 200);
    const stored = await reload(order);
    assert.equal(stored.status, 'cancelled');
    assert.equal(stored.paymentStatus, 'unpaid');
    assert.equal(stored.inventoryReserved, false);
    assert.equal(stored.statusHistory.at(-1).status, 'cancelled');
    assert.equal(await stockOf(), 3);
  });

  it('marks the payment failed and restores stock on checkout.session.async_payment_failed', async () => {
    await Product.updateOne({ _id: mug._id }, { stock: 1 });
    const order = await pendingOrder();
    await deliver(signedEvent('checkout.session.async_payment_failed', order));
    const stored = await reload(order);
    assert.equal(stored.status, 'cancelled');
    assert.equal(stored.paymentStatus, 'failed');
    assert.equal(await stockOf(), 3);
  });

  it('does not cancel a paid order on checkout.session.expired', async () => {
    const order = await pendingOrder({ status: 'processing', paymentStatus: 'paid' });
    await deliver(signedEvent('checkout.session.expired', order));
    const stored = await reload(order);
    assert.equal(stored.status, 'processing');
    assert.equal(await stockOf(), 3);
  });

  it('acknowledges and records an unhandled event type without changing the order', async () => {
    const order = await pendingOrder();
    const res = await deliver(signedEvent('charge.refunded', order));
    assert.equal(res.status, 200);
    assert.equal((await reload(order)).status, 'pending');
    assert.equal(await WebhookEvent.countDocuments(), 1);
  });

  it('KNOWN BUG (B2): a bad signature surfaces as a 500 and records nothing (desired: 400)', async () => {
    const order = await pendingOrder();
    const res = await deliver(signedEvent('checkout.session.completed', order, { signature: 't=1,v1=deadbeef' }));
    assert.equal(res.status, 500);
    assert.equal((await reload(order)).status, 'pending');
    assert.equal(await WebhookEvent.countDocuments(), 0);
  });

  it('KNOWN BUG (B2): a payment completing after the customer cancelled moves the cancelled order to processing, with stock already restored and no refund', async () => {
    await Product.updateOne({ _id: mug._id }, { stock: 3 });
    const created = await api.request('POST', '/api/v1/orders', {
      token: bearer(alice), body: { items: [{ product: mug.id, quantity: 2 }], shippingAddress: address }
    });
    const orderId = created.body.data.order._id;
    assert.equal(await stockOf(), 1);
    const session = await api.request('POST', '/api/v1/payments/checkout-session', { token: bearer(alice), body: { orderId } });
    assert.equal(session.status, 201);
    await api.request('POST', `/api/v1/orders/${orderId}/cancel`, { token: bearer(alice) });
    assert.equal(await stockOf(), 3);
    assert.equal(stub.calls.filter((call) => call.path.endsWith('/expire')).length, 0, 'desired after B2: the open Checkout session is expired on cancel');

    await deliver(signedEvent('checkout.session.completed', { id: orderId }));

    const stored = await Order.findById(orderId);
    assert.equal(stored.status, 'processing', 'desired after B2: stays cancelled');
    assert.equal(stored.paymentStatus, 'paid', 'desired after B2: refunded');
    assert.equal(await stockOf(), 3, 'stock stays restored although the order is now fulfillable: oversold');
    assert.equal(stub.calls.filter((call) => call.path.startsWith('/v1/refunds')).length, 0, 'desired after B2: one refund');
  });
});
