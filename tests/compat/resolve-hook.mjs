// ESM resolve + load hooks for the node:test compat layer.
//
// Replicates the source-resolution that `jest.config.js`'s `moduleNameMapper`
// provided, so stale Jest/Vitest `.test.ts` files run from SOURCE under
// `--experimental-transform-types` without edits:
//   - `vitest` / `@jest/globals`   → tests/compat/runtime.mjs (compat API)
//   - `@omega-v/<pkg>` / `@oceanicos/<pkg>` → a synthesized package shim
//   - relative `./x.js` / `./x` (no ext) → ./x.ts (when the .ts exists)
//
// Package indexes (bare specifier or a relative `../index`/`./index.js` that
// lands on `packages/<pkg>/src/index.ts`) resolve to a `compat-shim:` URL. The
// `load` hook synthesizes a module that re-exports the package's real runtime
// values and declares every exported interface/type-alias name as a placeholder
// binding. `--experimental-transform-types` cannot elide a non-`import type`
// import of an interface (jest/ts-jest did via full type analysis), so tests
// that do `import { Attestation } from '@oceanicos/types'` (used only as a type)
// would otherwise fail with "does not provide an export named 'Attestation'".
// Only active for the `test:unit` invocation (registered via --import).

import { existsSync, readFileSync, globSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve as pathResolve, dirname } from 'node:path';

const PKG = /^@(omega-v|oceanicos)\/(.+)$/;
const ROOT = fileURLToPath(new URL('../../', import.meta.url));

function packageIndexTs(pkg) {
  const idx = pathResolve(ROOT, `packages/${pkg}/src/index.ts`);
  if (existsSync(idx)) return idx;
  const alt = pathResolve(ROOT, `packages/${pkg}/src/${pkg}.ts`);
  if (existsSync(alt)) return alt;
  return null;
}

const VALUE_RE = /\bexport\s+(?:default\s+)?(?:abstract\s+)?(?:class|const|enum|function|let|var)\s+([A-Za-z_$][\w$]*)/g;
const TYPE_RE = /\bexport\s+(?:interface|type)\s+([A-Za-z_$][\w$]*)/g;

// Cache package → { realIndex, typeNames } so each package is scanned once.
const pkgCache = new Map();
function packageInfo(pkg) {
  if (pkgCache.has(pkg)) return pkgCache.get(pkg);
  const realIndex = packageIndexTs(pkg);
  let info = { realIndex: null, typeNames: [] };
  if (realIndex) {
    const values = new Set();
    const types = new Set();
    for (const f of globSync(`packages/${pkg}/src/**/*.ts`, { cwd: ROOT })) {
      const src = readFileSync(pathResolve(ROOT, f), 'utf8');
      let m;
      VALUE_RE.lastIndex = 0;
      while ((m = VALUE_RE.exec(src))) values.add(m[1]);
      TYPE_RE.lastIndex = 0;
      while ((m = TYPE_RE.exec(src))) types.add(m[1]);
    }
    info = { realIndex, typeNames: [...types].filter((t) => !values.has(t)) };
  }
  pkgCache.set(pkg, info);
  return info;
}

function shimUrl(pkg) {
  return `compat-shim:///${pkg}`;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'vitest' || specifier === '@jest/globals') {
    return { url: new URL('./runtime.mjs', import.meta.url).href, shortCircuit: true };
  }

  // Bare workspace package specifier → package shim (or source if no shim needed).
  const m = specifier.match(PKG);
  if (m) {
    const info = packageInfo(m[2]);
    if (info.realIndex) return { url: shimUrl(m[2]), shortCircuit: true };
    return nextResolve(specifier, context);
  }

  // Relative specifiers: map .js → .ts and extensionless → .ts / /index.ts,
  // and redirect a package's own index to its shim.
  if (specifier.startsWith('.')) {
    const base = new URL(context.parentURL);
    const resolved = new URL(specifier, base);
    const p = fileURLToPath(resolved);
    let candidate = null;
    if (p.endsWith('.js')) {
      const ts = p.slice(0, -3) + '.ts';
      if (existsSync(ts)) candidate = ts;
      else if (existsSync(p.slice(0, -3) + '.tsx')) candidate = p.slice(0, -3) + '.tsx';
    }
    const last = p.split('/').pop();
    if (!candidate && last && !last.includes('.')) {
      if (existsSync(p + '.ts')) candidate = p + '.ts';
      else if (existsSync(p + '.tsx')) candidate = p + '.tsx';
      else if (existsSync(p + '/index.ts')) candidate = p + '/index.ts';
    }
    if (candidate) {
      // If this resolves to a package's src/index.ts, serve the shim instead.
      const rel = candidate.slice(ROOT.length);
      const pm = rel.match(/^packages\/([^/]+)\/src\/index\.ts$/);
      if (pm) return { url: shimUrl(pm[1]), shortCircuit: true };
      return { url: pathToFileURL(candidate).href, shortCircuit: true };
    }
  }

  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.startsWith('compat-shim://')) {
    const pkg = decodeURIComponent(url.slice('compat-shim:///'.length));
    const info = packageInfo(pkg);
    if (!info.realIndex) return nextLoad(url, context);
    const realUrl = pathToFileURL(info.realIndex).href;
    const lines = [`export * from ${JSON.stringify(realUrl)};`];
    for (const t of info.typeNames) lines.push(`export const ${t} = undefined;`);
    return { format: 'module', source: lines.join('\n'), shortCircuit: true };
  }
  return nextLoad(url, context);
}
