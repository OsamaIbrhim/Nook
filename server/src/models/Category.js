import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true, maxlength: 80 },
  slug: { type: String, required: true, unique: true, lowercase: true },
  description: { type: String, trim: true, maxlength: 500, default: '' }
}, { timestamps: true });

export const Category = mongoose.model('Category', categorySchema);
