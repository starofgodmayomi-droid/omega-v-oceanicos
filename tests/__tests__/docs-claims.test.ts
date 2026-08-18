import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';

/**
 * Directory READMEs must not describe siblings that do not exist.
 *
 * infra/README.md documented docker/, kubernetes/, scripts/, terraform/,
 * docker-compose.yml, Dockerfile.api, Dockerfile.web and a deploy.sh, in a
 * directory containing nothing but that README. tests/README.md documented
 * integration/, e2e/ and fixtures/, in a directory containing nothing but
 * that README. Both read as deployment guides. Both were fiction.
 *
 * The project's first operating rule is not to pretend anything exists until
 * it has been inspected or built. This applies that rule to the documents
 * themselves. It is deliberately narrow: it checks the two directory
 * READMEs whose whole purpose is to describe their own contents, rather
 * than every backtick in the repository.
 */
describe('directory READMEs describe real contents', () => {
  const root = process.cwd();

  const targets = ['infra/README.md', 'tests/README.md'];

  // Backticked tokens that name a sibling file or directory, as opposed to
  // a command, a variable, or a path already written relative to the repo.
  const SIBLING = /`(?!\.)([A-Za-z0-9_-]+(?:\.[A-Za-z0-9]+)?\/?)`/g;
  const LOOKS_LIKE_PATH = /(\/$)|\.(yml|yaml|json|sh|ts|tsx|js|md|tf)$|^Dockerfile/;

  it.each(targets)('%s exists', (target) => {
    expect(existsSync(join(root, target))).toBe(true);
  });

  it.each(targets)('%s claims nothing that is missing', (target) => {
    const readme = readFileSync(join(root, target), 'utf8');
    const base = join(root, dirname(target));

    const claimed = Array.from(readme.matchAll(SIBLING))
      .map((match) => match[1])
      .filter((token) => LOOKS_LIKE_PATH.test(token));

    const missing = claimed.filter((token) => !existsSync(join(base, token.replace(/\/$/, ''))));

    expect(missing).toEqual([]);
  });
});

/**
 * Every package documents itself, and the index knows every package.
 *
 * packages/dissensus shipped with no README while all nine siblings had
 * one, and packages/README.md listed only attestation under earned
 * expansions while sdk, cli and dissensus all existed. Nothing caught
 * either: the guard above checks two directory READMEs, and this gap sat
 * one level below it.
 *
 * A package with no README is not a documentation preference. It is a unit
 * of the system that cannot explain what it is for, which is the same
 * failure as an endpoint missing from the startup banner.
 */
describe('packages document themselves', () => {
  const packagesDir = join(process.cwd(), 'packages');

  const packages = readdirSync(packagesDir).filter((entry) =>
    statSync(join(packagesDir, entry)).isDirectory()
  );

  const index = readFileSync(join(packagesDir, 'README.md'), 'utf8');

  it('finds the packages it is meant to check', () => {
    expect(packages.length).toBeGreaterThanOrEqual(8);
  });

  it.each(packages)('packages/%s has a README', (name) => {
    expect(existsSync(join(packagesDir, name, 'README.md'))).toBe(true);
  });

  it.each(packages)('packages/README.md names %s', (name) => {
    expect(index.includes(`${name}/`) || index.includes(`@omega-v/${name}`)).toBe(true);
  });

  it('names no package that does not exist', () => {
    const named = Array.from(index.matchAll(/@omega-v\/([a-z-]+)/g)).map((match) => match[1]);
    const real = new Set(packages);

    expect(named.filter((name) => !real.has(name))).toEqual([]);
  });
});
