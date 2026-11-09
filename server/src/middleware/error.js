import multer from 'multer';
import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js';

export const notFound = (req, _res, next) => next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));

const defaultCodes = { 400: 'bad_request', 401: 'unauthorized', 403: 'forbidden', 404: 'not_found', 409: 'conflict', 413: 'payload_too_large', 429: 'too_many_requests' };
const defaultCode = (status) => defaultCodes[status] ?? (status >= 500 ? 'internal_error' : 'error');

export function errorHandler(error, _req, res, _next) {
  let status = error.statusCode || 500;
  let message = error.message || 'Internal server error';
  let details = error.details;
  let code = typeof error.code === 'string' ? error.code : undefined;
  let fieldErrors = error.fieldErrors;
  if (error instanceof mongoose.Error.ValidationError) { status = 400; message = 'Validation failed'; code = 'validation_failed'; details = Object.values(error.errors).map((e) => e.message); fieldErrors = Object.values(error.errors).map((e) => ({ field: e.path, message: e.message })); }
  if (error?.code === 11000) { status = 409; message = `Duplicate value for ${Object.keys(error.keyValue || {}).join(', ')}`; code = 'duplicate_value'; }
  if (error instanceof multer.MulterError) { status = 400; message = error.message; }
  if (error.name === 'CastError') { status = 400; message = 'Invalid identifier'; }
  if (status >= 500) console.error(error);
  if (status >= 500 && !(error instanceof ApiError)) message = 'Internal server error';
  res.set('Cache-Control', 'no-store');
  res.status(status).json({ success: false, error: { message, code: code ?? defaultCode(status), ...(details && { details }), ...(fieldErrors && { fieldErrors }), ...(process.env.NODE_ENV === 'development' && status >= 500 && { stack: error.stack }) } });
}
