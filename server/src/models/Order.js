import mongoose from 'mongoose';

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
  by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  items: { type: [orderItemSchema], required: true, validate: [(v) => v.length > 0, 'Order must contain items'] },
  shippingAddress: { type: addressSchema, required: true },
  subtotal: { type: Number, required: true, min: 0 },
  shipping: { type: Number, required: true, min: 0, default: 0 },
  total: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true, lowercase: true },
  status: { type: String, enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'], default: 'pending', index: true },
  paymentStatus: { type: String, enum: ['unpaid', 'paid', 'failed', 'refunded'], default: 'unpaid', index: true },
  stripeCheckoutSessionId: { type: String, sparse: true, unique: true },
  stripePaymentIntentId: String,
  inventoryReserved: { type: Boolean, default: true },
  reservationExpiresAt: { type: Date, default: () => new Date(Date.now() + 35 * 60 * 1000) },
  statusHistory: { type: [statusHistorySchema], default: [{ status: 'pending', at: new Date() }] }
}, { timestamps: true });

orderSchema.index({ user: 1, createdAt: -1 });
export const Order = mongoose.model('Order', orderSchema);
