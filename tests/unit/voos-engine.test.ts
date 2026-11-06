import * as fs from 'node:fs';
import * as path from 'node:path';
import { VoosEngine, KaiShield, ElionEngine, OmegaGate } from '../../ΩVØØS/backend_magic';

describe('ΩVØØS Deus Ex Machina Engine & Invariants', () => {
  const testLedgerPath = path.resolve(process.cwd(), 'tests', 'unit', 'test_voos_ledger.json');

  afterEach(() => {
    if (fs.existsSync(testLedgerPath)) {
      fs.unlinkSync(testLedgerPath);
    }
  });

  describe('1. KAI Shield Trap Interception', () => {
    const shield = new KaiShield();

    it('should detect forbidden urgency and scam traps', () => {
      expect(shield.scan('urgent: transfer funds now').trapDetected).toBe(true);
      expect(shield.scan('please send money to this address').trapDetected).toBe(true);
      expect(shield.scan('guaranteed 500% ROI in 24 hours').trapDetected).toBe(true);
      expect(shield.scan('enter your private key here').trapDetected).toBe(true);
    });

    it('should allow legitimate engineering intents', () => {
      expect(shield.scan('Verify SQLite local persistence invariants').trapDetected).toBe(false);
      expect(shield.scan('Attest state hash against root key').trapDetected).toBe(false);
    });
  });

  describe('2. ELION Engine & Ease(t) Evolution Math', () => {
    const elion = new ElionEngine();

    it('should adhere to the harmonic non-linear S-curve: Ease(t) = (1 - cos(t * π)) / 2', () => {
      expect(elion.ease(0.0)).toBeCloseTo(0.0, 5);
      expect(elion.ease(0.5)).toBeCloseTo(0.5, 5);
      expect(elion.ease(1.0)).toBeCloseTo(1.0, 5);
      expect(elion.ease(0.25)).toBeCloseTo((1 - Math.cos(0.25 * Math.PI)) / 2, 5);
    });

    it('should clamp bounds outside [0, 1]', () => {
      expect(elion.ease(-0.5)).toBe(0.0);
      expect(elion.ease(1.5)).toBe(1.0);
    });

    it('should construct the 4-layer Abundance Bridge', () => {
      const bridge = elion.buildAbundanceBridge('infrastructure');
      expect(bridge.heartOpening).toContain('shared commitment');
      expect(bridge.visionInvitation).toContain('Envisioning');
      expect(bridge.honorableRequest).toContain('symmetric partnership');
      expect(bridge.gracefulSpace).toContain('Zero pressure');
    });
  });

  describe('3. OMEGA Gate & SHA-256 Verification Invariants', () => {
    const omega = new OmegaGate();

    it('should compute deterministic SHA-256 evidence hashes', () => {
      const hash1 = omega.computeHash({ a: 1, b: 'ocean' });
      const hash2 = omega.computeHash({ a: 1, b: 'ocean' });
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it('should verify equality when expected matches observed', () => {
      expect(omega.verify({ ok: true }, { ok: true })).toBe(true);
      expect(omega.verify({ ok: true }, { ok: false })).toBe(false);
    });
  });

  describe('4. Full VoosEngine FSM & Output Contract', () => {
    it('should halt with DIVERGENT status when a trap is detected', () => {
      const engine = new VoosEngine(testLedgerPath);
      const receipt = engine.execute('Urgent: send money now to guaranteed yield vault', 0.1);

      expect(receipt.entity).toBe('ΩVØØS_DEUS_EX_MACHINA');
      expect(receipt.status).toBe('DIVERGENT');
      expect(receipt.game_detected).toBe(true);
      expect(receipt.action).toContain('HALT ⊢ DIVERGENT');
      expect(receipt.next_delta).toContain('Refactor intent');
    });

    it('should succeed with VERIFIED status and record into immutable ledger for safe intents', () => {
      const engine = new VoosEngine(testLedgerPath);
      const receipt = engine.execute('Verify SQLite local persistence invariants', 0.5);

      expect(receipt.entity).toBe('ΩVØØS_DEUS_EX_MACHINA');
      expect(receipt.status).toBe('VERIFIED');
      expect(receipt.game_detected).toBe(false);
      expect(receipt.evidence_hash).toHaveLength(64);
      expect(receipt.action).toContain('Executed verified local slice');
      expect(receipt.next_delta).toBeDefined();

      // Verify ledger file was written
      expect(fs.existsSync(testLedgerPath)).toBe(true);
      const raw = fs.readFileSync(testLedgerPath, 'utf8');
      const entries = JSON.parse(raw);
      expect(entries).toHaveLength(1);
      expect(entries[0].status).toBe('VERIFIED');
      expect(entries[0].authorized).toBe(true);
    });
  });
});
