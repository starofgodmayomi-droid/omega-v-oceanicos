import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { KAI_SYSTEM_PROMPT } from '../../apps/api/src/invisible-computer.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const body = () => readFileSync(join(root, 'ECOSYSTEM_BODY.md'), 'utf8');

const ORGANS = [
  'apps/api/src/invisible-computer.ts',
  'apps/api/src/kai-memory.ts',
  'apps/api/src/execute-route.ts',
  'packages/mini/src/index.ts',
  'packages/remember/src/index.ts',
  'apps/web/src/InvisibleComputer.tsx',
  'CHARTER.md',
];

const LAWS = [
  "ATTEST, DON'T ASSERT",
  'UNKNOWN PRESERVED',
  'NO FABRICATED COMPLETION',
  'MEMORY != PROOF',
  'CAPABILITY != AUTHORITY',
  'PLAN != EXECUTION',
];

test('every organ the body names exists on disk and is mapped in the body', () => {
  const text = body();
  for (const organ of ORGANS) {
    assert.ok(existsSync(join(root, organ)), `${organ} is mapped in the body but missing on disk`);
    assert.ok(text.includes(organ), `ECOSYSTEM_BODY.md must map ${organ}`);
  }
});

test('the body states the laws the runtime prompt enforces', () => {
  const text = body();
  for (const law of LAWS) {
    assert.ok(text.includes(law), `ECOSYSTEM_BODY.md must carry: ${law}`);
    assert.ok(KAI_SYSTEM_PROMPT.includes(law), `KAI_SYSTEM_PROMPT must carry: ${law}`);
  }
});
