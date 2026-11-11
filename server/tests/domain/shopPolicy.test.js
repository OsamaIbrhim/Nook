import test from 'node:test';
import assert from 'node:assert/strict';
import { createShopPolicy, readShopPolicy, toPublicConfig } from '../../src/domain/shopPolicy.js';

test('readShopPolicy defaults follow the 2026-11-09 decisions: egp, flat shipping 50, free from 200, 35 minute hold, 30 minute session, 99 per line', () => {
  assert.deepEqual({ ...readShopPolicy({}) }, {
    currency: 'egp', flatShippingRate: 50, freeShippingThreshold: 200, maxLineQuantity: 99, reservationMinutes: 35, checkoutSessionMinutes: 30,
    locale: 'en-US', returnWindowDays: 30, dispatchDaysMin: 1, dispatchDaysMax: 2, supportEmail: 'hello@nook.store', shipsTo: ['EG']
  });
});

test('readShopPolicy lets STRIPE_CURRENCY override the default currency', () => {
  assert.equal(readShopPolicy({ STRIPE_CURRENCY: 'usd' }).currency, 'usd');
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

test('toPublicConfig serves exactly the eleven storefront fields and hides the internal Checkout session length', () => {
  const policy = createShopPolicy({
    currency: 'usd', locale: 'en-GB', flatShippingRate: 7, freeShippingThreshold: 70, returnWindowDays: 14, dispatchDaysMin: 2, dispatchDaysMax: 4,
    maxLineQuantity: 10, reservationMinutes: 40, checkoutSessionMinutes: 31, supportEmail: 'help@shop.test', shipsTo: ['EG', 'SA']
  });
  assert.deepEqual(toPublicConfig(policy), {
    currency: 'usd', locale: 'en-GB', freeShippingThreshold: 70, flatShippingRate: 7, returnWindowDays: 14, dispatchDaysMin: 2, dispatchDaysMax: 4,
    maxLineQuantity: 10, reservationMinutes: 40, supportEmail: 'help@shop.test', shipsTo: ['EG', 'SA']
  });
});

test('toPublicConfig reports a missing free shipping threshold as null', () => {
  assert.equal(toPublicConfig(createShopPolicy({ freeShippingThreshold: null })).freeShippingThreshold, null);
});

test('dispatch days must be whole numbers with the minimum not above the maximum: 2 and 2 pass, 3 and 2 fail', () => {
  assert.equal(createShopPolicy({ dispatchDaysMin: 2, dispatchDaysMax: 2 }).dispatchDaysMax, 2);
  assert.throws(() => createShopPolicy({ dispatchDaysMin: 3, dispatchDaysMax: 2 }), /dispatchDays/);
  for (const bad of [-1, 1.5, '1']) assert.throws(() => createShopPolicy({ dispatchDaysMin: bad }), /dispatchDays/);
  assert.throws(() => createShopPolicy({ dispatchDaysMax: 1.5 }), /dispatchDays/);
});

test('returnWindowDays must be a whole number of days, zero allowed', () => {
  assert.equal(createShopPolicy({ returnWindowDays: 0 }).returnWindowDays, 0);
  for (const bad of [-1, 1.5, '30']) assert.throws(() => createShopPolicy({ returnWindowDays: bad }), /returnWindowDays/);
});

test('shipsTo needs at least one upper-case ISO country code and the support email needs an at sign', () => {
  for (const bad of [[], ['eg'], ['EGY'], 'EG', ['EG', 'sa']]) assert.throws(() => createShopPolicy({ shipsTo: bad }), /shipsTo/);
  assert.throws(() => createShopPolicy({ supportEmail: 'nobody' }), /supportEmail/);
});
