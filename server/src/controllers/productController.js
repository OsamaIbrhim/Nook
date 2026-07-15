import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { slugify } from '../utils/slugify.js';
import { uploadBuffer, deleteCloudinaryImages } from '../utils/upload.js';
import { requireFields, assertObjectId, parsePositiveInt } from '../validators/common.js';

const parseBool = (value) => value === true || value === 'true';
const parseArray = (value, label) => {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value;
  try { const parsed = JSON.parse(value); if (Array.isArray(parsed)) return parsed; } catch { /* handled below */ }
  throw new ApiError(400, `${label} must be a JSON array`);
};
const asNumber = (value, label) => { const n = Number(value); if (!Number.isFinite(n) || n < 0) throw new ApiError(400, `${label} must be a non-negative number`); return n; };

export const listProducts = asyncHandler(async (req, res) => {
  const page = parsePositiveInt(req.query.page, 1);
  const limit = parsePositiveInt(req.query.limit, 12, 100);
  const filter = { isActive: true };
  if (req.query.category) {
    const value = String(req.query.category);
    if (/^[a-f\d]{24}$/i.test(value)) filter.category = value;
    else {
      const category = await Category.findOne({ slug: slugify(value) }).select('_id').lean();
      filter.category = category?._id || null;
    }
  }
  if (req.query.minPrice || req.query.maxPrice) {
    filter.price = {};
    if (req.query.minPrice) filter.price.$gte = asNumber(req.query.minPrice, 'minPrice');
    if (req.query.maxPrice) filter.price.$lte = asNumber(req.query.maxPrice, 'maxPrice');
  }
  if (req.query.search) filter.$text = { $search: String(req.query.search).slice(0, 100) };
  const allowedSorts = { newest: '-createdAt', price_asc: 'price', price_desc: '-price', name: 'name' };
  const sort = allowedSorts[req.query.sort] || '-createdAt';
  const [products, total] = await Promise.all([
    Product.find(filter).populate('category', 'name slug').sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    Product.countDocuments(filter)
  ]);
  res.json({ success: true, data: { products, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ $or: [{ slug: req.params.idOrSlug }, ...(req.params.idOrSlug.match(/^[a-f\d]{24}$/i) ? [{ _id: req.params.idOrSlug }] : [])], isActive: true }).populate('category', 'name slug');
  if (!product) throw new ApiError(404, 'Product not found');
  res.json({ success: true, data: { product } });
});

export const createProduct = asyncHandler(async (req, res) => {
  requireFields(req.body, ['name', 'description', 'price', 'stock', 'category']);
  assertObjectId(req.body.category, 'category');
  if (!(await Category.exists({ _id: req.body.category }))) throw new ApiError(400, 'Category does not exist');
  const images = await Promise.all((req.files || []).map(async (file) => {
    const uploaded = await uploadBuffer(file.buffer);
    return { url: uploaded.secure_url, publicId: uploaded.public_id, alt: req.body.name };
  }));
  try {
    const product = await Product.create({
      name: req.body.name, slug: slugify(req.body.name), description: req.body.description,
      shortDescription: req.body.shortDescription, sku: req.body.sku, brand: req.body.brand,
      material: req.body.material, dimensions: req.body.dimensions, care: req.body.care,
      benefits: parseArray(req.body.benefits, 'benefits'), tags: parseArray(req.body.tags, 'tags'),
      seo: { title: req.body.seoTitle, description: req.body.seoDescription },
      price: asNumber(req.body.price, 'price'), compareAtPrice: req.body.compareAtPrice ? asNumber(req.body.compareAtPrice, 'compareAtPrice') : undefined,
      stock: asNumber(req.body.stock, 'stock'), category: req.body.category, images,
      isActive: req.body.isActive === undefined ? true : parseBool(req.body.isActive), createdBy: req.user.id
    });
    res.status(201).json({ success: true, data: { product } });
  } catch (error) { await deleteCloudinaryImages(images); throw error; }
});

export const updateProduct = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id);
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');
  const newImages = await Promise.all((req.files || []).map(async (file) => {
    const uploaded = await uploadBuffer(file.buffer); return { url: uploaded.secure_url, publicId: uploaded.public_id, alt: req.body.name || product.name };
  }));
  let removable = [];
  if (req.body.removeImagePublicIds) {
    try { removable = JSON.parse(req.body.removeImagePublicIds); } catch { throw new ApiError(400, 'removeImagePublicIds must be a JSON array'); }
    if (!Array.isArray(removable)) throw new ApiError(400, 'removeImagePublicIds must be a JSON array');
  }
  const oldToDelete = product.images.filter((image) => removable.includes(image.publicId));
  product.images = [...product.images.filter((image) => !removable.includes(image.publicId)), ...newImages];
  for (const key of ['name', 'description', 'shortDescription', 'sku', 'brand', 'material', 'dimensions', 'care', 'category']) if (req.body[key] !== undefined) product[key] = req.body[key];
  if (req.body.benefits !== undefined) product.benefits = parseArray(req.body.benefits, 'benefits');
  if (req.body.tags !== undefined) product.tags = parseArray(req.body.tags, 'tags');
  if (!product.seo) product.seo = {};
  if (req.body.seoTitle !== undefined) product.seo.title = req.body.seoTitle;
  if (req.body.seoDescription !== undefined) product.seo.description = req.body.seoDescription;
  if (req.body.name) product.slug = slugify(req.body.name);
  for (const key of ['price', 'compareAtPrice', 'stock']) if (req.body[key] !== undefined) product[key] = asNumber(req.body[key], key);
  if (req.body.isActive !== undefined) product.isActive = parseBool(req.body.isActive);
  try { await product.save(); await deleteCloudinaryImages(oldToDelete); res.json({ success: true, data: { product } }); }
  catch (error) { await deleteCloudinaryImages(newImages); throw error; }
});

export const deleteProduct = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id);
  const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!product) throw new ApiError(404, 'Product not found');
  res.status(204).send();
});
