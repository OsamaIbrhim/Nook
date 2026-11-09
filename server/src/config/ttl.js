const UNIT_MS = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };

export function parseTtlToMs(value) {
  const match = /^([1-9]\d*)([smhd])$/.exec(value);
  if (!match) throw new Error(`Unsupported duration "${value}": use a positive integer followed by s, m, h or d`);
  return Number(match[1]) * UNIT_MS[match[2]];
}
