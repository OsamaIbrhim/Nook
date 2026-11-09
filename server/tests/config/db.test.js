import '../helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { connectDatabase } from '../../src/config/db.js';

test('an unreachable database makes connectDatabase fail within 8 seconds, well before the 30 second default', async () => {
  const startedAt = Date.now();
  await assert.rejects(connectDatabase('mongodb://127.0.0.1:1/nook_unreachable'), /ECONNREFUSED|timed out|selection/i);
  const elapsed = Date.now() - startedAt;
  assert.ok(elapsed >= 4000 && elapsed < 8000, `failed after ${elapsed} ms`);
  await mongoose.disconnect();
});
