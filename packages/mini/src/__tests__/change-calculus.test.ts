import { describe, expect, it } from '@jest/globals';
import {
  canExecuteOmegaDecision,
  canPromoteOmegaReality,
  classifyOmegaReality,
  validateOmegaChangeTuple,
} from '@oceanicos/types';

describe('Ω Change Calculus boundary', () => {
  it('keeps DENY and REVIEW non-executable', () => {
    expect(canExecuteOmegaDecision('DENY', false)).toBe(false);
    expect(canExecuteOmegaDecision('REVIEW', true)).toBe(false);
    expect(canExecuteOmegaDecision('ALLOW', true)).toBe(true);
    expect(canExecuteOmegaDecision('ALLOW', false)).toBe(false);
  });

  it('classifies reality from evidence instead of prose', () => {
    expect(classifyOmegaReality({
      authorized: true,
      executed: true,
      observed: true,
      expectedMatchesActual: true,
      evidenceValid: true,
      provenanceIntact: true,
    })).toBe('VERIFIED');
    expect(classifyOmegaReality({
      authorized: true,
      executed: true,
      observed: true,
      expectedMatchesActual: false,
      evidenceValid: true,
      provenanceIntact: true,
    })).toBe('DIVERGENT');
    expect(classifyOmegaReality({
      authorized: true,
      executed: true,
      observed: false,
      expectedMatchesActual: true,
      evidenceValid: true,
      provenanceIntact: true,
    })).toBe('UNKNOWN');
    expect(classifyOmegaReality({
      authorized: true,
      executed: false,
      observed: false,
      expectedMatchesActual: null,
      evidenceValid: false,
      provenanceIntact: true,
    })).toBe('NOT_EXECUTED');
  });

  it('rejects silent UNKNOWN → VERIFIED promotion and malformed tuples', () => {
    expect(canPromoteOmegaReality('UNKNOWN', 'VERIFIED')).toBe(false);
    expect(canPromoteOmegaReality('DIVERGENT', 'VERIFIED')).toBe(true);
    expect(() => validateOmegaChangeTuple({
      state: 'S0',
      intent: 'advance state',
      evidence: ['observation-1'],
      authority: 'human:alice',
      policy: 'policy:v1',
      context: { source: 'test' },
    })).not.toThrow();
    expect(() => validateOmegaChangeTuple({
      state: 'S0',
      intent: '',
      evidence: [],
      authority: null,
      policy: null,
      context: {},
    })).toThrow('change tuple intent is required');
  });
});
