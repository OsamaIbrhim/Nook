export class ApiError extends Error {
  constructor(statusCode, message, details, { code, fieldErrors } = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}
