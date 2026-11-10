import { LoginRequest, PASSWORD_MIN_LENGTH, RegisterRequest } from '../contract/schemas.js';
import { parseWith } from './parse.js';

const registerMessage = ([first]) => {
  if (first.field === 'email') return 'Invalid email address';
  if (first.field === 'password') return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  return `Invalid registration: ${first.field} ${first.message}`;
};

export const parseRegisterRequest = (body) => parseWith(RegisterRequest, body, registerMessage);
export const parseLoginRequest = (body) => parseWith(LoginRequest, body, ([first]) => `Invalid login: ${first.field} ${first.message}`);
