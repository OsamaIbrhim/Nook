import test from 'node:test';
import assert from 'node:assert/strict';
import { orderCode } from '../../src/domain/orderCode.js';

test('orderCode is the last eight characters of the id in upper case: 64f0a1b2c3d4e5f6a7b8c9d0 gives A7B8C9D0', () => {
  assert.equal(orderCode('64f0a1b2c3d4e5f6a7b8c9d0'), 'A7B8C9D0');
});

test('orderCode accepts an ObjectId-like value with a toString', () => {
  assert.equal(orderCode({ toString: () => '000000000000000000abcdef' }), '00ABCDEF');
});
