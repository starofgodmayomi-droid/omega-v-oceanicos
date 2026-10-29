import { existsSync, readFileSync } from 'node:fs';
import { dirname, normalize, resolve } from 'node:path';
const root = '/app';
const LINK = /\[[^\]]*\]\(([^)#\s]+)(?:#[^)\s]*)?\)/g;
for (const file of ['README.md', 'apps/api/README.md', 'docs/README.md', 'ECOSYSTEM_BODY.md']) {
  const full = resolve(root, file);
  const broken = Array.from(readFileSync(full, 'utf8').matchAll(LINK)).map(m => m[1])
    .filter(t => !/^(https?:|mailto:|\/)/.test(t))
    .filter(t => { const r = normalize(resolve(dirname(full), t)); return !r.startsWith(root) || !existsSync(r); });
  console.log('links', file, JSON.stringify(broken));
}
const src = readFileSync('/app/apps/api/src/index.ts', 'utf8');
const readme = readFileSync('/app/apps/api/README.md', 'utf8');
const routes = Array.from(src.matchAll(/(?:fastify|app)\.(get|post)\('([^']+)'/g)).map(m => ({ m: m[1].toUpperCase(), p: m[2] }));
const missing = routes.filter(r => !readme.includes(r.p));
console.log('routes served', routes.length, 'missing from API README', missing.length, missing.map(r => r.m + ' ' + r.p).join(', '));
