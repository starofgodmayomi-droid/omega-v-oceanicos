import { z } from "zod";

/** Epistemic state under the master memory law. Planned is not implemented. */
export const EpistemicStatusSchema = z.enum([
  "KNOWN",
  "REMEMBERED",
  "PLANNED",
  "VERIFIED",
]);

export const SourceLayerSchema = z.enum([
  "M1_PERSONAL",
  "M2_CONVO",
  "M3_ECOSYSTEM",
  "M4_DOCS",
  "M5_EXEC",
  "M6_BRAND",
  "M7_CONNECTED",
  "M8_VERIFICATION",
]);

export const ProvenanceMetadataSchema = z.object({
  sourceLayer: SourceLayerSchema,
  originUri: z.string().min(1),
  lineageOwner: z.string().min(1),
  timestamp: z.number().finite(),
  confidence: z.number().min(0).max(1),
  unresolvedGaps: z.array(z.string()),
});

export const KnowledgeNodeSchema = z.object({
  nodeId: z.string().uuid(),
  conceptName: z.string().min(1),
  targetModulePath: z.string().min(1).optional(),
  epistemicStatus: EpistemicStatusSchema,
  provenance: ProvenanceMetadataSchema,
  associatedDecisions: z.array(z.string()),
  dependencies: z.array(z.string()),
  blockers: z.array(z.string()),
});

export const WholeMemoryMatrixSchema = z.object({
  snapshotId: z.string().uuid(),
  timestamp: z.number().finite(),
  nodes: z.array(KnowledgeNodeSchema),
  systemInvariantsPassed: z.boolean(),
});

export type EpistemicStatus = z.infer<typeof EpistemicStatusSchema>;
export type SourceLayer = z.infer<typeof SourceLayerSchema>;
export type ProvenanceMetadata = z.infer<typeof ProvenanceMetadataSchema>;
export type KnowledgeNode = z.infer<typeof KnowledgeNodeSchema>;
export type WholeMemoryMatrix = z.infer<typeof WholeMemoryMatrixSchema>;

/** Strictly above this. 0.90 is not authority. */
export const EXPLICIT_AUTHORITY_CONFIDENCE = 0.9;

export const PIPELINE_PHASES = [
  "RETRIEVE",
  "INSPECT",
  "RECONCILE",
  "PLAN",
  "AUTHORIZE",
  "IMPLEMENT",
  "TEST",
  "VERIFY",
  "DOCUMENT",
  "EVOLVE",
] as const;

export type PhaseName = (typeof PIPELINE_PHASES)[number];

export type PhaseLog = {
  phase: PhaseName;
  status: "pass" | "fail" | "skip";
  detail: string;
};

export type VerificationEvidence = {
  timestamp: number;
  status: "VERIFIED_BY_REA_INVARIANT_PROOFS";
  conceptName: string;
  modulePath: string;
  tracedSymbols: string[];
};

export type ProjectLedger = {
  completedTasks: string[];
  openTasks: string[];
  verificationEvidence: Record<string, VerificationEvidence>;
};

export type ReaEvidence = {
  unknowns: string[];
  tracedSymbols: string[];
  injectionFindings: string[];
};

/** Injected inspector. The engine never shells out. */
export type ReaBridge = (modulePath: string) => ReaEvidence;

export type EvolutionReport = {
  accepted: boolean;
  invariant: "W_{t+1} = VerifiedEvolution(W_t)";
  failClosedReason: string | null;
  log: PhaseLog[];
  previousHash: string;
  nextHash: string | null;
  promotedNodeId: string | null;
  ledger: ProjectLedger;
  nextMatrix: WholeMemoryMatrix | null;
};
