#!/usr/bin/env node
/**
 * Validate the ΩVØØS swarm contract: the protocol, the entry points that must
 * send a node to it, and the append-only ledger receipts.
 *
 * This is a source check. It does not prove another agent ran anything.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');

const STATUSES = ['VERIFIED', 'DIVERGENT', 'UNKNOWN', 'NOT_EXECUTED'];
const RECEIPT_KEYS = [
  'agent_id',
  'branch',
  'status',
  'files_touched',
  'tests_passed',
  'evidence_hash',
  'next_delta',
];
const AGENT_BRANCH = /^agent\/[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9._-]*$/;

const protocol = read('SWARM_PROTOCOL.md');
for (const token of [
  'Ω∞v := VERIFY(ΔREALITY)',
  "ATTEST, DON'T ASSERT",
  '30013030',
  'kai_ledger.json',
]) {
  if (!protocol.includes(token)) {
    throw new Error(`SWARM_PROTOCOL.md: missing contract token ${token}`);
  }
}

for (const entry of ['AGENTS.md', '.cursorrules', 'CLAUDE.md']) {
  if (!read(entry).includes('SWARM_PROTOCOL.md')) {
    throw new Error(`${entry}: must reference SWARM_PROTOCOL.md`);
  }
}

const ledger = JSON.parse(read('kai_ledger.json'));
if (ledger.protocol !== 'ΩVØØS-SWARM/1') {
  throw new Error('kai_ledger.json: protocol must be ΩVØØS-SWARM/1');
}
if (ledger.checksum !== '30013030') {
  throw new Error('kai_ledger.json: checksum must be 30013030');
}
if (ledger.append_only !== true) {
  throw new Error('kai_ledger.json: append_only must be true');
}
if (!Array.isArray(ledger.entries) || ledger.entries.length === 0) {
  throw new Error('kai_ledger.json: entries must be a non-empty array');
}

const expectedKeys = [...RECEIPT_KEYS, 'timestamp'].sort().join(', ');
let previousTimestamp = -Infinity;

ledger.entries.forEach((entry, index) => {
  const where = `kai_ledger.json entry ${index}`;
  if (Object.keys(entry).sort().join(', ') !== expectedKeys) {
    throw new Error(`${where}: keys must be exactly ${expectedKeys}`);
  }
  if (typeof entry.agent_id !== 'string' || !entry.agent_id.trim()) {
    throw new Error(`${where}: agent_id must be a non-empty string`);
  }
  if (typeof entry.branch !== 'string' || !entry.branch.trim()) {
    throw new Error(`${where}: branch must be a non-empty string`);
  }
  if (entry.branch === 'main') {
    throw new Error(`${where}: the swarm never records a direct main commit`);
  }
  // Entry 0 is the genesis receipt for the protocol itself.
  if (index > 0 && !AGENT_BRANCH.test(entry.branch)) {
    throw new Error(`${where}: branch must be agent/<platform>/<task>`);
  }
  if (!STATUSES.includes(entry.status)) {
    throw new Error(`${where}: status must be one of ${STATUSES.join('/')}`);
  }
  if (
    !Array.isArray(entry.files_touched) ||
    entry.files_touched.length === 0 ||
    entry.files_touched.some((file) => typeof file !== 'string' || !file.trim())
  ) {
    throw new Error(`${where}: files_touched must be a non-empty array of paths`);
  }
  if (![true, false, null].includes(entry.tests_passed)) {
    throw new Error(`${where}: tests_passed must be true, false, or null`);
  }
  if (entry.evidence_hash !== null && !/^[0-9a-f]{64}$/.test(entry.evidence_hash)) {
    throw new Error(`${where}: evidence_hash must be null or a 64-hex sha256`);
  }
  const timestamp = Date.parse(entry.timestamp);
  if (Number.isNaN(timestamp)) {
    throw new Error(`${where}: timestamp must be ISO-8601`);
  }
  if (timestamp < previousTimestamp) {
    throw new Error(`${where}: entries must stay ordered by timestamp (append only)`);
  }
  previousTimestamp = timestamp;
  if (entry.status === 'VERIFIED' && (entry.tests_passed !== true || !entry.evidence_hash)) {
    throw new Error(`${where}: VERIFIED requires tests_passed true and a 64-hex evidence_hash`);
  }
});

console.log(
  `validated ${ledger.entries.length} swarm ledger receipt(s) and the ΩVØØS protocol contract`
);
