import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildOpenApiDocument } from '../contract/document.js';

const target = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../contract/openapi.json');
const rendered = `${JSON.stringify(buildOpenApiDocument(), null, 2)}\n`;

if (process.argv.includes('--check')) {
  const committed = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
  if (committed !== rendered) {
    console.error('server/contract/openapi.json is out of date: run `npm run contract` in server/');
    process.exit(1);
  }
} else {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, rendered);
}
