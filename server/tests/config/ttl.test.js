import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTtlToMs } from '../../src/config/ttl.js';

test('parseTtlToMs converts each unit: 45s, 15m, 2h and 7d', () => {
  assert.equal(parseTtlToMs('45s'), 45_000);
  assert.equal(parseTtlToMs('15m'), 900_000);
  assert.equal(parseTtlToMs('2h'), 7_200_000);
  assert.equal(parseTtlToMs('7d'), 604_800_000);
});

test('parseTtlToMs rejects formats whose meaning would be ambiguous', () => {
  for (const bad of ['', '7', '0d', '-1d', '1.5d', '7 days', '7w', 'd7', ' 7d', undefined]) {
    assert.throws(() => parseTtlToMs(bad), /Unsupported duration/, String(bad));
  }
});
