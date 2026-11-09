import { fromMinorUnits, multiplyMinorUnits, toMinorUnits } from './money.js';

export function shippingFor(subtotal, policy) {
  const { freeShippingThreshold, flatShippingRate } = policy;
  if (freeShippingThreshold !== null && toMinorUnits(subtotal) >= toMinorUnits(freeShippingThreshold)) return 0;
  return flatShippingRate;
}

const idOf = (product) => String(product.id ?? product._id);

function mergeLines(lines) {
  const quantities = new Map();
  for (const { productId, quantity } of lines) {
    if (!Number.isInteger(quantity) || quantity < 1) throw new RangeError(`Invalid quantity for ${productId}: ${quantity}`);
    quantities.set(productId, (quantities.get(productId) ?? 0) + quantity);
  }
  return quantities;
}

function priceLine(productId, requestedQuantity, product, policy) {
  const unavailable = (issue) => ({ productId, unitPrice: null, requestedQuantity, quantity: 0, maxQuantity: 0, lineTotal: 0, status: 'unavailable', issue });
  if (!product) return unavailable('not_found');
  if (!product.isActive) return unavailable('inactive');
  if (product.stock < 1) return unavailable('out_of_stock');

  const maxQuantity = Math.min(policy.maxLineQuantity, product.stock);
  const quantity = Math.min(requestedQuantity, maxQuantity);
  const lineTotal = fromMinorUnits(multiplyMinorUnits(toMinorUnits(product.price), quantity));
  const issue = quantity === requestedQuantity ? null : (product.stock < policy.maxLineQuantity ? 'stock_reduced' : 'quantity_capped');
  return { productId, unitPrice: product.price, requestedQuantity, quantity, maxQuantity, lineTotal, status: issue ? 'adjusted' : 'ok', issue };
}

export function priceCart(lines, products, policy) {
  const byId = new Map(products.map((product) => [idOf(product), product]));
  const priced = [...mergeLines(lines)].map(([productId, quantity]) => priceLine(productId, quantity, byId.get(productId), policy));
  const purchasable = priced.filter((line) => line.quantity > 0);
  const subtotalMinor = purchasable.reduce((sum, line) => sum + toMinorUnits(line.lineTotal), 0);
  const subtotal = fromMinorUnits(subtotalMinor);
  const shipping = purchasable.length ? shippingFor(subtotal, policy) : 0;
  return {
    lines: priced,
    subtotal,
    shipping,
    total: fromMinorUnits(subtotalMinor + toMinorUnits(shipping)),
    checkoutAllowed: purchasable.length > 0
  };
}
