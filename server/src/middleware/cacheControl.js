export const publicCache = (sMaxAge, staleWhileRevalidate) => (_req, res, next) => {
  res.set('Cache-Control', `public, max-age=0, s-maxage=${sMaxAge}${staleWhileRevalidate ? `, stale-while-revalidate=${staleWhileRevalidate}` : ''}`);
  next();
};

export const noStore = (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
};
