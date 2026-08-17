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

  const documented = Array.from(brand.matchAll(/`(--omega-[a-z-]+)`\s*\|\s*`(#[0-9a-f]{6})`/g)).map(
    (match) => ({ token: match[1], value: match[2] })
  );

  it('documents a palette to check', () => {
    expect(documented.length).toBeGreaterThanOrEqual(10);
  });

  it.each(documented.map((entry) => [entry.token, entry.value]))(
    'defines %s as %s in tokens.css',
    (token, value) => {
      expect(tokens).toContain(`${token}: ${value};`);
    }
  );

  it('defines no token the brand document does not publish', () => {
    const defined = Array.from(tokens.matchAll(/(--omega-[a-z-]+):/g)).map((match) => match[1]);
    const published = new Set(documented.map((entry) => entry.token));

    expect(defined.filter((token) => !published.has(token))).toEqual([]);
  });

  it('states the literal-colour debt honestly and does not let it grow', () => {
    const literals = appCss.match(/#[0-9a-fA-F]{3,8}/g) ?? [];
    const distinct = new Set(literals.map((value) => value.toLowerCase()));

    // The document claims 109 distinct across 146 uses. If a change pushes
    // either number up, the claim is stale and this fails — the debt may be
    // paid down freely, but it may not quietly grow.
    expect(brand).toContain('109 distinct colours across 146 uses');
    expect(distinct.size).toBeLessThanOrEqual(109);
    expect(literals.length).toBeLessThanOrEqual(146);
  });

  it('ships the mark and wires it into the page', () => {
    const mark = readFileSync(join(root, 'apps/web/public/omega-mark.svg'), 'utf8');

    expect(mark).toContain('one root, one current, infinite forms');
    // The check belongs inside the drop; the document says inverting that
    // inverts the meaning, so the mark must carry both paths.
    expect(mark).toMatch(/<path[\s\S]*<path[\s\S]*<path/);
    expect(html).toContain('omega-mark.svg');
    expect(html).toContain('favicon.svg');
  });

  it('gives a shared link something to render', () => {
    for (const tag of ['og:title', 'og:description', 'og:image', 'twitter:card']) {
      expect(html).toContain(tag);
    }
  });
});
