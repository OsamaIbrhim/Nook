import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeRegExp } from '../../src/text/escapeRegExp.js';

test('escapeRegExp escapes every regular expression metacharacter so the text matches itself literally', () => {
  const metacharacters = '.*+?^${}()|[]\\';
  const pattern = new RegExp(`^${escapeRegExp(metacharacters)}$`);
  assert.equal(pattern.test(metacharacters), true);
  assert.equal(escapeRegExp('a.b'), 'a\\.b');
});

test('an escaped dot does not match another character: a.b matches "a.b" but not "axb"', () => {
  const pattern = new RegExp(escapeRegExp('a.b'));
  assert.equal(pattern.test('a.b'), true);
  assert.equal(pattern.test('axb'), false);
});

test('escapeRegExp leaves plain words and a hyphen untouched', () => {
  assert.equal(escapeRegExp('ripple-mug 2'), 'ripple-mug 2');
});
