export type SceneInput = {
  seed?: string;
  steps?: number;
  branches?: number;
};

export type ValidatedSceneInput = {
  seed?: string;
  steps?: number;
  branches?: number;
};

const MAX_SEED_LENGTH = 120;
const MAX_STEPS = 32;
const MAX_BRANCHES = 8;

/**
 * Validate and normalize the finite input surface shared by scene clients.
 * The simulation remains responsible for applying its own state-count bound.
 */
export const validateSceneInput = (input: SceneInput = {}): ValidatedSceneInput => {
  if (input.seed !== undefined && typeof input.seed !== 'string') {
    throw new Error('seed must be a string');
  }
  if (input.steps !== undefined && (!Number.isInteger(input.steps) || input.steps < 1 || input.steps > MAX_STEPS)) {
    throw new Error(`steps must be an integer between 1 and ${MAX_STEPS}`);
  }
  if (
    input.branches !== undefined &&
    (!Number.isInteger(input.branches) || input.branches < 1 || input.branches > MAX_BRANCHES)
  ) {
    throw new Error(`branches must be an integer between 1 and ${MAX_BRANCHES}`);
  }

  return {
    ...(input.seed !== undefined ? { seed: input.seed.trim().slice(0, MAX_SEED_LENGTH) } : {}),
    ...(input.steps !== undefined ? { steps: input.steps } : {}),
    ...(input.branches !== undefined ? { branches: input.branches } : {}),
  };
};
