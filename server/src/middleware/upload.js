import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, cb) => file.mimetype.startsWith('image/') ? cb(null, true) : cb(new ApiError(400, 'Only image files are allowed'))
});
