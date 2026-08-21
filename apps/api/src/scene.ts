import { createHash } from 'node:crypto';
import type { SceneSimulation, SceneSimulationInput, SceneState } from '@omega-v/types';

const SCENE_STATES: readonly SceneState[] = [
  'darkness',
  'possibility',
  'ocean',
  'star',
  'water-form',
  'many-forms',
  'loneliness',
  'human-form',
  'misrecognition',
  'boundary',
  'question',
  'forest',
  'return',
];

const DEFAULT_SEED = 'omega-v-scene';
const MAX_STEPS = 32;

const digest = (value: string): string =>
  `sha256:${createHash('sha256').update(value, 'utf8').digest('hex').slice(0, 16)}`;

const boundedSeed = (seed: string | undefined): string => {
  const normalized = seed?.trim() || DEFAULT_SEED;
  return normalized.slice(0, 120);
};

const boundedSteps = (steps: number | undefined): number => {
  if (steps === undefined) return SCENE_STATES.length;
  if (!Number.isInteger(steps) || steps < 1 || steps > MAX_STEPS) {
    throw new Error(`steps must be an integer between 1 and ${MAX_STEPS}`);
  }
  return Math.min(steps, SCENE_STATES.length);
};

export const sceneStates = (): readonly SceneState[] => SCENE_STATES;

export const simulateScene = (input: SceneSimulationInput = {}): SceneSimulation => {
  const seed = boundedSeed(input.seed);
  const steps = boundedSteps(input.steps);
  const states = SCENE_STATES.slice(0, steps);
  const startedAt = new Date().toISOString();
  const trace = states.map((state, index) => ({
    sequence: index,
    state,
    status: index === 0 ? ('observed' as const) : ('verified' as const),
    evidence: `scene:${state}:${digest(`${seed}:${index}:${state}`)}`,
  }));
  const terminalState = states[states.length - 1] ?? 'darkness';

  return {
    id: `scene-${digest(`${seed}:${steps}`)}`,
    seed,
    equation:
      'DARKNESS→POSSIBILITY→OCEAN→STAR→WATER_FORM→MANY_FORMS→LONELINESS→HUMAN_FORM→MISRECOGNITION→BOUNDARY→QUESTION→FOREST→RETURN',
    states,
    terminalState,
    trace,
    provenance: {
      source: 'local-simulation',
      ruleVersion: 'scene-equation.v1',
      deterministic: true,
      verified: false,
      note: 'Symbolic simulation evidence only; it is not a claim about physical cosmology or consciousness.',
    },
    createdAt: startedAt,
  };
};
