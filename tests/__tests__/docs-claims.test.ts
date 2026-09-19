import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';

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
    // Fenced blocks are stripped first. The index contains an "Add a New
    // Package" example naming @omega-v/my-package, which is a template for
    // the reader rather than a claim that the package exists. Prose and
    // tables make claims; code samples demonstrate. Checking the samples
    // would fail on a placeholder that is doing its job.
    const claims = index.replace(/```[\s\S]*?```/g, '');
    const named = Array.from(claims.matchAll(/@omega-v\/([a-z-]+)/g)).map((match) => match[1]);
    const real = new Set(packages);

    expect(named.length).toBeGreaterThan(0);
    expect(named.filter((name) => !real.has(name))).toEqual([]);
  });
});

/**
 * Apps document themselves, and no directory keeps a second copy of the
 * API surface.
 *
 * apps/README.md listed 17 endpoints while the server registered 29, and
 * described the CLI as "future" after it had shipped. Both are the same
 * defect: a duplicated description drifts from the thing it describes, and
 * the copy is always the one that rots.
 *
 * The endpoint list now lives in exactly one place, guarded by
 * documentation.test.ts. This asserts nobody reintroduces a second.
 */
describe('apps document themselves', () => {
  const appsDir = join(process.cwd(), 'apps');

  const apps = readdirSync(appsDir).filter((entry) => statSync(join(appsDir, entry)).isDirectory());

  const index = readFileSync(join(appsDir, 'README.md'), 'utf8');

  it('finds the apps it is meant to check', () => {
    expect(apps.length).toBeGreaterThanOrEqual(2);
  });

  it.each(apps)('apps/%s has a README', (name) => {
    expect(existsSync(join(appsDir, name, 'README.md'))).toBe(true);
  });

  it.each(apps)('apps/README.md names %s', (name) => {
    expect(index).toContain(name);
  });

  it('keeps no second copy of the endpoint list', () => {
    // A handful of route mentions in prose is fine; a list is not. The
    // canonical description is apps/api/README.md, which a test already
    // holds to the routes the server registers.
    const routeLines = index
      .split('\n')
      .filter((line) => /^\s*[-*]\s+`?(GET|POST)\s+\//.test(line));

    expect(routeLines).toEqual([]);
  });

  it('does not describe a shipped surface as future', () => {
    // packages/cli and packages/sdk both exist. Calling them future was
    // true once and quietly stopped being true.
    for (const shipped of ['CLI', 'SDK']) {
      expect(index).not.toMatch(new RegExp(`${shipped}\\s*\\(future\\)`));
    }
  });
});

/**
 * No document may describe cryptography the system does not implement, or
 * print anything shaped like a signing key.
 *
 * docs/VERIFICATION_LOOP.md claimed `signingAlgorithm: 'ECDSA-SHA256'`,
 * which has never existed here — the system supports HMAC-SHA256 and
 * Ed25519. It also printed `key-2026-08-production-v2` twice, the same
 * key-shaped literal removed from the API README once already, and showed
 * envelope fields (`attestedByKeyVersion`, `verifyingPublicKey`) that the
 * real attestation does not have.
 *
 * Those are not omissions. A reader implementing from that document would
 * have built the wrong verifier, which is worse than having no document.
 */
describe('documents describe the cryptography that exists', () => {
  const root = process.cwd();

  const markdown = (from: string): string[] =>
    readdirSync(from).flatMap((entry) => {
      if (['node_modules', '.git', 'dist', 'coverage'].includes(entry)) return [];
      const full = join(from, entry);
      if (statSync(full).isDirectory()) return markdown(full);
      return entry.endsWith('.md') ? [full] : [];
    });

  const documents = markdown(root);

  it('finds documents to check', () => {
    expect(documents.length).toBeGreaterThan(10);
  });

  it.each(documents.map((file) => [relative(root, file), file]))(
    '%s names no algorithm the system cannot perform',
    (_label, file) => {
      const text = readFileSync(file, 'utf8');
      // Only these two are implemented. RSA/ECDSA/DSA in a signingAlgorithm
      // position would send an implementer down a path that does not exist.
      const claimed = Array.from(
        text.matchAll(/signingAlgorithm['":\s]+['"]?([A-Za-z0-9-]+)/g)
      ).map((match) => match[1]);

      expect(claimed.filter((name) => !['Ed25519', 'HMAC-SHA256'].includes(name))).toEqual([]);
    }
  );

  it.each(documents.map((file) => [relative(root, file), file]))(
    '%s prints no key-shaped literal',
    (_label, file) => {
      const text = readFileSync(file, 'utf8');

      // A signingKey value must be a fingerprint or an env reference, never
      // something that reads like a usable secret.
      // Only quoted literals. `signingKey: privateKey` in an example is a
      // variable reference, not a secret, and flagging it would push
      // authors toward vaguer examples rather than safer ones.
      const values = Array.from(text.matchAll(/signingKey['"]?\s*[:=]\s*['"]([^'"]+)['"]/g)).map(
        (match) => match[1]
      );

      const suspicious = values.filter(
        (value) => !value.startsWith('sha256:') && !value.startsWith('OMEGA_')
      );

      expect(suspicious).toEqual([]);
    }
  );
});

/**
 * Every command a document tells you to run must name a script that exists.
 *
 * docs/DEVELOPMENT.md had a "Database Setup" section instructing the reader
 * to start Postgres in Docker, then run `npm run db:migrate` and
 * `npm run db:seed`, and stated that "SQLite is the default for development.
 * No additional setup needed!". There is no database. There is no SQLite,
 * no driver, no migration, no seed, and neither script exists. The same
 * document told the reader to `cp .env.example .env.local` from a file that
 * is not in the repository, and listed DATABASE_URL, API_LOG_LEVEL, WEB_PORT
 * and WEB_API_URL as configuration, of which the code reads exactly none.
 *
 * A newcomer following that guide provisions a database, runs two commands
 * that do not exist, and concludes the repository is broken. That is worse
 * than an undocumented step: an absent instruction costs a question, but a
 * false one costs an afternoon and some trust.
 *
 * This checks the mechanical half of that failure — a named script either
 * exists or it does not. It cannot check that prose is true, so it does not
 * pretend to: the SQLite sentence above would have passed this test. What it
 * guarantees is that the commands are runnable, which is the part a reader
 * acts on first.
 */
describe('documented commands name scripts that exist', () => {
  const root = process.cwd();

  const markdown = (from: string): string[] =>
    readdirSync(from).flatMap((entry) => {
      if (['node_modules', '.git', 'dist', 'coverage'].includes(entry)) return [];
      const full = join(from, entry);
      if (statSync(full).isDirectory()) return markdown(full);
      return entry.endsWith('.md') ? [full] : [];
    });

  const scriptsIn = (manifest: string): string[] =>
    Object.keys(JSON.parse(readFileSync(manifest, 'utf8')).scripts ?? {});

  const workspaceManifests = ['apps', 'packages'].flatMap((dir) =>
    readdirSync(join(root, dir))
      .map((entry) => join(root, dir, entry, 'package.json'))
      .filter((manifest) => existsSync(manifest))
  );

  const known = new Set([
    ...scriptsIn(join(root, 'package.json')),
    ...workspaceManifests.flatMap(scriptsIn),
  ]);

  // Subcommands of the package manager itself. `pnpm install` is not a
  // missing script, and neither is `npm audit`.
  const BUILTIN = new Set([
    'install',
    'i',
    'add',
    'remove',
    'update',
    'ci',
    'exec',
    'dlx',
    'why',
    'audit',
    'fund',
    'init',
    'link',
    'list',
    'ls',
    'outdated',
    'pack',
    'prune',
    'publish',
    'rebuild',
    'store',
    'config',
    'version',
    'view',
    'create',
    'run',
  ]);

  // Flags that consume the next token, so `--filter @omega-v/web dev`
  // resolves to `dev` rather than to the package name.
  const TAKES_VALUE = new Set(['--filter', '-F', '--workspace', '-w', '--dir', '-C']);

  /** The script a shell line invokes, or null if it invokes none. */
  const invokedScript = (line: string): string | null => {
    const tokens = line.trim().split(/\s+/);
    // Leading environment assignments: `API_PORT=3001 pnpm dev`.
    while (tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[0])) tokens.shift();
    if (!['pnpm', 'npm'].includes(tokens[0])) return null;

    let index = 1;
    while (index < tokens.length && tokens[index].startsWith('-')) {
      index += TAKES_VALUE.has(tokens[index]) ? 2 : 1;
    }
    if (tokens[index] === 'run') index += 1;

    const name = tokens[index];
    if (!name || name.startsWith('-') || BUILTIN.has(name)) return null;
    // A placeholder such as <package-name> is a template, not a claim.
    if (!/^[a-z][a-z0-9:_-]*$/.test(name)) return null;
    return name;
  };

  /**
   * Commands inside fenced blocks. Prose like "npm ERR!" is not a command.
   *
   * Fence state is tracked line by line rather than paired with a regex. A
   * regex over the whole document mispairs: a closing ``` also matches an
   * opening fence, so from the first block onward the "contents" are the
   * gaps between blocks. That version of this test passed against the very
   * file that provoked it, which is the only kind of test worth deleting.
   */
  const commandsIn = (text: string): string[] => {
    const invoked: string[] = [];
    let insideFence = false;

    for (const line of text.split('\n')) {
      if (line.startsWith('```')) {
        insideFence = !insideFence;
        continue;
      }
      if (!insideFence) continue;

      const name = invokedScript(line);
      if (name !== null) invoked.push(name);
    }

    return invoked;
  };

  const documents = markdown(root).map((file) => [relative(root, file), file] as const);

  it('finds the scripts it checks against', () => {
    expect(known.size).toBeGreaterThan(20);
    expect(known.has('verify')).toBe(true);
  });

  it('finds commands to check', () => {
    // Guards against a parser that silently matches nothing and passes.
    const total = documents.reduce(
      (count, [, file]) => count + commandsIn(readFileSync(file, 'utf8')).length,
      0
    );
    expect(total).toBeGreaterThan(30);
  });

  it.each(documents)('%s runs no script that does not exist', (_label, file) => {
    const invoked = commandsIn(readFileSync(file, 'utf8'));

    expect(invoked.filter((name) => !known.has(name))).toEqual([]);
  });
});
