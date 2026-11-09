import '../helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';

process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/nook_unreachable';
const { default: handler } = await import('../../api/index.js');

test('the serverless entry answers 503 with Retry-After and a generic body while the database is unreachable', async () => {
  const server = await new Promise((resolve) => { const s = express().use((req, res) => handler(req, res)).listen(0, '127.0.0.1', () => resolve(s)); });
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/v1/health`);
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('retry-after'), '5');
    assert.deepEqual(await response.json(), { success: false, error: { message: 'API is temporarily unavailable', code: 'service_unavailable' } });
  } finally { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); }
});
