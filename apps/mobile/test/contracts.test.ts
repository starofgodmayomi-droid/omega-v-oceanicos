import test from 'node:test';
import assert from 'node:assert/strict';
import { getHealth, getCommands, normalizeApiBaseUrl, submitDrop } from '../src/api.ts';
import { createSubmissionLedger, prepareSubmission } from '../src/submission.ts';
import {
  buildKaiReflectionCard,
  EMPTY_KAI_REFLECTION_DRAFT,
  KAI_REFLECTION_LIMITS,
} from '../src/reflection.ts';
import {
  buildEchoVoiceNoteCard,
  ECHO_SOURCE_KINDS,
  EMPTY_ECHO_VOICE_NOTE_DRAFT,
  ECHO_VOICE_NOTE_LIMITS,
} from '../src/echo.ts';

const request = {
  symbolicIntent: 'Inspect one bounded local state',
  requestedBy: 'test-user',
  targetScope: ['local:health'],
  stopCondition: 'stop after one response',
  expectedObservation: 'a status field is returned',
  mode: 'BUILD' as const,
};

const originalFetch = globalThis.fetch;

test('normalizes an API origin and strips a trailing slash', () => {
  assert.equal(normalizeApiBaseUrl(' https://api.example.test/ '), 'https://api.example.test');
  assert.equal(normalizeApiBaseUrl('http://127.0.0.1:5000'), 'http://127.0.0.1:5000');
});

test('rejects URL credentials and non-origin paths', () => {
  assert.throws(() => normalizeApiBaseUrl('https://user:secret@example.test'), /credentials/);
  assert.throws(() => normalizeApiBaseUrl('https://example.test/api'), /origin only/);
  assert.throws(() => normalizeApiBaseUrl('file:///tmp/api'), /HTTP or HTTPS/);
});

test('reuses the idempotency key for an equivalent immediate retry', () => {
  const ledger = createSubmissionLedger();
  const first = prepareSubmission(request, ledger, 1234);
  const retry = prepareSubmission(request, ledger, 5678);
  assert.equal(first.payload.idempotencyKey, retry.payload.idempotencyKey);
  assert.equal(first.payload.idempotencyKey, 'mobile-oreade-1234-1');
});

test('reuses a prior idempotency key when the draft changes and then returns to the same request', () => {
  const ledger = createSubmissionLedger();
  const first = prepareSubmission(request, ledger, 1234);
  const changed = prepareSubmission({ ...request, stopCondition: 'stop after two responses' }, ledger, 5678);
  const returned = prepareSubmission(request, ledger, 9999);
  assert.notEqual(first.payload.idempotencyKey, changed.payload.idempotencyKey);
  assert.equal(changed.identity.sequence, 2);
  assert.equal(returned.payload.idempotencyKey, first.payload.idempotencyKey);
  assert.equal(ledger.sequence, 2);
});

test('reads health and redacted commands from the configured API origin', async () => {
  const requests: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    requests.push(url);
    const payload = url.endsWith('/health')
      ? { status: 'ok', ready: true }
      : { success: true, commands: [], redacted: true };
    return new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
  try {
    assert.deepEqual(await getHealth('https://api.example.test'), { status: 'ok', ready: true });
    assert.deepEqual(await getCommands('https://api.example.test'), { success: true, commands: [], redacted: true });
    assert.deepEqual(requests, ['https://api.example.test/health', 'https://api.example.test/v1/omega/commands']);
  } finally { globalThis.fetch = originalFetch; }
});

test('creates only a proposal and sends no admission or execution fields', async () => {
  let capturedUrl = '';
  let capturedMethod = '';
  let capturedBody: Record<string, unknown> = {};
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    capturedUrl = String(input);
    capturedMethod = init?.method ?? 'GET';
    capturedBody = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ success: true, drop: { dropId: 'drop-test', kind: 'BUILD', intent: request.symbolicIntent, targetScope: request.targetScope, evidenceBoundary: 'proposal only' }, command: { commandId: 'cmd-test', status: 'PROPOSED', dryRun: true, workers: ['planner'] }, nextAction: 'review', executed: false }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
  try {
    const prepared = prepareSubmission(request, createSubmissionLedger(), 1234);
    const result = await submitDrop('https://api.example.test', prepared.payload);
    assert.equal(capturedUrl, 'https://api.example.test/v1/omega/oreade/proposal');
    assert.equal(capturedMethod, 'POST');
    assert.equal(capturedBody.idempotencyKey, 'mobile-oreade-1234-1');
    assert.equal('authority' in capturedBody, false);
    assert.equal('execute' in capturedBody, false);
    assert.equal(result.command?.status, 'PROPOSED');
    assert.equal(result.executed, false);
  } finally { globalThis.fetch = originalFetch; }
});

test('preserves the server authentication boundary in the API error message', async () => {
  globalThis.fetch = (async () => new Response(JSON.stringify({ error: 'AUTH_REQUIRED' }), { status: 401, headers: { 'Content-Type': 'application/json' } })) as typeof fetch;
  try {
    await assert.rejects(getCommands('https://api.example.test'), /authentication or authorization policy still applies/);
  } finally { globalThis.fetch = originalFetch; }
});

