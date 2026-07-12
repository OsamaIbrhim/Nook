import multer from 'multer';
import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js';

export const notFound = (req, _res, next) => next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));

export function errorHandler(error, _req, res, _next) {
  let status = error.statusCode || 500;
  let message = error.message || 'Internal server error';
  let details = error.details;
  if (error instanceof mongoose.Error.ValidationError) { status = 400; message = 'Validation failed'; details = Object.values(error.errors).map((e) => e.message); }
  if (error?.code === 11000) { status = 409; message = `Duplicate value for ${Object.keys(error.keyValue || {}).join(', ')}`; }
  if (error instanceof multer.MulterError) { status = 400; message = error.message; }
  if (error.name === 'CastError') { status = 400; message = 'Invalid identifier'; }
  if (status >= 500) console.error(error);
  res.status(status).json({ success: false, error: { message, ...(details && { details }), ...(process.env.NODE_ENV === 'development' && status >= 500 && { stack: error.stack }) } });
}
