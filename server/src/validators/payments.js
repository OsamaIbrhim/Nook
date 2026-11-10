import { CheckoutSessionRequest } from '../contract/schemas.js';
import { parseWith } from './parse.js';

export const parseCheckoutSessionRequest = (body) => parseWith(CheckoutSessionRequest, body, () => 'Invalid orderId');
