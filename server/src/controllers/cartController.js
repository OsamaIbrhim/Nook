import { Product } from '../models/Product.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { shopPolicy } from '../config/shopPolicy.js';
import { freeShippingRemaining, priceCart } from '../domain/pricing.js';
import { parseQuoteRequest } from '../validators/cart.js';

const HIDDEN_ISSUES = new Set(['inactive', 'not_found']);

function presentLine(line, product) {
  const visible = product && !HIDDEN_ISSUES.has(line.issue);
  const image = visible ? product.images?.[0] : undefined;
  return {
    productId: line.productId,
    slug: visible ? product.slug : null,
    name: visible ? product.name : null,
    image: image ? { url: image.url, alt: image.alt || product.name } : null,
    category: visible && product.category ? { name: product.category.name, slug: product.category.slug } : null,
    unitPrice: line.unitPrice,
    compareAtPrice: visible ? (product.compareAtPrice ?? null) : null,
    requestedQuantity: line.requestedQuantity,
    quantity: line.quantity,
    maxQuantity: line.maxQuantity,
    lineTotal: line.lineTotal,
    status: line.status,
    issue: line.issue
  };
}

export const quoteCart = asyncHandler(async (req, res) => {
  const lines = parseQuoteRequest(req.body);
  const products = await Product.find({ _id: { $in: lines.map((line) => line.productId) } })
    .select('name slug price compareAtPrice stock isActive images category').populate('category', 'name slug').lean();
  const quote = priceCart(lines, products, shopPolicy);
  const byId = new Map(products.map((product) => [String(product._id), product]));
  res.json({
    success: true,
    data: {
      currency: shopPolicy.currency,
      lines: quote.lines.map((line) => presentLine(line, byId.get(line.productId))),
      subtotal: quote.subtotal,
      shipping: quote.shipping,
      total: quote.total,
      freeShippingThreshold: shopPolicy.freeShippingThreshold,
      freeShippingRemaining: freeShippingRemaining(quote.subtotal, shopPolicy),
      checkoutAllowed: quote.checkoutAllowed
    }
  });
});
