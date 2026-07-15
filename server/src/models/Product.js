import mongoose from 'mongoose';

const imageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  publicId: { type: String, required: true },
  alt: { type: String, default: '' }
}, { _id: false });

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 160 },
  slug: { type: String, required: true, unique: true, lowercase: true, index: true },
  description: { type: String, required: true, trim: true, maxlength: 5000 },
  shortDescription: { type: String, trim: true, maxlength: 240 },
  sku: { type: String, unique: true, sparse: true, uppercase: true, trim: true, index: true },
  brand: { type: String, default: 'Nook Objects', trim: true },
  material: { type: String, trim: true, maxlength: 240 },
  dimensions: { type: String, trim: true, maxlength: 240 },
  care: { type: String, trim: true, maxlength: 500 },
  benefits: [{ type: String, trim: true, maxlength: 180 }],
  tags: [{ type: String, lowercase: true, trim: true }],
  seo: {
    title: { type: String, trim: true, maxlength: 70 },
    description: { type: String, trim: true, maxlength: 170 }
  },
  price: { type: Number, required: true, min: 0 },
  compareAtPrice: { type: Number, min: 0 },
  stock: { type: Number, required: true, min: 0, default: 0 },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
  images: { type: [imageSchema], validate: [(value) => value.length <= 8, 'Maximum 8 images'] },
  isActive: { type: Boolean, default: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category: 1, price: 1, createdAt: -1 });

export const Product = mongoose.model('Product', productSchema);
