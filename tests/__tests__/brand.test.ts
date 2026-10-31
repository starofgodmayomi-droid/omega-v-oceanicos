import assert from 'node:assert/strict';
import { each } from './node-test-each.ts';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * A brand document that drifts from the interface is the same defect as a
 * README that drifts from the routes, in a register people notice faster.
 */
describe('brand system', () => {
  const root = process.cwd();
  const brand = readFileSync(join(root, 'docs/BRAND.md'), 'utf8');
  const tokens = readFileSync(join(root, 'apps/web/src/tokens.css'), 'utf8');
  const appCss = readFileSync(join(root, 'apps/web/src/App.css'), 'utf8');
  const html = readFileSync(join(root, 'apps/web/index.html'), 'utf8');

  // Values are not all hex: --omega-abyss-edge, --omega-glass, and
  // --omega-shadow are rgba()/shadow expressions, so the table parser must
  // accept any value and compare it literally against tokens.css.
  const documented = Array.from(brand.matchAll(/`(--omega-[a-z-]+)`\s*\|\s*`([^`]+)`/g)).map(
    (match) => ({ token: match[1], value: match[2] })
  );

  it('documents a palette to check', () => {
    assert.ok(documented.length >= 10);
  });

  each(documented.map((entry) => [entry.token, entry.value]))(
    'defines %s as %s in tokens.css',
    (token, value) => {
      assert.ok(tokens.includes(`${token}: ${value};`));
    }
  );

  it('defines no token the brand document does not publish', () => {
    const defined = Array.from(tokens.matchAll(/(--omega-[a-z-]+):/g)).map((match) => match[1]);
    const published = new Set(documented.map((entry) => entry.token));

    assert.deepEqual(defined.filter((token) => !published.has(token)), []);
  });

  it('states the literal-colour debt honestly and does not let it grow', () => {
    const literals = appCss.match(/#[0-9a-fA-F]{3,8}/g) ?? [];
    const distinct = new Set(literals.map((value) => value.toLowerCase()));

    // The document claims 124 distinct across 198 uses. If a change pushes
    // either number up, the claim is stale and this fails — the debt may be
    // paid down freely, but it may not quietly grow.
    assert.ok(brand.includes('124 distinct colours across 198 uses'));
    assert.ok(distinct.size <= 124);
    assert.ok(literals.length <= 198);
  });

  it('ships the mark and wires it into the page', () => {
    const mark = readFileSync(join(root, 'apps/web/public/omega-mark.svg'), 'utf8');

    assert.ok(mark.includes('one root, one current, infinite forms'));
    // The check belongs inside the drop; the document says inverting that
    // inverts the meaning, so the mark must carry both paths.
    assert.match(mark, /<path[\s\S]*<path[\s\S]*<path/);
    assert.ok(html.includes('omega-mark.svg'));
    assert.ok(html.includes('favicon.svg'));
  });

  it('gives a shared link something to render', () => {
    for (const tag of ['og:title', 'og:description', 'og:image', 'twitter:card']) {
      assert.ok(html.includes(tag));
    }
  });

  it('keeps the public product lockup canonical', () => {
    assert.ok(html.includes('<title>OCEANICOS — Reality, Verified</title>'));
    assert.ok(html.includes('name="description"'));
    assert.ok(html.includes('theme-color'));
    assert.ok(!html.includes('Oceanicos Max'));
  });
});
