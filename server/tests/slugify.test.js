import test from 'node:test';
import assert from 'node:assert/strict';
import { slugify } from '../src/utils/slugify.js';
test('slugify normalizes product names', () => assert.equal(slugify('  Café Mug — Large  '), 'cafe-mug-large'));
