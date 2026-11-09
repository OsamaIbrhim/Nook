import '../helpers/env.js';
import { before, after, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { startDatabase } from '../helpers/replSet.js';
import { startStripeStub } from '../helpers/stripeStub.js';
import { startApi } from '../helpers/apiClient.js';
import { createCategory, createOrderDocument, createProduct, createUser } from '../helpers/factories.js';
import { createWebhookSender } from '../helpers/webhookEvents.js';
import { Order } from '../../src/models/Order.js';
import { WebhookEvent } from '../../src/models/WebhookEvent.js';

let db, stub, api, hooks, admin, alice, category, mug;

before(async () => {
  db = await startDatabase();
  stub = await startStripeStub();
  api = await startApi({ stripe: stub.stripe });
  hooks = createWebhookSender({ stripe: stub.stripe, api });
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

const order = (overrides = {}) => createOrderDocument({ user: alice, items: [{ product: mug, quantity: 2 }], stripeCheckoutSessionId: 'cs_test_webhook', ...overrides });
const reload = (doc) => Order.findById(doc._id);
const refundCalls = () => stub.calls.filter((call) => call.path === '/v1/refunds');

describe('charge.refunded', () => {
  it('marks a paid order refunded when the whole charge was refunded in Stripe, leaving its fulfilment status alone', async () => {
    const paid = await order({ status: 'processing', paymentStatus: 'paid', stripePaymentIntentId: 'pi_refund_1' });
    const res = await hooks.deliver(hooks.chargeEvent('charge.refunded', { payment_intent: 'pi_refund_1', refunded: true }));
    assert.equal(res.status, 200);
    const stored = await reload(paid);
    assert.equal(stored.paymentStatus, 'refunded');
    assert.equal(stored.status, 'processing');
    assert.equal(await WebhookEvent.countDocuments(), 1);
  });

  it('ignores a partial refund', async () => {
    const paid = await order({ status: 'processing', paymentStatus: 'paid', stripePaymentIntentId: 'pi_refund_2' });
    await hooks.deliver(hooks.chargeEvent('charge.refunded', { payment_intent: 'pi_refund_2', refunded: false }));
    assert.equal((await reload(paid)).paymentStatus, 'paid');
  });

  it('records and ignores a refund for an unknown payment intent or an order that is not paid', async () => {
    const unpaid = await order({ stripePaymentIntentId: 'pi_refund_3' });
    await hooks.deliver(hooks.chargeEvent('charge.refunded', { payment_intent: 'pi_unknown', refunded: true }));
    await hooks.deliver(hooks.chargeEvent('charge.refunded', { payment_intent: 'pi_refund_3', refunded: true }));
    assert.equal((await reload(unpaid)).paymentStatus, 'unpaid');
    assert.equal(await WebhookEvent.countDocuments(), 2);
  });
});

describe('delivery guarantees', () => {
  it('applies two simultaneous deliveries of one event exactly once and acknowledges both', async () => {
    const pending = await order();
    const event = hooks.checkoutEvent('checkout.session.completed', pending.id);
    const results = await Promise.all([hooks.deliver(event), hooks.deliver(event)]);
    assert.deepEqual(results.map((res) => res.status), [200, 200]);
    const stored = await reload(pending);
    assert.equal(stored.status, 'processing');
    assert.equal(stored.statusHistory.filter((entry) => entry.status === 'processing').length, 1);
    assert.equal(await WebhookEvent.countDocuments({ stripeEventId: event.id }), 1);
  });

  it('answers 5xx and records nothing when the refund of a late payment fails, then completes on redelivery with the same refund key', async () => {
    const cancelled = await order({ status: 'cancelled', inventoryReserved: false });
    const event = hooks.checkoutEvent('checkout.session.completed', cancelled.id);
    stub.failNext('/v1/refunds', 500);
    const failed = await hooks.deliver(event);
    assert.ok(failed.status >= 500, `status ${failed.status}`);
    assert.equal(await WebhookEvent.countDocuments(), 0);
    assert.equal((await reload(cancelled)).paymentStatus, 'unpaid');

    const redelivered = await hooks.deliver(event);
    assert.equal(redelivered.status, 200);
    const stored = await reload(cancelled);
    assert.equal(stored.status, 'cancelled');
    assert.equal(stored.paymentStatus, 'refunded');
    assert.deepEqual(refundCalls().map((call) => call.idempotencyKey), [`refund:${cancelled.id}`, `refund:${cancelled.id}`]);
  });

  it('does not refund a late payment twice for an order already refunded', async () => {
    const refunded = await order({ status: 'cancelled', paymentStatus: 'refunded', inventoryReserved: false });
    const res = await hooks.deliver(hooks.checkoutEvent('checkout.session.completed', refunded.id));
    assert.equal(res.status, 200);
    assert.equal(refundCalls().length, 0);
  });

  it('never moves a cancelled order to processing', async () => {
    const cancelled = await order({ status: 'cancelled', inventoryReserved: false });
    await hooks.deliver(hooks.checkoutEvent('checkout.session.async_payment_succeeded', cancelled.id));
    assert.equal((await reload(cancelled)).status, 'cancelled');
  });
});
