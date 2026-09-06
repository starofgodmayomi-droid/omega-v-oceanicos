const { execFileSync } = require('node:child_process');
const { rmSync } = require('node:fs');

execFileSync(
  'pnpm',
  [
    '--parallel',
    '--filter',
    '@omega-v/api',
    '--filter',
    '@omega-v/web',
    '--filter',
    '@omega-v/cli',
    '--filter',
    '@omega-v/sdk',
    '--filter',
    '@omega-v/attestation',
    '--filter',
    '@omega-v/mini',
    '--filter',
    '@omega-v/remember',
    '--filter',
    '@omega-v/observer',
    '--filter',
    '@omega-v/verification',
    '--filter',
    '@omega-v/types',
    'clean',
  ],
  { stdio: 'inherit' }
);

rmSync('coverage', { recursive: true, force: true });
