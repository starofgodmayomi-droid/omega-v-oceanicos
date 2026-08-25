import { createHash } from 'node:crypto';
import type {
  SceneBranch,
  SceneSimulation,
  SceneSimulationInput,
  SceneState,
  SceneTrace,
} from '@omega-v/types';

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
const MAX_BRANCHES = 8;
const EQUATION =
  'DARKNESS→POSSIBILITY→OCEAN→STAR→WATER_FORM→MANY_FORMS→LONELINESS→HUMAN_FORM→MISRECOGNITION→BOUNDARY→QUESTION→FOREST→RETURN';

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

const boundedBranches = (branches: number | undefined): number => {
  if (branches === undefined) return 1;
  if (!Number.isInteger(branches) || branches < 1 || branches > MAX_BRANCHES) {
    throw new Error(`branches must be an integer between 1 and ${MAX_BRANCHES}`);
  }
  return branches;
};

const branchStates = (seed: string, branchIndex: number, steps: number): SceneState[] => {
  if (branchIndex === 0) return SCENE_STATES.slice(0, steps);
  const available = SCENE_STATES.slice(1);
  const offset =
    createHash('sha256').update(`${seed}:branch:${branchIndex}`, 'utf8').digest().readUInt32BE(0) %
    available.length;
  return Array.from({ length: steps }, (_, sequence) =>
    sequence === 0 ? 'darkness' : available[(offset + sequence - 1) % available.length]
  );
};

const traceFor = (seed: string, branchIndex: number, states: SceneState[]): SceneTrace =>
  states.map((state, sequence) => ({
    sequence,
    state,
    status: sequence === 0 ? ('observed' as const) : ('verified' as const),
    evidence: `scene:${state}:${digest(`${seed}:branch:${branchIndex}:${sequence}:${state}`)}`,
  }));

const branchFor = (seed: string, branchIndex: number, steps: number): SceneBranch => {
  const states = branchStates(seed, branchIndex, steps);
  return {
    id: `scene-branch-${digest(`${seed}:branch:${branchIndex}:${steps}`)}`,
    index: branchIndex,
    perspective: `point-of-view-${branchIndex + 1}`,
    states,
    terminalState: states[states.length - 1] ?? 'darkness',
    trace: traceFor(seed, branchIndex, states),
    divergenceEvidence: `scene:divergence:${digest(`${seed}:branch:${branchIndex}`)}`,
  };
};

export const sceneStates = (): readonly SceneState[] => SCENE_STATES;

export const simulateScene = (input: SceneSimulationInput = {}): SceneSimulation => {
  const seed = boundedSeed(input.seed);
  const steps = boundedSteps(input.steps);
  const branchCount = boundedBranches(input.branches);
  const branches = Array.from({ length: branchCount }, (_, branchIndex) =>
    branchFor(seed, branchIndex, steps)
  );
  const primary = branches[0];
  const startedAt = new Date().toISOString();

  return {
    id: `scene-${digest(`${seed}:${steps}:${branchCount}`)}`,
    seed,
    equation: EQUATION,
    states: primary.states,
    terminalState: primary.terminalState,
    trace: primary.trace,
    branches,
    branchCount,
    continuation: 'bounded-sample-of-infinite-potential',
    provenance: {
      source: 'local-simulation',
      ruleVersion: 'scene-equation.v2',
      deterministic: true,
      verified: false,
      note: 'Bounded symbolic perspectives only; this is not a claim about physical multiverses, cosmology, or consciousness.',
    },
    createdAt: startedAt,
  };
};
