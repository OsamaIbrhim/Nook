import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  revokedAt: Date,
  replacedBy: String,
  userAgent: String,
  ip: String
}, { timestamps: true });

export const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
