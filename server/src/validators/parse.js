import { invalidRequest } from './common.js';

const fieldOf = (path) => path.reduce((field, segment) => (typeof segment === 'number' ? `${field}[${segment}]` : field ? `${field}.${segment}` : segment), '') || 'body';
const lastSegment = (field) => field.split('.').pop();

export function fieldErrorsOf(error) {
  return error.issues.map((issue) => ({ field: fieldOf(issue.path), message: issue.message }));
}

export function missingFieldsMessage(fieldErrors) {
  if (!fieldErrors.every(({ message }) => message === 'is required')) return undefined;
  return `Missing required fields: ${fieldErrors.map(({ field }) => lastSegment(field)).join(', ')}`;
}

export function parseWith(schema, input, message) {
  const result = schema.safeParse(input ?? {});
  if (result.success) return result.data;
  const fieldErrors = fieldErrorsOf(result.error);
  throw invalidRequest(typeof message === 'function' ? (missingFieldsMessage(fieldErrors) ?? message(fieldErrors)) : message, fieldErrors);
}
