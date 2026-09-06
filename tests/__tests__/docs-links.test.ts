import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, normalize, relative, resolve } from 'node:path';

/**
 * Every relative link in every document must point at something real.
 *
 * docs/README.md linked to ten files that were never written: an API
 * reference, an SDK, a CLI, three verification deep dives, three system
 * design documents and a release process. Three of them carried "(coming
 * soon)". The rest read as though they were already there.
 *
 * docs-claims.test.ts checks that two directory READMEs describe their own
 * contents. This is the wider case: a link is a claim that a document
 * exists, and a reader following it is the one who discovers it does not.
 */
describe('documentation links resolve', () => {
  const root = process.cwd();
  const SKIP = new Set(['node_modules', '.git', 'dist', 'coverage']);

  const markdownFiles = (from: string): string[] =>
    readdirSync(from).flatMap((entry) => {
      if (SKIP.has(entry)) return [];
      const full = join(from, entry);
      if (statSync(full).isDirectory()) return markdownFiles(full);
      return entry.endsWith('.md') ? [full] : [];
    });

  const documents = markdownFiles(root);

  // [text](target) — ignoring anchors, and anything absolute or external.
  const LINK = /\[[^\]]*\]\(([^)#\s]+)(?:#[^)\s]*)?\)/g;

  it('finds documents to check', () => {
    expect(documents.length).toBeGreaterThan(10);
  });

  it.each(documents.map((file) => [relative(root, file), file]))(
    '%s links only to files that exist',
    (_label, file) => {
      const text = readFileSync(file, 'utf8');

      const broken = Array.from(text.matchAll(LINK))
        .map((match) => match[1])
        .filter((target) => !/^(https?:|mailto:|\/)/.test(target))
        .filter((target) => {
          const resolved = normalize(resolve(dirname(file), target));
          // A link that climbs out of the repository is broken even if
          // something happens to sit there on this machine.
          if (!resolved.startsWith(root)) return true;
          return !existsSync(resolved);
        });

      expect(broken).toEqual([]);
    }
  );
});
