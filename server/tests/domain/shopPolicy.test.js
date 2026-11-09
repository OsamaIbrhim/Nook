import test from 'node:test';
import assert from 'node:assert/strict';
import { createShopPolicy, readShopPolicy } from '../../src/domain/shopPolicy.js';

test('readShopPolicy defaults reproduce today: usd, no shipping charge, 35 minute hold, 30 minute session, 99 per line', () => {
  assert.deepEqual({ ...readShopPolicy({}) }, {
    currency: 'usd', flatShippingRate: 0, freeShippingThreshold: null, maxLineQuantity: 99, reservationMinutes: 35, checkoutSessionMinutes: 30
  });
});

test('readShopPolicy lowercases STRIPE_CURRENCY', () => {
  assert.equal(readShopPolicy({ STRIPE_CURRENCY: 'EGP' }).currency, 'egp');
});

test('the policy is frozen', () => {
  assert.equal(Object.isFrozen(readShopPolicy({})), true);
});

test('a Checkout session shorter than the Stripe minimum of 30 minutes is rejected, 30 is accepted', () => {
  assert.throws(() => createShopPolicy({ checkoutSessionMinutes: 29 }), /at least 30/);
  assert.equal(createShopPolicy({ checkoutSessionMinutes: 30 }).checkoutSessionMinutes, 30);
});

test('a reservation shorter than the Checkout session is rejected, equal length is accepted', () => {
  assert.throws(() => createShopPolicy({ reservationMinutes: 34, checkoutSessionMinutes: 35 }), /reservationMinutes/);
  assert.equal(createShopPolicy({ reservationMinutes: 35, checkoutSessionMinutes: 35 }).reservationMinutes, 35);
});

test('maxLineQuantity of 1 is the smallest accepted value', () => {
  assert.equal(createShopPolicy({ maxLineQuantity: 1 }).maxLineQuantity, 1);
});

test('maxLineQuantity must be a positive integer', () => {
  for (const bad of [0, -1, 1.5, '99']) assert.throws(() => createShopPolicy({ maxLineQuantity: bad }), /maxLineQuantity/);
});

test('shipping values must not be negative', () => {
  assert.throws(() => createShopPolicy({ flatShippingRate: -1 }), /flatShippingRate/);
  assert.throws(() => createShopPolicy({ freeShippingThreshold: -1 }), /freeShippingThreshold/);
  assert.equal(createShopPolicy({ freeShippingThreshold: 0 }).freeShippingThreshold, 0);
});
