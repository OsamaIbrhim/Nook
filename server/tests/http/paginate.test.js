import test from 'node:test';
import assert from 'node:assert/strict';
import { pageInfo, readPage } from '../../src/http/paginate.js';

test('readPage uses the defaults for a missing query: page 1, the default limit, skip 0', () => {
  assert.deepEqual(readPage({}, { defaultLimit: 12, maxLimit: 100 }), { page: 1, limit: 12, skip: 0 });
});

test('readPage skips whole pages: page 3 of 10 per page skips 20', () => {
  assert.deepEqual(readPage({ page: '3', limit: '10' }, { defaultLimit: 12, maxLimit: 100 }), { page: 3, limit: 10, skip: 20 });
});

test('readPage caps the limit at the maximum: 500 becomes 100', () => {
  assert.equal(readPage({ limit: '500' }, { defaultLimit: 12, maxLimit: 100 }).limit, 100);
});

test('readPage falls back to the defaults for zero, negative and non numeric values', () => {
  for (const bad of ['0', '-4', 'abc', '']) assert.deepEqual(readPage({ page: bad, limit: bad }, { defaultLimit: 20, maxLimit: 50 }), { page: 1, limit: 20, skip: 0 });
});

test('pageInfo rounds the page count up: 25 items at 10 per page is 3 pages', () => {
  assert.deepEqual(pageInfo({ page: 2, limit: 10, total: 25 }), { page: 2, limit: 10, total: 25, pages: 3 });
});

test('pageInfo reports zero pages for an empty result and one page for an exact fit', () => {
  assert.equal(pageInfo({ page: 1, limit: 10, total: 0 }).pages, 0);
  assert.equal(pageInfo({ page: 1, limit: 10, total: 10 }).pages, 1);
});
