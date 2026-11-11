import { parsePositiveInt } from '../validators/common.js';

export function readPage(query, { defaultLimit, maxLimit }) {
  const page = parsePositiveInt(query.page, 1);
  const limit = parsePositiveInt(query.limit, defaultLimit, maxLimit);
  return { page, limit, skip: (page - 1) * limit };
}

export const pageInfo = ({ page, limit, total }) => ({ page, limit, total, pages: Math.ceil(total / limit) });
