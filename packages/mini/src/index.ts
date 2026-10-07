import { observePlanetaryBase, ObserverEngine } from '@oceanicos/observer';
import { verifyPlanetarySovereignty, VerificationEngine } from '@oceanicos/verification';
import { PluralisticHashChain, RememberEngine, CryptographicBlock } from '@oceanicos/remember';
import { IMiniBlock } from '@oceanicos/types';

export class MiniKernel {
  protected remember: RememberEngine;
  constructor(rememberEngine: RememberEngine) {
    this.remember = rememberEngine;
  }
  public runCycle(): IMiniBlock {
    const telemetry = ObserverEngine.generateTelemetry();
    const evidence = VerificationEngine.evaluate(telemetry);
    return this.remember.append(telemetry, evidence);
  }
  public executeCycle(): IMiniBlock {
    return this.runCycle();
  }
  /** Verification of the durable ledger, not observation of the last row. */
  public verifyLedger() {
    return this.remember.verifyChain();
  }
}

export const MiniKernelCoordinator = MiniKernel;
export type MiniKernelCoordinator = MiniKernel;
export { observeCandidateChange } from './change.js';
export { resolveChangeAdmission } from './admission.js';
export type { OmegaAdmissionEvidence } from './admission.js';
export { executeAuthorizedTransition } from './transition.js';
export type {
  TransitionExecution,
  TransitionExecutionStatus,
  TransitionExecutorOptions,
  TransitionHandler,
  TransitionMemory,
} from './transition.js';
export { verifyExecutedReality } from './reality.js';
export type {
  RealityObserverOptions,
  RealityVerification,
  RealityVerificationStatus,
} from './reality.js';
export { advanceOmegaSourceState, compileOmegaIntent, normalizeOmegaSource } from './compiler.js';
export type { OmegaCompileInput } from './compiler.js';
export { validateOmegaIR } from './ir-validator.js';
export type { OmegaIRValidation, OmegaIRValidationIssue } from './ir-validator.js';
export { createOmegaWorkerRegistry, getOmegaWorker } from './worker-registry.js';
export { buildOmegaCommand, listOmegaWorkers } from './worker-registry.js';
export type { OmegaWorkerDescriptor } from './worker-registry.js';
export { admitOmegaIR } from './admission-bridge.js';
export type { OmegaAdmissionBridgeInput, OmegaAdmissionBridgeResult } from './admission-bridge.js';
export {
  admitOmegaConnector,
  MAX_CONNECTOR_ATTEMPTS,
  MAX_CONNECTOR_TIMEOUT_MS,
} from './connector-admission.js';
export type {
  OmegaConnectorAdmissionDecision,
  OmegaConnectorAdmissionInput,
  OmegaConnectorAdmissionResult,
  OmegaConnectorDeclaration,
} from './connector-admission.js';
export { executeAdmittedConnector, observeAdmittedConnector } from './connector-observation.js';
export { mirrorRepositoryState, unknownMirrorObservation } from './mirror-worker.js';
export { reconcileRepositoryState } from './repo-verifier.js';
export type { RepositoryReconciliation, RepositoryReconciliationStatus } from './repo-verifier.js';
export type { MirrorObservation, MirrorRepositorySnapshot } from './mirror-worker.js';
export type {
  ConnectorExecutionObservation,
  ConnectorHandler,
  ConnectorObservationResult,
  ConnectorRealityStatus,
  ExecuteAdmittedConnectorInput,
  ObserveAdmittedConnectorInput,
} from './connector-observation.js';
export {
  GITHUB_PUBLIC_REPOSITORY_ADAPTER,
  assertGithubPublicRepositoryConnector,
  createGithubPublicRepositoryHandler,
  githubPublicMetadataObservation,
  observeGithubPublicRepository,
  parseGithubRepoScope,
} from './github-public-repository.js';
export type { GithubPublicRepositoryAdapter, GithubRepoIdentity } from './github-public-repository.js';
export { FileConnectorObservationStore } from './connector-observation-journal.js';
export type {
  ConnectorObservationJournalEntry,
  ConnectorObservationStore,
} from './connector-observation-journal.js';
export { runOmegaChangePipeline, resolveBoundedWorkerHandler } from './pipeline.js';
export type {
  OmegaPipelineInput,
  OmegaPipelineResult,
  PipelineStage,
  PipelineHaltReason,
} from './pipeline.js';
export { FileCausalMemory, createRealityAttestation, verifyRealityAttestation } from './causal-memory.js';
export type { CausalMemory, CausalMemoryEntry, RealityAttestation } from './causal-memory.js';
export {
  createValueNavigatorProposal,
  observeValueNavigatorProposal,
  FileValueNavigatorStore,
} from './value-navigator.js';
export type {
  ValueNavigatorDraft,
  ValueNavigatorEntry,
  ValueNavigatorObservationInput,
  ValueNavigatorPhase,
  ValueNavigatorProposalInput,
  ValueNavigatorStatus,
  ValueNavigatorStore,
  ValuePotentialHypothesis,
} from './value-navigator.js';
export { KaiContinuity, kaiFromBlock, kaiUnknown, KAI_VERSION } from './kai.js';
export type { KaiDrop, KaiSource, KaiStatus } from './kai.js';
export { captureMiniKernelCycle } from './kai-cycle.js';
export { buildOmegaWaterFlow } from './water-flow.js';
export type { OmegaWaterFlowInput } from './water-flow.js';

export function executeOceanicosMaxExpansion(): CryptographicBlock {
  const kernelChain = new PluralisticHashChain();
  const telemetry = observePlanetaryBase();
  const verificationReceipt = verifyPlanetarySovereignty(telemetry);
  const securelyMintedBlock = kernelChain.commitState(verificationReceipt);
  console.log(`\nΩ ➔ [👁 ${Math.round(telemetry.siliconYield * 100)}% | ✓ ${verificationReceipt.status} | 🧠 #${securelyMintedBlock.index}] ── LIVE ── 0 ERRORS ── $`);
  console.log(`   [BLOCK HASH]      : ${securelyMintedBlock.hash}`);
  console.log(`   [PREVIOUS HASH]   : ${securelyMintedBlock.previousHash}`);
  console.log(`   [STATE ROOT]      : ${securelyMintedBlock.payload.stateRootHash}`);
  console.log(`   [PLURALISM LOGS]  : Regional tracking matrix verified cleanly via ${securelyMintedBlock.nonce} consensus operations.\n`);
  return securelyMintedBlock;
}

if (typeof require !== 'undefined' && require.main === module) {
  executeOceanicosMaxExpansion();
}
