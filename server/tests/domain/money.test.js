import test from 'node:test';
import assert from 'node:assert/strict';
import { fromMinorUnits, multiplyMinorUnits, toMinorUnits } from '../../src/domain/money.js';

test('toMinorUnits converts a decimal price to whole cents', () => {
  assert.equal(toMinorUnits(24), 2400);
  assert.equal(toMinorUnits(19.99), 1999);
  assert.equal(toMinorUnits(0), 0);
});

test('toMinorUnits absorbs float noise: 0.1 + 0.2 is 30 cents', () => {
  assert.equal(toMinorUnits(0.1 + 0.2), 30);
});

test('toMinorUnits rounds an exact half cent up: 0.125 is 12.5 cents, so 13', () => {
  assert.equal(toMinorUnits(0.125), 13);
});

test('toMinorUnits rejects negative and non-finite amounts', () => {
  for (const bad of [-0.01, NaN, Infinity]) assert.throws(() => toMinorUnits(bad), /Invalid money amount/);
});

test('fromMinorUnits converts cents back to a decimal amount', () => {
  assert.equal(fromMinorUnits(5997), 59.97);
  assert.equal(fromMinorUnits(0), 0);
});

test('multiplyMinorUnits multiplies exactly: 1999 cents x 3 is 5997 cents', () => {
  assert.equal(multiplyMinorUnits(1999, 3), 5997);
  assert.equal(multiplyMinorUnits(1999, 0), 0);
});

test('multiplyMinorUnits rejects fractional or negative quantities', () => {
  assert.throws(() => multiplyMinorUnits(100, 1.5), /Invalid quantity/);
  assert.throws(() => multiplyMinorUnits(100, -1), /Invalid quantity/);
});

test('a price survives the minor-unit round trip: 59.97 -> 5997 -> 59.97', () => {
  assert.equal(fromMinorUnits(toMinorUnits(59.97)), 59.97);
});
