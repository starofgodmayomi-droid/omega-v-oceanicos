const { readdirSync, rmSync } = require('node:fs');
const { join } = require('node:path');

/**
 * Portable removal for package clean scripts.
 *
 * `rm -rf` is not available on Windows shells. scripts/clean.cjs replaced
 * the root script but delegates to each package's own `clean`, and those
 * were still `rm -rf` — so the portable wrapper was spawning ten
 * non-portable commands. CI did not catch it because the Windows job never
 * invokes clean.
 *
 * Usage: node ../../scripts/rimraf.cjs dist "*.tsbuildinfo"
 * A leading `*.` argument removes every entry in the working directory with
 * that extension. Everything else is treated as a literal path.
 */
const targets = process.argv.slice(2);

if (targets.length === 0) {
  console.error('rimraf.cjs: expected at least one path or *.ext pattern');
  process.exit(1);
}

for (const target of targets) {
  if (target.startsWith('*.')) {
    const suffix = target.slice(1);
    for (const entry of readdirSync(process.cwd())) {
      if (entry.endsWith(suffix)) {
        rmSync(join(process.cwd(), entry), { recursive: true, force: true });
      }
    }
    continue;
  }

  rmSync(target, { recursive: true, force: true });
}
