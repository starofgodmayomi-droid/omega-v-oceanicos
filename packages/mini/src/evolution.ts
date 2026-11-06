/**
 * The Evolution Law: `Ease(t) = (1 - cos(t * π)) / 2`, bounded to `t ∈ [0, 1]`,
 * with the four declared phases SPROUT → BLOOM → PLATEAU → WILT.
 *
 * `SOVEREIGN-OS-ENTITY-BODY.md` states the law. This module is its executable
 * form and a pure read: it grows no ledger, widens no authority, and upgrades
 * nothing. A position is derived from the verified rows the system has actually
 * earned against a declared capacity — never from a claim about growth.
 */

export const EVOLUTION_LAW_ID = 'omega.evolution.ease.v1';

/**
 * Declared bound, not a measurement. The projection paces verified rows up to
 * this number; reaching it is a decision point for a declared expansion, not
 * permission to keep growing.
 */
export const EVOLUTION_CAPACITY = 1024;

export type EvolutionPhase = 'SPROUT' | 'BLOOM' | 'PLATEAU' | 'WILT';

export interface EvolutionPosition {
  readonly law: typeof EVOLUTION_LAW_ID;
  readonly phase: EvolutionPhase;
  readonly phase_t: number;
  readonly ease: number;
  readonly remaining: number;
  readonly verified: number;
  readonly capacity: number;
  readonly saturated: boolean;
}

/**
 * `Ease(t) = (1 - cos(t * π)) / 2`, or `null` outside the bounded interval.
 * Out-of-range input is refused, never clamped into a plausible number.
 */
export function easeOf(t: number): number | null {
  if (typeof t !== 'number' || !Number.isFinite(t) || t < 0 || t > 1) return null;
  return (1 - Math.cos(t * Math.PI)) / 2;
}

/**
 * Quarters of the bounded interval. WILT is the closing quarter, where the
 * curve has almost stopped adding value: the step is ending, not decaying.
 */
export function phaseOf(t: number): EvolutionPhase | null {
  if (typeof t !== 'number' || !Number.isFinite(t) || t < 0 || t > 1) return null;
  if (t < 0.25) return 'SPROUT';
  if (t < 0.5) return 'BLOOM';
  if (t < 0.75) return 'PLATEAU';
  return 'WILT';
}

/**
 * Growth position of `verified` rows against a declared `capacity`.
 * `phase_t` is clamped to 1 at the bound; `saturated` records that the rows
 * have reached or passed it, so saturation is never hidden as progress.
 */
export function evolutionPosition(
  verified: number,
  capacity: number = EVOLUTION_CAPACITY
): EvolutionPosition | null {
  if (!Number.isSafeInteger(verified) || verified < 0) return null;
  if (!Number.isSafeInteger(capacity) || capacity < 1) return null;
  const saturated = verified >= capacity;
  const phase_t = Math.min(1, verified / capacity);
  const ease = easeOf(phase_t);
  const phase = phaseOf(phase_t);
  if (ease === null || phase === null) return null;
  return Object.freeze({
    law: EVOLUTION_LAW_ID,
    phase,
    phase_t,
    ease,
    remaining: 1 - ease,
    verified,
    capacity,
    saturated,
  });
}
