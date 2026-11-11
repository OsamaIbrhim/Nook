import test from 'node:test';
import assert from 'node:assert/strict';
import { checkoutSessionExpiryUnix, isExpired, reservationExpiry } from '../../src/domain/reservation.js';
import { createShopPolicy } from '../../src/domain/shopPolicy.js';

const noon = new Date('2026-11-09T12:00:00Z');
// 20766 days since the epoch (56 years * 365 + 14 leap days = 20454 to 2026-01-01, + 304 to 1 Nov, + 8) * 86400 + 12 * 3600
const NOON_UNIX = 1_794_225_600;

test('reservationExpiry adds the reservation minutes: 12:00 + 35 min = 12:35', () => {
  assert.equal(reservationExpiry(noon, createShopPolicy({})).toISOString(), '2026-11-09T12:35:00.000Z');
});

test('reservationExpiry follows the policy: 12:00 + 40 min = 12:40', () => {
  assert.equal(reservationExpiry(noon, createShopPolicy({ reservationMinutes: 40 })).toISOString(), '2026-11-09T12:40:00.000Z');
});

test('checkoutSessionExpiryUnix is now in whole seconds plus 30 minutes (1800 s)', () => {
  assert.equal(checkoutSessionExpiryUnix(noon, createShopPolicy({})), NOON_UNIX + 1800);
});

test('checkoutSessionExpiryUnix drops milliseconds and follows the policy: 45 min = 2700 s', () => {
  const withMillis = new Date(noon.getTime() + 999);
  const policy = createShopPolicy({ checkoutSessionMinutes: 45, reservationMinutes: 45 });
  assert.equal(checkoutSessionExpiryUnix(withMillis, policy), NOON_UNIX + 2700);
});

test('isExpired is false one millisecond before the expiry and true at and after it', () => {
  const order = { reservationExpiresAt: noon };
  assert.equal(isExpired(order, new Date(noon.getTime() - 1)), false);
  assert.equal(isExpired(order, noon), true);
  assert.equal(isExpired(order, new Date(noon.getTime() + 1)), true);
});
