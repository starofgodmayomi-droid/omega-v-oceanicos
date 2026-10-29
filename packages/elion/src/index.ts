/**
 * ELION — the Hands of Ω∞v Oceanicos (see ECOSYSTEM_BODY.md).
 *
 * Execution and orchestration come from the executor primitives implemented in
 * `@oceanicos/mini`; this package is the named entry point for them, not a
 * second implementation. ELION executes only transitions already recorded as
 * authorized, and reports what it executed. It does not grant authority and it
 * does not decide whether the result is real — that is OMEGA's judgment.
 */
export { advanceOmegaSourceState, compileOmegaIntent, normalizeOmegaSource } from '@oceanicos/mini';
export type { OmegaCompileInput } from '@oceanicos/mini';
export { executeAuthorizedTransition, runOmegaChangePipeline, resolveBoundedWorkerHandler } from '@oceanicos/mini';
export type {
  OmegaPipelineInput,
  OmegaPipelineResult,
  PipelineHaltReason,
  PipelineStage,
  TransitionExecution,
  TransitionExecutionStatus,
  TransitionExecutorOptions,
  TransitionHandler,
  TransitionMemory,
} from '@oceanicos/mini';
export { executeAdmittedConnector } from '@oceanicos/mini';
export type { ExecuteAdmittedConnectorInput } from '@oceanicos/mini';
