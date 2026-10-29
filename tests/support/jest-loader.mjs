/**
 * Module resolution hooks for the native `node:test` suite.
 *
 * The suite runs TypeScript sources directly (type stripping/transform), but
 * two things the Jest `moduleNameMapper` used to do are still required:
 *
 *  - `@oceanicos/*` and legacy `@omega-v/*` workspace specifiers point at the
 *    package source (`packages/<name>/src/index.ts`), not the built `dist/`.
 *  - Relative imports written for CommonJS (`./jobs.js`, `../index`) resolve
 *    to the `.ts` source.
 *
 * It also maps `@jest/globals` onto the compatibility layer so tests written
 * against Jest's explicit import keep working unchanged.
 */
import { existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const packagesDir = path.join(repoRoot, 'packages');
const compatUrl = pathToFileURL(path.join(here, 'jest-compat.mjs')).href;
const styleStub = pathToFileURL(path.join(repoRoot, 'tests', 'style-stub.cjs')).href;

const packageEntry = (name) => {
  const sourceEntry = path.join(packagesDir, name, 'src', 'index.ts');
  return existsSync(sourceEntry) ? sourceEntry : null;
};

const resolveFile = (basePath) => {
  if (existsSync(basePath) && !basePath.endsWith('/')) {
    const stat = path.extname(basePath);
    if (stat) return basePath;
  }
  const candidates = [];
  if (basePath.endsWith('.js')) candidates.push(`${basePath.slice(0, -3)}.ts`);
  if (basePath.endsWith('.jsx')) candidates.push(`${basePath.slice(0, -4)}.tsx`);
  if (!path.extname(basePath)) {
    candidates.push(`${basePath}.ts`, `${basePath}.tsx`, path.join(basePath, 'index.ts'), path.join(basePath, 'index.tsx'));
  }
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
};

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@jest/globals' || specifier === '@jest/globals.js') {
      return { url: compatUrl, shortCircuit: true };
    }

    if (specifier.endsWith('.css') || specifier.endsWith('.scss')) {
      return { url: styleStub, shortCircuit: true };
    }

    const workspace = /^@(?:oceanicos|omega-v)\/([a-z0-9][a-z0-9-]*)$/.exec(specifier);
    if (workspace) {
      const entry = packageEntry(workspace[1]);
      if (entry) return { url: pathToFileURL(entry).href, shortCircuit: true };
    }

    const isRelative = specifier.startsWith('./') || specifier.startsWith('../') || specifier.startsWith('/');
    if (isRelative && context.parentURL && context.parentURL.startsWith('file:')) {
      const parentPath = fileURLToPath(context.parentURL);
      const basePath = specifier.startsWith('/') ? specifier : path.resolve(path.dirname(parentPath), specifier);
      const resolved = resolveFile(basePath);
      if (resolved) return { url: pathToFileURL(resolved).href, shortCircuit: true };
    }

    return nextResolve(specifier, context);
  },
});
