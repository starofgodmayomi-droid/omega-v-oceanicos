import { mkdtempSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  appendEvent,
  emptySnapshot,
  reencryptPersistence,
  loadSnapshot,
  readEventLog,
  reencryptionJournalPath,
  reconcileReencryptionJournal,
  saveSnapshot,
  persistenceReady,
  eventLogReady,
  persistenceRotationPending,
  persistenceOperatorAction,
  persistenceKeyFingerprint,
  parsePersistenceRecoveryPolicy,
  parsePersistenceDeletionPolicy,
  parsePersistenceCustodyPolicy,
  parsePersistenceCoordinationPolicy,
  persistenceCoverage,
  SNAPSHOT_KEYS,
  encryptionEnabled,
} from '../persistence';

type Snap = Record<(typeof SNAPSHOT_KEYS)[number], unknown[]>;

const fixture = (): Snap => ({
  events: [{ id: 'evt-1' }],
  runs: [{ correlationId: 'run-1' }],
  actions: [{ id: 'act-1' }],
  learnings: [{ id: 'learn-1' }],
  recompilations: [{ id: 'recompile-1' }],
});

describe('runtime persistence', () => {
  it('fails readiness closed for corrupt enabled snapshots but permits a missing cold start', () => {
    expect(persistenceReady(false, 'corrupt')).toBe(true);
    expect(persistenceReady(true, 'missing')).toBe(true);
    expect(persistenceReady(true, 'restored')).toBe(true);
    expect(persistenceReady(true, 'corrupt')).toBe(false);
  });

  it('answers for every declared snapshot source, not just the one it rejects', () => {
    // The predicate was `!enabled || source !== 'corrupt'`. Every current
    // member gets the same answer from the exhaustive form, which is the
    // point: this pins that the rewrite changed nothing today.
    expect(persistenceReady(true, 'disabled')).toBe(true);
    expect(persistenceReady(true, 'missing')).toBe(true);
    expect(persistenceReady(true, 'restored')).toBe(true);
    expect(persistenceReady(true, 'corrupt')).toBe(false);
    expect(persistenceReady(false, 'corrupt')).toBe(true);
  });

  it('answers for every declared event log source', () => {
    expect(eventLogReady(true, 'disabled')).toBe(true);
    expect(eventLogReady(true, 'missing')).toBe(true);
    expect(eventLogReady(true, 'restored')).toBe(true);
    expect(eventLogReady(true, 'partial')).toBe(false);
    expect(eventLogReady(false, 'partial')).toBe(true);
  });

  it('refuses readiness for a source the type system did not vouch for', () => {
    // A value that reached here past the compiler — from JSON, a cast, or a
    // future member someone forced through. The negative test these replaced
    // would have called it ready, because it was not the one rejected name.
    //
    // The compile-time half of this is the `never` assignment in the default
    // branch: adding a member to either union fails type-check until someone
    // says whether it counts as ready. That cannot be asserted from a test,
    // so it is stated here and demonstrated in the pull request.
    expect(persistenceReady(true, 'truncated' as never)).toBe(false);
    expect(eventLogReady(true, 'truncated' as never)).toBe(false);
  });

  it('exposes only a deterministic non-secret key fingerprint', () => {
    const fingerprint = persistenceKeyFingerprint('current-secret');
    expect(fingerprint).toHaveLength(16);
    expect(fingerprint).not.toContain('current-secret');
    expect(persistenceKeyFingerprint('current-secret')).toBe(fingerprint);
    expect(persistenceKeyFingerprint()).toBeNull();
  });

  it('parses bounded recovery policy declarations without claiming verification', () => {
    expect(parsePersistenceRecoveryPolicy()).toEqual({
      mode: 'unavailable',
      reference: null,
      reason: null,
    });
    expect(parsePersistenceRecoveryPolicy('operator-provided', 'operator-7')).toEqual({
      mode: 'operator-provided',
      reference: 'operator-7',
      reason: null,
    });
    expect(parsePersistenceRecoveryPolicy('external-reference', 'vault-record-7')).toEqual({
      mode: 'external-reference',
      reference: 'vault-record-7',
      reason: null,
    });
    expect(parsePersistenceRecoveryPolicy('unknown', 'record-7').mode).toBe('invalid');
    expect(parsePersistenceRecoveryPolicy('external-reference').mode).toBe('invalid');
  });

  it('parses custody policy declarations without claiming verified custody', () => {
    expect(parsePersistenceCustodyPolicy()).toEqual({
      mode: 'unverified-local',
      reference: null,
      reason: null,
      verified: false,
    });
    expect(parsePersistenceCustodyPolicy('operator-managed', 'operator-record-7')).toEqual({
      mode: 'operator-managed',
      reference: 'operator-record-7',
      reason: null,
      verified: false,
    });
    expect(parsePersistenceCustodyPolicy('hsm-kms', 'kms-key-7').verified).toBe(false);
    expect(parsePersistenceCustodyPolicy('external-reference', 'vault-record-7').reference).toBe(
      'vault-record-7'
    );
    expect(parsePersistenceCustodyPolicy('hsm-kms').mode).toBe('invalid');
    expect(parsePersistenceCustodyPolicy('hsm-kms', 'line\nbreak').mode).toBe('invalid');
    expect(parsePersistenceCustodyPolicy('unknown', 'record-7')).toEqual({
      mode: 'invalid',
      reference: null,
      reason: 'unsupported custody policy mode',
      verified: false,
    });
  });

  it('parses coordination declarations without claiming distributed consistency', () => {
    expect(parsePersistenceCoordinationPolicy()).toEqual({
      mode: 'local-single-process',
      reference: null,
      reason: null,
      evidence: 'runtime-observed',
      scope: 'single-process',
      limitations: [
        'does not prove distributed consistency',
        'does not prove leader election or replica agreement',
        'does not prove global ordering or external coordinator control',
      ],
      verified: false,
    });
    expect(parsePersistenceCoordinationPolicy('operator-coordinated', 'operator-record-8')).toEqual(
      {
        mode: 'operator-coordinated',
        reference: 'operator-record-8',
        reason: null,
        evidence: 'runtime-observed',
        scope: 'single-process',
        limitations: [
          'does not prove distributed consistency',
          'does not prove leader election or replica agreement',
          'does not prove global ordering or external coordinator control',
        ],
        verified: false,
      }
    );
    expect(
      parsePersistenceCoordinationPolicy('external-coordinator', 'coordinator-8').verified
    ).toBe(false);
    expect(parsePersistenceCoordinationPolicy('external-coordinator').mode).toBe('invalid');
    expect(parsePersistenceCoordinationPolicy('unknown', 'record-8')).toEqual({
      mode: 'invalid',
      reference: null,
      reason: 'unsupported coordination policy mode',
      evidence: 'runtime-observed',
      scope: 'single-process',
      limitations: [
        'does not prove distributed consistency',
        'does not prove leader election or replica agreement',
        'does not prove global ordering or external coordinator control',
      ],
      verified: false,
    });
    expect(parsePersistenceCoordinationPolicy('external-coordinator', 'line\nbreak').mode).toBe(
      'invalid'
    );
  });

  it('parses secure-deletion capability declarations without claiming verified erasure', () => {
    expect(parsePersistenceDeletionPolicy()).toEqual({
      mode: 'unavailable',
      reason: null,
      verified: false,
    });
    expect(parsePersistenceDeletionPolicy('unlink-only')).toEqual({
      mode: 'unlink-only',
      reason: null,
      verified: false,
    });
    expect(parsePersistenceDeletionPolicy('overwrite-unlink')).toEqual({
      mode: 'overwrite-unlink',
      reason: null,
      verified: false,
    });
    expect(parsePersistenceDeletionPolicy('secure-wipe')).toEqual({
      mode: 'invalid',
      reason: 'unsupported deletion policy mode',
      verified: false,
    });
  });

  it('reports bounded local data-at-rest coverage without claiming completeness', () => {
    const coverage = persistenceCoverage({
      enabled: true,
      snapshotEncrypted: true,
      snapshotKeySource: 'current',
      eventLogEncrypted: true,
      eventLogKeySource: 'mixed',
      memoryEncrypted: false,
      memoryKeySource: 'none',
      jobLedgerEncrypted: false,
      jobLedgerKeySource: 'none',
    });
    expect(coverage.complete).toBe(false);
    expect(coverage.surfaces).toEqual([
      expect.objectContaining({
        name: 'runtime-snapshot',
        encryption: 'aes-256-gcm',
        keySource: 'current',
      }),
      expect.objectContaining({ name: 'event-log', encryption: 'aes-256-gcm', keySource: 'mixed' }),
      expect.objectContaining({ name: 'kernel-memory', encryption: 'disabled', keySource: 'none' }),
      expect.objectContaining({
        name: 'local-job-ledger',
        encryption: 'disabled',
        keySource: 'none',
      }),
    ]);
    expect(coverage.unverifiedSurfaces).toEqual([
      'databases',
      'object storage',
      'backups',
      'external services',
    ]);
    expect(coverage.unverifiedReasons).toEqual([
      'no database persistence adapter is configured',
      'no object-storage persistence adapter is configured',
      'backup encryption and restore evidence are not connected to this runtime',
      'external-service persistence and key custody are outside this process boundary',
    ]);

    const encrypted = persistenceCoverage({
      enabled: true,
      snapshotEncrypted: false,
      snapshotKeySource: 'none',
      eventLogEncrypted: false,
      eventLogKeySource: 'none',
      memoryEncrypted: false,
      memoryKeySource: 'none',
      jobLedgerEncrypted: true,
      jobLedgerKeySource: 'current',
    });
    expect(encrypted.surfaces).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'local-job-ledger',
          encryption: 'aes-256-gcm',
          keySource: 'current',
        }),
      ])
    );
  });

  it('reports every surface as disabled and keyless when persistence itself is off', () => {
    // Every persistenceCoverage call above passes enabled: true, so the
    // disabled side of the snapshot, event-log, and kernel-memory encryption
    // and keySource ternaries had never actually run. The job ledger is
    // intentionally excluded from this "enabled" gate (its own field controls
    // it directly), so it is left encrypted here to isolate the other three.
    const coverage = persistenceCoverage({
      enabled: false,
      snapshotEncrypted: true,
      snapshotKeySource: 'current',
      eventLogEncrypted: true,
      eventLogKeySource: 'mixed',
      memoryEncrypted: true,
      memoryKeySource: 'current',
      jobLedgerEncrypted: true,
      jobLedgerKeySource: 'current',
    });
    expect(coverage.surfaces).toEqual([
      expect.objectContaining({
        name: 'runtime-snapshot',
        encryption: 'disabled',
        keySource: 'none',
      }),
      expect.objectContaining({ name: 'event-log', encryption: 'disabled', keySource: 'none' }),
      expect.objectContaining({ name: 'kernel-memory', encryption: 'disabled', keySource: 'none' }),
      expect.objectContaining({
        name: 'local-job-ledger',
        encryption: 'aes-256-gcm',
        keySource: 'current',
      }),
    ]);
  });

  it('reports kernel-memory as encrypted when it is the surface that is actually encrypted', () => {
    // Every persistenceCoverage call above leaves memoryEncrypted false, so
    // kernel-memory's own encrypted branch, distinct from the other
    // surfaces, had never run.
    const coverage = persistenceCoverage({
      enabled: true,
      snapshotEncrypted: false,
      snapshotKeySource: 'none',
      eventLogEncrypted: false,
      eventLogKeySource: 'none',
      memoryEncrypted: true,
      memoryKeySource: 'current',
      jobLedgerEncrypted: false,
      jobLedgerKeySource: 'none',
    });
    expect(coverage.surfaces).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'kernel-memory',
          encryption: 'aes-256-gcm',
          keySource: 'current',
        }),
      ])
    );
  });

  it('reports whether a configured secret actually turns encryption on', () => {
    expect(encryptionEnabled('a-real-secret')).toBe(true);
    expect(encryptionEnabled(undefined)).toBe(false);
    expect(encryptionEnabled('')).toBe(false);
  });

  it('reports rotation pending only when a configured previous key was used', () => {
    expect(persistenceRotationPending(false, 'previous')).toBe(false);
    expect(persistenceRotationPending(true, 'none', 'current')).toBe(false);
    expect(persistenceRotationPending(true, 'previous')).toBe(true);
    expect(persistenceRotationPending(true, 'current', 'mixed')).toBe(true);
  });

  it('routes operator action from recovery and rotation evidence without authorizing repair', () => {
    expect(persistenceOperatorAction('restored', 'restored', false)).toBe('none');
    expect(persistenceOperatorAction('corrupt', 'restored', false)).toBe('review-partial-recovery');
    expect(persistenceOperatorAction('restored', 'partial', false)).toBe('review-partial-recovery');
    expect(persistenceOperatorAction('restored', 'restored', true)).toBe('review-key-rotation');
    expect(persistenceOperatorAction('corrupt', 'partial', true)).toBe(
      'review-partial-recovery-and-key-rotation'
    );
  });

  it('fails readiness closed for partial enabled event logs but permits cold starts', () => {
    expect(eventLogReady(false, 'partial')).toBe(true);
    expect(eventLogReady(true, 'missing')).toBe(true);
    expect(eventLogReady(true, 'restored')).toBe(true);
    expect(eventLogReady(true, 'partial')).toBe(false);
  });

  let dir: string;
  let storePath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'omega-persistence-'));
    storePath = join(dir, 'runtime.json');
  });

  describe('loadSnapshot', () => {
    it('returns an empty snapshot and reports disabled when persistence is off', () => {
      writeFileSync(storePath, JSON.stringify(fixture()));

      const result = loadSnapshot<Snap>(storePath, false);

      expect(result.source).toBe('disabled');
      expect(result.snapshot).toEqual(emptySnapshot());
      expect(result.reason).toBeUndefined();
    });

    it('reports missing rather than corrupt when no store exists', () => {
      const result = loadSnapshot<Snap>(join(dir, 'never-written.json'), true);

      expect(result.source).toBe('missing');
      expect(result.reason).toBeDefined();
      expect(result.snapshot).toEqual(emptySnapshot());
    });

    it('reports corrupt when the store is not valid JSON', () => {
      writeFileSync(storePath, '{ this is not json');

      const result = loadSnapshot<Snap>(storePath, true);

      expect(result.source).toBe('corrupt');
      expect(result.reason).toBeDefined();
      expect(result.snapshot).toEqual(emptySnapshot());
    });

    it('reports corrupt when a collection is missing or not an array', () => {
      writeFileSync(storePath, JSON.stringify({ ...fixture(), runs: 'not-an-array' }));
      expect(loadSnapshot<Snap>(storePath, true).source).toBe('corrupt');

      writeFileSync(storePath, JSON.stringify({ events: [] }));
      expect(loadSnapshot<Snap>(storePath, true).source).toBe('corrupt');
    });

    it('reports corrupt when the store parses to a non-object', () => {
      writeFileSync(storePath, 'null');
      expect(loadSnapshot<Snap>(storePath, true).source).toBe('corrupt');

      writeFileSync(storePath, '42');
      expect(loadSnapshot<Snap>(storePath, true).source).toBe('corrupt');
    });

    /**
     * `decryptText` has three distinct failure reasons, but every existing
     * encryption test either round-trips successfully or supplies the wrong
     * key to an otherwise well-formed record, so only its final fallback
     * ("could not be decrypted") had ever run. A store that is truncated
     * below the envelope's structure, or one nobody configured a key for at
     * all, are different failures with different fixes, and the caller
     * deserves to tell them apart.
     */
    it('reports a specific reason when an encrypted record is missing an envelope segment', () => {
      writeFileSync(storePath, 'omega-v1:only-one-segment');

      const result = loadSnapshot<Snap>(storePath, true, 'irrelevant-secret');

      expect(result.source).toBe('corrupt');
      expect(result.reason).toBe('encrypted persistence record is malformed');
    });

    it('reports a specific reason when an encrypted record has truncated segments', () => {
      writeFileSync(storePath, 'omega-v1:AAAA:BBBB:CCCC');

      const result = loadSnapshot<Snap>(storePath, true, 'irrelevant-secret');

      expect(result.source).toBe('corrupt');
      expect(result.reason).toBe('encrypted persistence record has invalid lengths');
    });

    it('reports a specific reason when an encrypted store has no persistence key configured', () => {
      saveSnapshot(storePath, fixture(), true, 'was-configured-secret');

      const result = loadSnapshot<Snap>(storePath, true);

      expect(result.source).toBe('corrupt');
      expect(result.reason).toBe('encrypted persistence requires OMEGA_PERSISTENCE_KEY');
    });

    it('restores every collection from a well-formed store', () => {
      const written = fixture();
      writeFileSync(storePath, JSON.stringify(written));

      const result = loadSnapshot<Snap>(storePath, true);

      expect(result.source).toBe('restored');
      expect(result.reason).toBeUndefined();
      expect(result.snapshot).toEqual(written);
      for (const key of SNAPSHOT_KEYS) {
        expect(result.snapshot[key]).toHaveLength(1);
      }
    });

    it('fills absent-but-valid collections from the empty snapshot', () => {
      const partial = { ...fixture(), recompilations: [] };
      writeFileSync(storePath, JSON.stringify(partial));

      const result = loadSnapshot<Snap>(storePath, true);

      expect(result.source).toBe('restored');
      expect(result.snapshot.recompilations).toEqual([]);
    });
  });

  describe('saveSnapshot', () => {
    it('writes nothing and reports false when persistence is off', () => {
      expect(saveSnapshot(storePath, fixture(), false)).toBe(false);
      expect(existsSync(storePath)).toBe(false);
    });

    it('writes the snapshot and reports true when enabled', () => {
      expect(saveSnapshot(storePath, fixture(), true)).toBe(true);
      expect(JSON.parse(readFileSync(storePath, 'utf8'))).toEqual(fixture());
    });

    it('creates the parent directory when it does not exist', () => {
      const nested = join(dir, 'deep', 'nested', 'runtime.json');

      expect(saveSnapshot(nested, fixture(), true)).toBe(true);
      expect(existsSync(nested)).toBe(true);
    });

    it('leaves no temporary file behind after an atomic write', () => {
      saveSnapshot(storePath, fixture(), true);

      expect(existsSync(`${storePath}.tmp`)).toBe(false);
    });

    it('round-trips through loadSnapshot', () => {
      const written = fixture();
      saveSnapshot(storePath, written, true);

      const result = loadSnapshot<Snap>(storePath, true);

      expect(result.source).toBe('restored');
      expect(result.snapshot).toEqual(written);
    });

    it('encrypts snapshots at rest and authenticates the round trip', () => {
      const written = fixture();
      const secret = 'runtime-encryption-test-secret';

      expect(saveSnapshot(storePath, written, true, secret)).toBe(true);
      const stored = readFileSync(storePath, 'utf8');
      expect(stored.startsWith('omega-v1:')).toBe(true);
      expect(stored).not.toContain('evt-1');

      const result = loadSnapshot<Snap>(storePath, true, secret);

      expect(result.source).toBe('restored');
      expect(result.snapshot).toEqual(written);
    });

    it('reads a legacy plaintext snapshot while encryption is configured', () => {
      const written = fixture();
      saveSnapshot(storePath, written, true);

      const result = loadSnapshot<Snap>(storePath, true, 'migration-secret');

      expect(result.source).toBe('restored');
      expect(result.snapshot).toEqual(written);
    });

    it('restores an encrypted snapshot with the previous key and reports its source', () => {
      saveSnapshot(storePath, fixture(), true, 'previous-secret');

      const result = loadSnapshot<Snap>(storePath, true, 'current-secret', 'previous-secret');

      expect(result.source).toBe('restored');
      expect(result.keySource).toBe('previous');
      expect(result.snapshot).toEqual(fixture());
    });

    it('reports encrypted snapshots as corrupt when both rotation keys are wrong', () => {
      saveSnapshot(storePath, fixture(), true, 'correct-secret');

      const result = loadSnapshot<Snap>(storePath, true, 'wrong-secret', 'also-wrong-secret');

      expect(result.source).toBe('corrupt');
      expect(result.reason).toBeDefined();
      expect(result.snapshot).toEqual(emptySnapshot());
    });

    it('overwrites a previously written store', () => {
      saveSnapshot(storePath, fixture(), true);
      saveSnapshot(storePath, emptySnapshot(), true);

      const result = loadSnapshot<Snap>(storePath, true);

      expect(result.snapshot).toEqual(emptySnapshot());
    });

    it('surfaces a corrupt store rather than silently starting fresh', () => {
      mkdirSync(join(dir, 'sub'), { recursive: true });
      const path = join(dir, 'sub', 'runtime.json');
      saveSnapshot(path, fixture(), true);
      writeFileSync(path, readFileSync(path, 'utf8').slice(0, 12));

      const result = loadSnapshot<Snap>(path, true);

      expect(result.source).toBe('corrupt');
      expect(result.reason).toBeDefined();
    });

    it('re-encrypts a previous-key snapshot and event log under the current key', () => {
      const logPath = join(dir, 'runtime.log.jsonl');
      saveSnapshot(storePath, fixture(), true, 'previous-secret');
      appendEvent(logPath, { id: 'evt-old' }, true, 'previous-secret');

      const result = reencryptPersistence(
        storePath,
        logPath,
        true,
        'current-secret',
        'previous-secret'
      );

      expect(result).toMatchObject({
        rewritten: true,
        snapshotRecords: 5,
        eventRecords: 1,
        snapshotKeySource: 'previous',
        eventLogKeySource: 'previous',
      });
      expect(loadSnapshot<Snap>(storePath, true, 'current-secret').keySource).toBe('current');
      expect(readEventLog<{ id: string }>(logPath, true, 'current-secret').entries).toEqual([
        { id: 'evt-old' },
      ]);
      expect(loadSnapshot<Snap>(storePath, true, 'current-secret', 'previous-secret').source).toBe(
        'restored'
      );
    });

    it('does not rewrite stores already authenticated by the current key', () => {
      const logPath = join(dir, 'runtime.log.jsonl');
      saveSnapshot(storePath, fixture(), true, 'current-secret');
      appendEvent(logPath, { id: 'evt-current' }, true, 'current-secret');

      const result = reencryptPersistence(
        storePath,
        logPath,
        true,
        'current-secret',
        'previous-secret'
      );

      expect(result.rewritten).toBe(false);
      expect(result.snapshotKeySource).toBe('current');
      expect(result.eventLogKeySource).toBe('current');
    });

    it('does nothing when disabled or when either encryption key is missing', () => {
      // Every other reencryptPersistence test here supplies enabled: true and
      // both keys, so the guard clause itself, the thing that decides whether
      // any of this runs at all, had never actually been the reason nothing
      // happened.
      const logPath = join(dir, 'runtime.log.jsonl');
      const expected = {
        rewritten: false,
        snapshotRecords: 0,
        eventRecords: 0,
        snapshotKeySource: 'none',
        eventLogKeySource: 'none',
      };

      expect(
        reencryptPersistence(storePath, logPath, false, 'current-secret', 'previous-secret')
      ).toEqual(expected);
      expect(reencryptPersistence(storePath, logPath, true, undefined, 'previous-secret')).toEqual(
        expected
      );
      expect(reencryptPersistence(storePath, logPath, true, 'current-secret', undefined)).toEqual(
        expected
      );
    });

    it('re-encrypts a snapshot whose event log has no entries yet, without adding a stray newline', () => {
      // The re-encryption tests above always append at least one event, so
      // the "join entries, then add a trailing newline only if there were
      // any" branch had only ever taken the "there were entries" side.
      const logPath = join(dir, 'runtime.log.jsonl');
      saveSnapshot(storePath, fixture(), true, 'previous-secret');

      const result = reencryptPersistence(
        storePath,
        logPath,
        true,
        'current-secret',
        'previous-secret'
      );

      expect(result.rewritten).toBe(true);
      expect(result.eventRecords).toBe(0);
      expect(readFileSync(logPath, 'utf8')).toBe('');
    });

    it('refuses to rewrite when the event log is partial', () => {
      const logPath = join(dir, 'runtime.log.jsonl');
      saveSnapshot(storePath, fixture(), true, 'previous-secret');
      appendEvent(logPath, { id: 'evt-old' }, true, 'previous-secret');
      appendEvent(logPath, { id: 'evt-bad' }, true, 'wrong-secret');
      const snapshotBefore = readFileSync(storePath, 'utf8');
      const logBefore = readFileSync(logPath, 'utf8');

      expect(() =>
        reencryptPersistence(storePath, logPath, true, 'current-secret', 'previous-secret')
      ).toThrow('complete authenticated local evidence');
      expect(readFileSync(storePath, 'utf8')).toBe(snapshotBefore);
      expect(readFileSync(logPath, 'utf8')).toBe(logBefore);
    });

    it('recovers a staged re-encryption transaction and removes its journal', () => {
      const logPath = join(dir, 'runtime.log.jsonl');
      const stagedSnapshot = `${storePath}.staged`;
      const stagedLog = `${logPath}.staged`;
      writeFileSync(stagedSnapshot, JSON.stringify(fixture()));
      writeFileSync(stagedLog, '{"id":"evt-recovered"}\n');
      const journalPath = reencryptionJournalPath(storePath);
      writeFileSync(
        journalPath,
        JSON.stringify({
          version: 1,
          storePath,
          logPath,
          snapshotTemporaryPath: stagedSnapshot,
          logTemporaryPath: stagedLog,
          phase: 'staged',
        })
      );

      expect(reconcileReencryptionJournal(journalPath)).toEqual({ status: 'recovered' });
      expect(existsSync(journalPath)).toBe(false);
      expect(readFileSync(storePath, 'utf8')).toContain('evt-1');
      expect(readFileSync(logPath, 'utf8')).toContain('evt-recovered');
    });

    it('blocks startup reconciliation when a journal artifact is missing', () => {
      const journalPath = reencryptionJournalPath(storePath);
      writeFileSync(
        journalPath,
        JSON.stringify({
          version: 1,
          storePath,
          logPath: join(dir, 'runtime.log.jsonl'),
          snapshotTemporaryPath: `${storePath}.missing`,
          logTemporaryPath: `${storePath}.missing-log`,
          phase: 'staged',
        })
      );

      expect(reconcileReencryptionJournal(journalPath)).toMatchObject({ status: 'blocked' });
      expect(existsSync(journalPath)).toBe(true);
    });

    it('reports nothing to reconcile when no journal was ever left behind', () => {
      // Every other reconcileReencryptionJournal test here writes a journal
      // file first. The ordinary startup case, no interrupted transaction at
      // all, is what actually exercises the existsSync guard's own early
      // return, and that had never run.
      const journalPath = reencryptionJournalPath(storePath);

      expect(reconcileReencryptionJournal(journalPath)).toEqual({ status: 'none' });
    });

    it('blocks reconciliation when the journal file is not valid JSON', () => {
      const journalPath = reencryptionJournalPath(storePath);
      writeFileSync(journalPath, '{ not valid json');

      expect(reconcileReencryptionJournal(journalPath)).toEqual({
        status: 'blocked',
        reason: 're-encryption journal is unreadable',
      });
    });

    it('blocks reconciliation when the journal fails structural validation', () => {
      const journalPath = reencryptionJournalPath(storePath);
      writeFileSync(
        journalPath,
        JSON.stringify({
          version: 2,
          storePath,
          logPath: join(dir, 'runtime.log.jsonl'),
          snapshotTemporaryPath: `${storePath}.staged`,
          logTemporaryPath: `${storePath}.staged-log`,
          phase: 'staged',
        })
      );

      expect(reconcileReencryptionJournal(journalPath)).toEqual({
        status: 'blocked',
        reason: 're-encryption journal is malformed',
      });
    });

    it('blocks reconciliation when every other field is valid but the phase is not a recognised value', () => {
      // The malformed-journal case above fails on its very first check (a
      // wrong version), so the phase check at the end of that same
      // condition, reached only once every earlier check has already
      // passed, had never actually been the reason a journal was rejected.
      const journalPath = reencryptionJournalPath(storePath);
      writeFileSync(
        journalPath,
        JSON.stringify({
          version: 1,
          storePath,
          logPath: join(dir, 'runtime.log.jsonl'),
          snapshotTemporaryPath: `${storePath}.staged`,
          logTemporaryPath: `${storePath}.staged-log`,
          phase: 'not-a-real-phase',
        })
      );

      expect(reconcileReencryptionJournal(journalPath)).toEqual({
        status: 'blocked',
        reason: 're-encryption journal is malformed',
      });
    });

    it('blocks reconciliation when only the staged snapshot is missing and the staged log is present', () => {
      // The "journal artifact is missing" case above is missing its staged
      // log, which is checked first and blocks before the snapshot check
      // ever runs. Leaving the log in place isolates the snapshot's own
      // existsSync check as the reason reconciliation is blocked.
      const logPath = join(dir, 'runtime.log.jsonl');
      const stagedLog = `${logPath}.staged`;
      writeFileSync(stagedLog, '{"id":"evt"}\n');
      const journalPath = reencryptionJournalPath(storePath);
      writeFileSync(
        journalPath,
        JSON.stringify({
          version: 1,
          storePath,
          logPath,
          snapshotTemporaryPath: `${storePath}.staged`,
          logTemporaryPath: stagedLog,
          phase: 'staged',
        })
      );

      expect(reconcileReencryptionJournal(journalPath)).toEqual({
        status: 'blocked',
        reason: 're-encryption transaction is missing its staged snapshot',
      });
    });

    it('recovers a snapshot-committed transaction without re-renaming the already-committed snapshot', () => {
      // Every recovery case above uses phase 'staged', which renames the
      // staged snapshot into place as part of recovery. A crash recorded as
      // 'snapshot-committed' means that rename already happened before the
      // crash, so recovery must skip it and only finish the log rename, a
      // distinct path that had never run.
      const logPath = join(dir, 'runtime.log.jsonl');
      const stagedLog = `${logPath}.staged`;
      writeFileSync(storePath, JSON.stringify(fixture()));
      writeFileSync(stagedLog, '{"id":"evt-recovered"}\n');
      const journalPath = reencryptionJournalPath(storePath);
      writeFileSync(
        journalPath,
        JSON.stringify({
          version: 1,
          storePath,
          logPath,
          snapshotTemporaryPath: `${storePath}.staged`, // never created; must not be touched
          logTemporaryPath: stagedLog,
          phase: 'snapshot-committed',
        })
      );

      expect(reconcileReencryptionJournal(journalPath)).toEqual({ status: 'recovered' });
      expect(existsSync(journalPath)).toBe(false);
      expect(readFileSync(storePath, 'utf8')).toContain('evt-1');
      expect(readFileSync(logPath, 'utf8')).toContain('evt-recovered');
    });

    it('blocks reconciliation when the final commit fails partway through', () => {
      // Every successful recovery above commits cleanly. A destination that
      // cannot actually receive the rename, here the log path is itself a
      // directory, exercises the commit step's own catch block, which
      // reports a blocked transaction rather than letting the exception
      // escape uncaught.
      const logPath = join(dir, 'runtime.log.jsonl');
      mkdirSync(logPath);
      const stagedSnapshot = `${storePath}.staged`;
      const stagedLog = `${logPath}.staged`;
      writeFileSync(stagedSnapshot, JSON.stringify(fixture()));
      writeFileSync(stagedLog, '{"id":"evt"}\n');
      const journalPath = reencryptionJournalPath(storePath);
      writeFileSync(
        journalPath,
        JSON.stringify({
          version: 1,
          storePath,
          logPath,
          snapshotTemporaryPath: stagedSnapshot,
          logTemporaryPath: stagedLog,
          phase: 'staged',
        })
      );

      expect(reconcileReencryptionJournal(journalPath)).toEqual({
        status: 'blocked',
        reason: 're-encryption transaction could not be committed',
      });
    });
  });
});

