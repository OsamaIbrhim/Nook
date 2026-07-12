import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { slugify } from '../utils/slugify.js';
import { requireFields, assertObjectId } from '../validators/common.js';

export const listCategories = asyncHandler(async (_req, res) => {
  const categories = await Category.find().sort('name').lean();
  res.json({ success: true, data: { categories } });
});
export const createCategory = asyncHandler(async (req, res) => {
  requireFields(req.body, ['name']);
  const category = await Category.create({ name: req.body.name, slug: slugify(req.body.name), description: req.body.description });
  res.status(201).json({ success: true, data: { category } });
});
export const updateCategory = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id);
  const updates = { ...req.body };
  if (updates.name) updates.slug = slugify(updates.name);
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
