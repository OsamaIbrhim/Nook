import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { slugify } from '../utils/slugify.js';
import { requireFields, assertObjectId } from '../validators/common.js';

export const listCategories = asyncHandler(async (_req, res) => {
  const active = { isActive: true };
  const [categories, counts, covers] = await Promise.all([
    Category.find().sort('name').lean(),
    Product.aggregate([{ $match: active }, { $group: { _id: '$category', productCount: { $sum: 1 } } }]),
    Product.aggregate([
      { $match: { ...active, 'images.0': { $exists: true } } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$category', url: { $first: { $arrayElemAt: ['$images.url', 0] } }, alt: { $first: { $arrayElemAt: ['$images.alt', 0] } }, name: { $first: '$name' } } }
    ])
  ]);
  const countOf = new Map(counts.map((entry) => [String(entry._id), entry.productCount]));
  const coverOf = new Map(covers.map((entry) => [String(entry._id), { url: entry.url, alt: entry.alt || entry.name }]));
  res.json({ success: true, data: { categories: categories.map((category) => ({ ...category, productCount: countOf.get(String(category._id)) ?? 0, cover: coverOf.get(String(category._id)) ?? null })) } });
});
export const createCategory = asyncHandler(async (req, res) => {
  requireFields(req.body, ['name']);
  const category = await Category.create({ name: req.body.name, slug: slugify(req.body.slug ?? req.body.name), description: req.body.description });
  res.status(201).json({ success: true, data: { category } });
});
export const updateCategory = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id);
  const updates = {};
  for (const field of ['name', 'description']) if (req.body[field] !== undefined) updates[field] = req.body[field];
  if (req.body.slug !== undefined) updates.slug = slugify(req.body.slug);
  const category = await Category.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!category) throw new ApiError(404, 'Category not found');
  res.json({ success: true, data: { category } });
});
export const deleteCategory = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id);
  if (await Product.exists({ category: req.params.id })) throw new ApiError(409, 'Cannot delete a category that contains products');
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) throw new ApiError(404, 'Category not found');
  res.status(204).send();
});
