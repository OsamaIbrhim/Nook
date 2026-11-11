const assertAmount = (value) => {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`Invalid money amount: ${value}`);
};

export function toMinorUnits(amount) {
  assertAmount(amount);
  return Math.round(amount * 100);
}

export const fromMinorUnits = (minor) => minor / 100;

export function multiplyMinorUnits(minor, quantity) {
  if (!Number.isInteger(quantity) || quantity < 0) throw new RangeError(`Invalid quantity: ${quantity}`);
  return minor * quantity;
}
