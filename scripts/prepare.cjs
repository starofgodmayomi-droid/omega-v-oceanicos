const { execFileSync } = require('node:child_process');

try {
  execFileSync('pnpm', ['exec', 'husky', 'install'], { stdio: 'ignore' });
} catch {
  // Husky is developer tooling; installation must not block a fresh clone.
}