describe('append-only event log', () => {
  let dir: string;
  let logPath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'omega-log-'));
    logPath = join(dir, 'runtime.log.jsonl');
  });

  it('writes nothing and reports not appended when disabled', () => {
    expect(appendEvent(logPath, { id: 'evt-1' }, false).appended).toBe(false);
    expect(existsSync(logPath)).toBe(false);
  });

  it('reports missing rather than empty when no log exists', () => {
    const result = readEventLog(join(dir, 'absent.jsonl'), true);

    expect(result.source).toBe('missing');
    expect(result.entries).toEqual([]);
    expect(result.reason).toBeDefined();
  });

  it('reports disabled without touching the filesystem', () => {
    const result = readEventLog(logPath, false);

    expect(result.source).toBe('disabled');
    expect(result.skipped).toBe(0);
  });

  it('creates the parent directory on first append', () => {
    const nested = join(dir, 'deep', 'runtime.log.jsonl');

    expect(appendEvent(nested, { id: 'evt-1' }, true).appended).toBe(true);
    expect(existsSync(nested)).toBe(true);
  });

  it('appends without rewriting earlier entries', () => {
    appendEvent(logPath, { id: 'evt-1' }, true);
    const afterFirst = readFileSync(logPath, 'utf8');

    appendEvent(logPath, { id: 'evt-2' }, true);
    const afterSecond = readFileSync(logPath, 'utf8');

    expect(afterSecond.startsWith(afterFirst)).toBe(true);
  });

  it('encrypts each event line without breaking append-only order', () => {
    const secret = 'event-encryption-test-secret';

    appendEvent(logPath, { id: 'evt-1', claim: 'private event' }, true, secret);
    appendEvent(logPath, { id: 'evt-2', claim: 'second event' }, true, secret);

    const stored = readFileSync(logPath, 'utf8');
    expect(stored).toMatch(/^omega-v1:/);
    expect(stored).not.toContain('private event');

    const result = readEventLog<{ id: string }>(logPath, true, secret);

    expect(result.source).toBe('restored');
    expect(result.entries.map((entry) => entry.id)).toEqual(['evt-1', 'evt-2']);
    expect(result.skipped).toBe(0);
  });

  it('restores mixed event-log lines and reports previous-key provenance', () => {
    appendEvent(logPath, { id: 'evt-old' }, true, 'previous-secret');
    appendEvent(logPath, { id: 'evt-new' }, true, 'current-secret');

    const result = readEventLog<{ id: string }>(logPath, true, 'current-secret', 'previous-secret');

    expect(result.source).toBe('restored');
    expect(result.keySource).toBe('mixed');
    expect(result.entries.map((entry) => entry.id)).toEqual(['evt-old', 'evt-new']);
  });

  /**
   * The "mixed" provenance test above always pairs a previous-key line with
   * a current-key line, so `combineKeySources` had only ever seen sets
   * containing 'current'. A log rotated once, where every surviving line
   * still decrypts under the previous key alone, reports a distinct,
   * narrower provenance ('previous', not 'mixed') that nothing exercised.
   */
  it('reports a pure previous-key provenance when every line decrypts under the rotation key', () => {
    appendEvent(logPath, { id: 'evt-1' }, true, 'previous-secret');
    appendEvent(logPath, { id: 'evt-2' }, true, 'previous-secret');

    const result = readEventLog<{ id: string }>(logPath, true, undefined, 'previous-secret');

    expect(result.source).toBe('restored');
    expect(result.keySource).toBe('previous');
    expect(result.entries.map((entry) => entry.id)).toEqual(['evt-1', 'evt-2']);
  });

  it('reports an encrypted line as partial when the key is wrong', () => {
    appendEvent(logPath, { id: 'evt-1' }, true, 'correct-secret');

    const result = readEventLog<{ id: string }>(logPath, true, 'wrong-secret', 'also-wrong-secret');

    expect(result.source).toBe('partial');
    expect(result.skipped).toBe(1);
    expect(result.entries).toEqual([]);
  });

  it('preserves every entry in order, beyond the in-memory window', () => {
    for (let index = 0; index < 120; index += 1) {
      appendEvent(logPath, { id: `evt-${index}` }, true);
    }

    const result = readEventLog<{ id: string }>(logPath, true);

    expect(result.source).toBe('restored');
    expect(result.entries).toHaveLength(120);
    expect(result.entries[0].id).toBe('evt-0');
    expect(result.entries[119].id).toBe('evt-119');
    expect(result.skipped).toBe(0);
  });

  it('keeps history that the bounded runtime window would have dropped', () => {
    const window = 40;
    for (let index = 0; index < window + 5; index += 1) {
      appendEvent(logPath, { id: `evt-${index}` }, true);
    }

    const result = readEventLog<{ id: string }>(logPath, true);

    expect(result.entries).toHaveLength(window + 5);
    expect(result.entries.map((entry) => entry.id)).toContain('evt-0');
  });

  it('reports a partial read rather than silently dropping a bad line', () => {
    appendEvent(logPath, { id: 'evt-1' }, true);
    writeFileSync(logPath, `${readFileSync(logPath, 'utf8')}{ not json\n`);
    appendEvent(logPath, { id: 'evt-2' }, true);

    const result = readEventLog<{ id: string }>(logPath, true);

    expect(result.source).toBe('partial');
    expect(result.skipped).toBe(1);
    expect(result.reason).toContain('1');
    expect(result.entries.map((entry) => entry.id)).toEqual(['evt-1', 'evt-2']);
  });

  it('ignores blank lines without counting them as damage', () => {
    appendEvent(logPath, { id: 'evt-1' }, true);
    writeFileSync(logPath, `${readFileSync(logPath, 'utf8')}\n\n`);

    const result = readEventLog(logPath, true);

    expect(result.source).toBe('restored');
    expect(result.skipped).toBe(0);
    expect(result.entries).toHaveLength(1);
  });

  it('reports a reason when the append itself fails', () => {
    // A regular file where a directory is required: mkdirSync raises ENOTDIR.
    const blocker = join(dir, 'blocker');
    writeFileSync(blocker, 'not a directory');

    const outcome = appendEvent(join(blocker, 'runtime.log.jsonl'), { id: 'x' }, true);

    expect(outcome.appended).toBe(false);
    expect(outcome.reason).toBeDefined();
  });
});
