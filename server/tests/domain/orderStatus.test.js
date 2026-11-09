import test from 'node:test';
import assert from 'node:assert/strict';
import { actionsFor, canTransition, isAwaitingPayment, ORDER_STATUSES, PAYMENT_STATUSES, TRANSITIONS, transitionBlocker } from '../../src/domain/orderStatus.js';

test('the status enumerations are the ones the Order model persists', () => {
  assert.deepEqual([...ORDER_STATUSES], ['pending', 'processing', 'shipped', 'delivered', 'cancelled']);
  assert.deepEqual([...PAYMENT_STATUSES], ['unpaid', 'paid', 'failed', 'refunded']);
});

test('the transition table lists the targets of each status', () => {
  assert.deepEqual(TRANSITIONS, { pending: ['processing', 'cancelled'], processing: ['shipped', 'cancelled'], shipped: ['delivered'], delivered: [], cancelled: [] });
});

const allowed = new Set(['pending>processing', 'pending>cancelled', 'processing>shipped', 'processing>cancelled', 'shipped>delivered']);

test('a paid order can make exactly the five documented transitions of the 5x5 matrix', () => {
  for (const from of ORDER_STATUSES) {
    for (const to of ORDER_STATUSES) {
      assert.equal(canTransition({ status: from, paymentStatus: 'paid' }, to), allowed.has(`${from}>${to}`), `${from} -> ${to}`);
    }
  }
});

test('an unpaid pending order cannot be processed but can be cancelled', () => {
  const order = { status: 'pending', paymentStatus: 'unpaid' };
  assert.equal(transitionBlocker(order, 'processing'), 'payment_required');
  assert.equal(transitionBlocker(order, 'cancelled'), null);
});

test('every non-paid payment status blocks processing', () => {
  for (const paymentStatus of ['unpaid', 'failed', 'refunded']) {
    assert.equal(transitionBlocker({ status: 'pending', paymentStatus }, 'processing'), 'payment_required', paymentStatus);
  }
});

test('a disallowed transition reports not_allowed before the payment check', () => {
  assert.equal(transitionBlocker({ status: 'shipped', paymentStatus: 'unpaid' }, 'processing'), 'not_allowed');
  assert.equal(transitionBlocker({ status: 'pending', paymentStatus: 'paid' }, 'delivered'), 'not_allowed');
});

test('an unknown current or target status is not allowed', () => {
  assert.equal(transitionBlocker({ status: 'teleported', paymentStatus: 'paid' }, 'shipped'), 'not_allowed');
  assert.equal(transitionBlocker({ status: 'pending', paymentStatus: 'paid' }, 'teleported'), 'not_allowed');
});

test('only pending plus unpaid is awaiting payment', () => {
  for (const status of ORDER_STATUSES) {
    for (const paymentStatus of PAYMENT_STATUSES) {
      assert.equal(isAwaitingPayment({ status, paymentStatus }), status === 'pending' && paymentStatus === 'unpaid', `${status}/${paymentStatus}`);
    }
  }
});

test('actionsFor a customer: pay and cancel only while awaiting payment, never a status change', () => {
  assert.deepEqual(actionsFor({ status: 'pending', paymentStatus: 'unpaid' }, 'customer'), { canPay: true, canCancel: true, nextStatuses: [] });
  assert.deepEqual(actionsFor({ status: 'processing', paymentStatus: 'paid' }, 'customer'), { canPay: false, canCancel: false, nextStatuses: [] });
});

test('actionsFor an admin: next statuses follow the transition table and the payment rule, and an admin never pays', () => {
  assert.deepEqual(actionsFor({ status: 'pending', paymentStatus: 'unpaid' }, 'admin'), { canPay: false, canCancel: true, nextStatuses: ['cancelled'] });
  assert.deepEqual(actionsFor({ status: 'pending', paymentStatus: 'paid' }, 'admin'), { canPay: false, canCancel: true, nextStatuses: ['processing', 'cancelled'] });
  assert.deepEqual(actionsFor({ status: 'processing', paymentStatus: 'paid' }, 'admin'), { canPay: false, canCancel: true, nextStatuses: ['shipped', 'cancelled'] });
  assert.deepEqual(actionsFor({ status: 'shipped', paymentStatus: 'paid' }, 'admin'), { canPay: false, canCancel: false, nextStatuses: ['delivered'] });
  assert.deepEqual(actionsFor({ status: 'delivered', paymentStatus: 'paid' }, 'admin'), { canPay: false, canCancel: false, nextStatuses: [] });
});
