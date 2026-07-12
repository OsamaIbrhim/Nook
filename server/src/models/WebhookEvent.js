import mongoose from 'mongoose';

const webhookEventSchema = new mongoose.Schema({
  stripeEventId: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  processedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const WebhookEvent = mongoose.model('WebhookEvent', webhookEventSchema);
