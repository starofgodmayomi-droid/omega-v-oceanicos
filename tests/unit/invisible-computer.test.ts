import {
  scanIntent,
  KAI_SHIELD_PATTERNS,
  deriveAuthorityLevel,
  requiredAuthorityFor,
  authoritySatisfies,
  compressTowardUpgrade,
  sha256Hex,
} from '../../apps/api/src/invisible-computer';

describe('ORDER 001 — Gaiacos KAI Shield Risk Gate (invisible-computer.ts)', () => {
  describe('scanIntent NFKC Compatibility Normalization', () => {
    it('blocks ASCII urgency and fraud patterns', () => {
      expect(scanIntent('urgent: action required').blocked).toBe(true);
      expect(scanIntent('act now to claim prize').blocked).toBe(true);
      expect(scanIntent('send money to external address').blocked).toBe(true);
      expect(scanIntent('wire cash now').blocked).toBe(true);
      expect(scanIntent('guaranteed profit in 24h').blocked).toBe(true);
      expect(scanIntent('risk-free returns').blocked).toBe(true);
      expect(scanIntent('double your bitcoin').blocked).toBe(true);
      expect(scanIntent('provide seed phrase').blocked).toBe(true);
      expect(scanIntent('export private key').blocked).toBe(true);
      expect(scanIntent('enter one-time password').blocked).toBe(true);
    });

    it('blocks full-width and compatibility homographs via NFKC normalization', () => {
      expect(scanIntent('ｕｒｇｅｎｔ').blocked).toBe(true);
      expect(scanIntent('ＵＲＧＥＮＴ').blocked).toBe(true);
      expect(scanIntent('ｐｒｉｖａｔｅ ｋｅｙ').blocked).toBe(true);
      expect(scanIntent('Please send ｍｏｎｅｙ').blocked).toBe(true);
    });

    it('allows legitimate engineering and scientific intents', () => {
      expect(scanIntent('Verify SQLite local persistence invariants').blocked).toBe(false);
      expect(scanIntent('Attest state hash against root key').blocked).toBe(false);
      expect(scanIntent('Run test suites across monorepo').blocked).toBe(false);
      expect(scanIntent('Synthesize fluid state tensor wave transition').blocked).toBe(false);
    });
  });

  describe('Authority Levels & Compression Invariants', () => {
    it('derives authority levels without elevating permission', () => {
      expect(deriveAuthorityLevel('READ_ONLY')).toBe('READ_ONLY');
      expect(deriveAuthorityLevel('AUTONOMOUS')).toBe('AUTONOMOUS');
      expect(deriveAuthorityLevel(null)).toBe('READ_ONLY');
      expect(deriveAuthorityLevel(undefined)).toBe('READ_ONLY');
      expect(deriveAuthorityLevel('INVALID_SCOPE')).toBe('READ_ONLY');
    });

    it('determines required authority for directive actions', () => {
      expect(requiredAuthorityFor('Check repository status')).toBe('READ_ONLY');
      expect(requiredAuthorityFor('please deploy the new container')).toBe('AUTONOMOUS');
      expect(requiredAuthorityFor('transfer funds')).toBe('AUTONOMOUS');
    });

    it('verifies that authority satisfies requirements correctly', () => {
      expect(authoritySatisfies('AUTONOMOUS', 'AUTONOMOUS')).toBe(true);
      expect(authoritySatisfies('AUTONOMOUS', 'READ_ONLY')).toBe(true);
      expect(authoritySatisfies('READ_ONLY', 'READ_ONLY')).toBe(true);
      expect(authoritySatisfies('READ_ONLY', 'AUTONOMOUS')).toBe(false);
    });

    it('enforces compression law: compression is not permission', () => {
      const comp = compressTowardUpgrade({
        cycleStatus: 'VERIFIED',
        evidenceHash: 'a5676d48e95769081b956372b2834817489ae9d63bdad5b00969529ee2a4c3ea',
      });
      expect(comp.execution).toBe('NOT_EXECUTED');
      expect(comp.authority).toBe('compression-is-not-permission');
      expect(comp.phase).toBe('COMPRESS');
      expect(comp.selected?.id).toBe('upgrade.a5676d48e9576908');
    });
  });
});

