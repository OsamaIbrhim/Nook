import mongoose from 'mongoose';
import { isConsistent, ORDER_STATUSES, PAYMENT_STATUSES } from '../domain/orderStatus.js';
import { reservationExpiry } from '../domain/reservation.js';
import { shopPolicy } from '../config/shopPolicy.js';

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  image: String,
  unitPrice: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 1 },
  lineTotal: { type: Number, required: true, min: 0 }
}, { _id: false });

const addressSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  line1: { type: String, required: true, trim: true },
  line2: { type: String, trim: true, default: '' },
  city: { type: String, required: true, trim: true },
  state: { type: String, trim: true, default: '' },
  postalCode: { type: String, required: true, trim: true },
  country: { type: String, required: true, trim: true, uppercase: true, minlength: 2, maxlength: 2 },
  phone: { type: String, trim: true, default: '' }
}, { _id: false });

const statusHistorySchema = new mongoose.Schema({
  status: { type: String, required: true },
  at: { type: Date, default: Date.now },
  by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  note: String
}, { _id: false });

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  items: { type: [orderItemSchema], required: true, validate: [(v) => v.length > 0, 'Order must contain items'] },
  shippingAddress: { type: addressSchema, required: true },
  subtotal: { type: Number, required: true, min: 0 },
  shipping: { type: Number, required: true, min: 0, default: 0 },
  total: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true, lowercase: true },
  status: { type: String, enum: ORDER_STATUSES, default: 'pending', index: true },
  paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'unpaid', index: true },
  stripeCheckoutSessionId: { type: String, sparse: true, unique: true },
  stripePaymentIntentId: String,
  idempotencyKey: String,
  requestFingerprint: String,
  inventoryReserved: { type: Boolean, default: true },
  reservationExpiresAt: { type: Date, default: () => reservationExpiry(new Date(), shopPolicy) },
  statusHistory: { type: [statusHistorySchema], default: [{ status: 'pending', at: new Date() }] }
}, { timestamps: true });

orderSchema.pre('validate', function rejectCancelledPaid() {
  if (!isConsistent(this)) this.invalidate('status', 'A cancelled order cannot be marked paid');
});

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ user: 1, idempotencyKey: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } });
orderSchema.index({ reservationExpiresAt: 1 }, { partialFilterExpression: { status: 'pending', paymentStatus: 'unpaid', inventoryReserved: true } });
export const Order = mongoose.model('Order', orderSchema);
