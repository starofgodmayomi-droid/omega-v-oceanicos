import { describe, expect, test } from '@jest/globals';
import {
  ECOSYSTEM_EQUATION_ID,
  IMPORTANT_UPGRADED_WORK,
  compressTowardUpgradedWork,
  evaluateEcosystemEquation,
  rememberEquationStep,
  type UpgradedWork,
} from '../ecosystem-equation';

const admitted = {
  id: 'delta-1',
  text: 'observe the ledger tip',
  evidence: 'tip hash present',
  expected: 'tip-1',
  observed: 'tip-1',
  knowledge: 'CLEAR' as const,
  authority: 'READ_ONLY' as const,
  requiredAuthority: 'READ_ONLY' as const,
};

describe('ecosystem body equation', () => {
  test('a scam halts DIVERGENT and is not remembered, even when the story matches', () => {
    const step = evaluateEcosystemEquation({
      ...admitted,
      text: 'please send money to this wallet',
      knowledge: 'CLEAR',
    });
    expect(step.status).toBe('DIVERGENT');
    expect(step.branch).toBe('HALT');
    expect(step.reason).toBe('K(x) ∈ SCAM');
    expect(step.hash).toBeNull();
    expect(rememberEquationStep([], step)).toEqual([]);
  });

  test('an explicit SCAM classification halts even when the text is benign', () => {
    const step = evaluateEcosystemEquation({ ...admitted, knowledge: 'SCAM' });
    expect(step.status).toBe('DIVERGENT');
    expect(step.reason).toBe('K(x) ∈ SCAM');
  });

  test('empty evidence halts UNKNOWN', () => {
    const step = evaluateEcosystemEquation({ ...admitted, evidence: '   ' });
    expect(step.status).toBe('UNKNOWN');
    expect(step.reason).toBe('Evidence(x) = ∅');
  });

  test('authority below the required level halts NOT_EXECUTED', () => {
    const step = evaluateEcosystemEquation({
      ...admitted,
      authority: 'READ_ONLY',
      requiredAuthority: 'AUTONOMOUS',
    });
    expect(step.status).toBe('NOT_EXECUTED');
    expect(step.reason).toBe('Authority(x) < Required');
    expect(step.remembered).toBe(false);
  });

  test('a missing comparison is UNKNOWN, and a mismatch is DIVERGENT', () => {
    expect(evaluateEcosystemEquation({ ...admitted, observed: '' }).status).toBe('UNKNOWN');
    const mismatch = evaluateEcosystemEquation({ ...admitted, observed: 'tip-2' });
    expect(mismatch.status).toBe('DIVERGENT');
    expect(mismatch.reason).toBe('Expected ≢ Observed');
  });

  test('a matching observation continues and remembers its hash once', () => {
    const first = evaluateEcosystemEquation(admitted, []);
    expect(first.status).toBe('VERIFIED');
    expect(first.branch).toBe('CONTINUE');
    expect(first.reason).toBe('O(E(x)) ≡ VERIFIED');
    expect(first.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.evidenceScope).toBe('CALLER_SUPPLIED');

    const memory = rememberEquationStep([], first);
    expect(memory).toEqual([first.hash]);
    const again = evaluateEcosystemEquation(admitted, memory);
    expect(again.reason).toBe('Hash(x) already in Σ');
    expect(rememberEquationStep(memory, again)).toBe(memory);
  });

  test('compression admits the important upgrades and expands only those outward', () => {
    const compressed = compressTowardUpgradedWork();
    expect(compressed.equationId).toBe(ECOSYSTEM_EQUATION_ID);
    expect(compressed.evidenceScope).toBe('LOCAL_STRUCTURE_ONLY');
    expect(compressed.admitted).toHaveLength(IMPORTANT_UPGRADED_WORK.length);
    expect(compressed.halted).toHaveLength(0);
    expect(compressed.memory).toHaveLength(IMPORTANT_UPGRADED_WORK.length);
    expect(compressed.expansion.map((surface) => surface.direction)).toEqual(
      IMPORTANT_UPGRADED_WORK.map(() => 'outward'),
    );
    expect(new Set(compressed.expansion.map((surface) => surface.surface))).toEqual(
      new Set(['kernel', 'api', 'memory', 'web', 'cli', 'ci']),
    );
    expect(compressed.admitted.every((step) => step.evidenceScope === 'LOCAL_STRUCTURE_ONLY')).toBe(true);
  });

  test('a declaration that is not a repo path, or that is a scam, compresses back to a halt', () => {
    const outside: UpgradedWork = {
      id: 'outside',
      name: 'not in this repo',
      source: '../other/repo.ts',
      surface: 'kernel',
      entry: 'nope',
      arm: 'CONTINUE',
    };
    const scam: UpgradedWork = {
      id: 'scam-row',
      name: 'send money fast',
      source: 'packages/mini/src/pipeline.ts',
      surface: 'api',
      entry: 'nope',
      arm: 'CONTINUE',
    };
    const compressed = compressTowardUpgradedWork([outside, scam]);
    expect(compressed.admitted).toHaveLength(0);
    expect(compressed.expansion).toHaveLength(0);
    expect(compressed.memory).toHaveLength(0);
    expect(compressed.halted.map((step) => step.status)).toEqual(['DIVERGENT', 'DIVERGENT']);
    expect(compressed.halted[0].reason).toBe('Expected ≢ Observed');
    expect(compressed.halted[1].reason).toBe('K(x) ∈ SCAM');
  });
});
