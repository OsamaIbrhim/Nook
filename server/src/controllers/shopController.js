import { shopPolicy } from '../config/shopPolicy.js';
import { toPublicConfig } from '../domain/shopPolicy.js';

export const getShopConfig = (_req, res) => res.json({ success: true, data: toPublicConfig(shopPolicy) });
