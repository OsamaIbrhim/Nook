import assert from 'node:assert/strict';
import { responseSchema } from '../../src/contract/document.js';

export function assertMatchesContract(operationId, status, body) {
  const schema = responseSchema(operationId, status);
  assert.ok(schema, `the contract documents no ${status} response for ${operationId}`);
  const result = schema.safeParse(body);
  assert.ok(result.success, `${operationId} ${status} breaks the contract: ${result.success ? '' : JSON.stringify(result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`))}`);
}
