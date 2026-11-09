import { Router } from 'express';
import { getShopConfig } from '../controllers/shopController.js';
import { publicCache } from '../middleware/cacheControl.js';

const router = Router();
router.get('/config', publicCache(300), getShopConfig);
export default router;
