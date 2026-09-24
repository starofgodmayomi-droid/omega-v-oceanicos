import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const specification = readFileSync(new URL('../../docs/spec/OCEANICOS-OPERATIONAL-PROTOCOL.md', import.meta.url), 'utf8');

const requiredSections = [
  '## 3. The Drop contract',
  '## 4. Lifecycle protocol',
  '## 5. Evidence protocol',
  '## 6. Authority, consent, and stop conditions',
  '## 7. Conflict and dissent protocol',
  '## 8. Failure and recovery rules',
  '## 9. Runtime mapping',
  '## 11. Conformance checklist',
] as const;

test('Operational Protocol Specification preserves its required modules', () => {
  for (const section of requiredSections) assert.ok(specification.includes(section), `missing specification section: ${section}`);
});

test('Operational Protocol Specification maps to executable evidence boundaries', () => {
  for (const contract of [
    'POST /v1/omega/commands/:id/observe',
    'GET /v1/omega/events',
    'POST /v1/omega/coordination/evidence',
    'coordination.evidence-recorded',
    '`VERIFIED`',
    '`DIVERGENT`',
    '`UNKNOWN`',
    '`NOT_EXECUTED`',
  ]) assert.ok(specification.includes(contract), `missing executable contract marker: ${contract}`);
});

test('Operational Protocol Specification keeps capability separate from authority', () => {
  assert.match(specification, /capability.*authority|authority.*capability/i);
  assert.match(specification, /does not claim omniscience|does not grant software agency/i);
  assert.match(specification, /evidence.*does not prove|what its evidence does not prove/i);
});