test('builds a user-labelled reflection card while preserving UNKNOWN and non-persistence', () => {
  const original = { ...EMPTY_KAI_REFLECTION_DRAFT, entryKind: 'INTERPRETATION' as const, entry: '  A vivid dream  ', interpretation: '  It may symbolize change.  ', whatIKnow: 'I remember the dream after waking.', nextAction: '' };
  const card = buildKaiReflectionCard(original);
  assert.equal(card.entryKind, 'INTERPRETATION');
  assert.equal(card.entry, 'A vivid dream');
  assert.equal(card.interpretation, 'It may symbolize change.');
  assert.equal(card.status, 'UNKNOWN');
  assert.equal(card.sourceKind, 'USER_ENTERED');
  assert.equal(card.persisted, false);
  assert.equal(card.memoryIsProof, false);
  assert.equal(card.nextAction, '');
  assert.equal(original.entry, '  A vivid dream  ', 'building a card must not mutate the source draft');
});

test('allows one finite entry with no selected action', () => {
  const card = buildKaiReflectionCard({ ...EMPTY_KAI_REFLECTION_DRAFT, entry: 'I noticed the garden needs water.' });
  assert.equal(card.nextAction, '');
  assert.equal(card.expectedObservation, '');
  assert.equal(card.status, 'UNKNOWN');
});

test('requires an expected observation and stop condition for a selected action', () => {
  const draft = { ...EMPTY_KAI_REFLECTION_DRAFT, entry: 'A task is unfinished.', nextAction: 'Complete one task.' };
  assert.throws(() => buildKaiReflectionCard(draft), /expected observation/);
  assert.throws(() => buildKaiReflectionCard({ ...draft, expectedObservation: 'The task is completed.' }), /stop condition/);
  const card = buildKaiReflectionCard({ ...draft, expectedObservation: 'The task is completed.', stopCondition: 'Stop after this one task.' });
  assert.equal(card.status, 'UNKNOWN');
  assert.equal(card.nextAction, 'Complete one task.');
});

test('builds an ephemeral ECHOFRAME voice-note draft without upgrading its status', () => {
  const source = {
    ...EMPTY_ECHO_VOICE_NOTE_DRAFT,
    title: '  A note to carry  ',
    audience: '  A friend  ',
    opening: '  One opening line.  ',
    mainMessage: '  Meaning matters; proof still needs evidence.  ',
    closing: '  Keep the next step small.  ',
    sourceKind: 'SYMBOLIC_CREATION' as const,
  };
  const card = buildEchoVoiceNoteCard(source);
  assert.equal(card.title, 'A note to carry');
  assert.equal(card.audience, 'A friend');
  assert.equal(card.mainMessage, 'Meaning matters; proof still needs evidence.');
  assert.equal(card.format, 'VOICE_NOTE');
  assert.equal(card.status, 'DRAFT');
  assert.equal(card.origin, 'USER_ENTERED');
  assert.equal(card.persisted, false);
  assert.equal(card.published, false);
  assert.equal(card.verified, false);
  assert.equal(source.mainMessage, '  Meaning matters; proof still needs evidence.  ', "building a card must not mutate the user's draft");
});

test('requires a supplied source reference without treating it as checked evidence', () => {
  const draft = { ...EMPTY_ECHO_VOICE_NOTE_DRAFT, mainMessage: 'A source-backed draft.', sourceKind: 'SOURCE_REFERENCED' as const };
  assert.throws(() => buildEchoVoiceNoteCard(draft), /reference/);
  const card = buildEchoVoiceNoteCard({ ...draft, sourceReference: 'https://example.test/source' });
  assert.equal(card.sourceReference, 'https://example.test/source');
  assert.equal(card.verified, false);
  assert.equal(card.published, false);
});

test('rejects blank voice-note messages, invalid source labels, and oversized fields', () => {
  assert.throws(() => buildEchoVoiceNoteCard(EMPTY_ECHO_VOICE_NOTE_DRAFT), /main message/);
  assert.throws(() => buildEchoVoiceNoteCard({ ...EMPTY_ECHO_VOICE_NOTE_DRAFT, mainMessage: 'A note', title: 'x'.repeat(ECHO_VOICE_NOTE_LIMITS.title + 1) }), /title must be/);
  assert.throws(() => buildEchoVoiceNoteCard({ ...EMPTY_ECHO_VOICE_NOTE_DRAFT, mainMessage: 'A note', sourceKind: 'UNKNOWN' as never }), /source labels/);
  assert.equal(ECHO_SOURCE_KINDS.length, 4);
});

test('rejects a blank entry and oversized reflection fields', () => {
  assert.throws(() => buildKaiReflectionCard(EMPTY_KAI_REFLECTION_DRAFT), /Add one experience/);
  assert.throws(() => buildKaiReflectionCard({ ...EMPTY_KAI_REFLECTION_DRAFT, entry: 'x'.repeat(KAI_REFLECTION_LIMITS.entry + 1) }), /characters or fewer/);
  assert.throws(() => buildKaiReflectionCard({ ...EMPTY_KAI_REFLECTION_DRAFT, entry: 'A note', interpretation: 'x'.repeat(KAI_REFLECTION_LIMITS.field + 1) }), /interpretation must be/);
});
