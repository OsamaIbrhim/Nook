import './env.js';
import { readShopPolicy } from '../domain/shopPolicy.js';

export const shopPolicy = readShopPolicy(process.env);
