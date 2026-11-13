import {
  EXPLICIT_AUTHORITY_CONFIDENCE,
  PIPELINE_PHASES,
  WholeMemoryMatrixSchema,
  type EvolutionReport,
  type KnowledgeNode,
  type PhaseLog,
  type PhaseName,
  type ProjectLedger,
  type ReaBridge,
  type ReaEvidence,
  type WholeMemoryMatrix,
} from "../../../packages/validation-rules/src/memory-contracts.ts";
import { ENGINE_MODULE, cleanReaEvidence } from "./mock-snapshot.ts";

export const INVARIANT = "W_{t+1} = VerifiedEvolution(W_t)" as const;

/** FNV-1a. Stable across browser and Node, no shell, no secret. */
export function traceHash(value: unknown): string {
  const text = JSON.stringify(value);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function defaultReaBridge(modulePath: string): ReaEvidence {
  if (modulePath === ENGINE_MODULE) return cleanReaEvidence();
  return {
    unknowns: [`unregistered module path: ${modulePath}`],
    tracedSymbols: [],
    injectionFindings: [],
  };
}

function ledgerFrom(matrix: WholeMemoryMatrix): ProjectLedger {
  const openTasks = matrix.nodes
    .filter((entry) => entry.epistemicStatus === "PLANNED")
    .map((entry) => entry.nodeId);
  const completedTasks = matrix.nodes
    .filter((entry) => entry.epistemicStatus === "VERIFIED")
    .map((entry) => entry.nodeId);
  return { completedTasks, openTasks, verificationEvidence: {} };
}

function skipAfter(failed: PhaseName, detailForFail: string): PhaseLog[] {
  const start = PIPELINE_PHASES.indexOf(failed);
  return PIPELINE_PHASES.map((phase, index) => {
    if (index < start) {
      return { phase, status: "pass" as const, detail: "Passed before the halt." };
    }
    if (index === start) {
      return { phase, status: "fail" as const, detail: detailForFail };
    }
    return { phase, status: "skip" as const, detail: "Not reached. Fail closed." };
  });
}

function refuse(
  previous: unknown,
  ledger: ProjectLedger,
  failed: PhaseName,
  reason: string,
  earlier?: PhaseLog[],
): EvolutionReport {
  const log = earlier ?? skipAfter(failed, reason);
  return {
    accepted: false,
    invariant: INVARIANT,
    failClosedReason: reason,
    log,
    previousHash: traceHash(previous),
    nextHash: null,
    promotedNodeId: null,
    ledger,
    nextMatrix: null,
  };
}

function explicitAuthority(node: KnowledgeNode): string | null {
  if (node.provenance.confidence <= EXPLICIT_AUTHORITY_CONFIDENCE) {
    return `Confidence ${node.provenance.confidence.toFixed(2)} is not above ${EXPLICIT_AUTHORITY_CONFIDENCE.toFixed(2)}. Authority is not inferred.`;
  }
  if (node.blockers.length > 0) {
    return `Open blocker: ${node.blockers.join("; ")}`;
  }
  if (!node.targetModulePath) {
    return "Planned node has no target module path.";
  }
  return null;
}

/**
 * RETRIEVE → INSPECT → RECONCILE → PLAN → AUTHORIZE
 * → IMPLEMENT → TEST → VERIFY → DOCUMENT → EVOLVE
 *
 * Absence of REA evidence is a refusal. The bridge is data in, never a shell.
 */
export function executeEvolutionCycle(
  rawMemorySnapshot: unknown,
  rea: ReaBridge = defaultReaBridge,
  now: number = Date.now(),
): EvolutionReport {
  const emptyLedger: ProjectLedger = {
    completedTasks: [],
    openTasks: [],
    verificationEvidence: {},
  };

  const parsed = WholeMemoryMatrixSchema.safeParse(rawMemorySnapshot);
  if (!parsed.success) {
    const reason = parsed.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join(".") || "snapshot"}: ${issue.message}`)
      .join(" · ");
    return refuse(rawMemorySnapshot, emptyLedger, "INSPECT", `Schema refused the snapshot. ${reason}`, [
      { phase: "RETRIEVE", status: "pass", detail: "Raw snapshot received." },
      { phase: "INSPECT", status: "fail", detail: `Schema refused the snapshot. ${reason}` },
      ...PIPELINE_PHASES.slice(2).map((phase) => ({
        phase,
        status: "skip" as const,
        detail: "Not reached. Fail closed.",
      })),
    ]);
  }

  const matrix = parsed.data;
  const ledger = ledgerFrom(matrix);
  const previousHash = traceHash(matrix);

  if (!matrix.systemInvariantsPassed) {
    return refuse(matrix, ledger, "INSPECT", "systemInvariantsPassed is false.", [
      { phase: "RETRIEVE", status: "pass", detail: `Snapshot ${matrix.snapshotId} retrieved.` },
      {
        phase: "INSPECT",
        status: "fail",
        detail: "systemInvariantsPassed is false.",
      },
      ...PIPELINE_PHASES.slice(2).map((phase) => ({
        phase,
        status: "skip" as const,
        detail: "Not reached. Fail closed.",
      })),
    ]);
  }

  const planned = matrix.nodes.filter((entry) => entry.epistemicStatus === "PLANNED");
  if (planned.length === 0) {
    const log: PhaseLog[] = PIPELINE_PHASES.map((phase) => ({
      phase,
      status: "pass",
      detail:
        phase === "RECONCILE"
          ? "No planned node. Nothing to promote."
          : phase === "EVOLVE"
            ? "State held. W_t+1 is W_t."
            : "No unresolved planned component.",
    }));
    return {
      accepted: true,
      invariant: INVARIANT,
      failClosedReason: null,
      log,
      previousHash,
      nextHash: previousHash,
      promotedNodeId: null,
      ledger,
      nextMatrix: matrix,
    };
  }

  const target = planned[0];
  if (!target) {
    return refuse(matrix, ledger, "RECONCILE", "Planned set disappeared during reconcile.");
  }

  const authorityFailure = explicitAuthority(target);
  const pathFailure = authorityFailure?.includes("target module") ?? false;
  if (pathFailure) {
    return refuse(matrix, ledger, "PLAN", authorityFailure ?? "Missing target path.");
  }
  if (authorityFailure) {
    return refuse(matrix, ledger, "AUTHORIZE", authorityFailure);
  }

  const modulePath = target.targetModulePath ?? "";
  let evidence: ReaEvidence;
  try {
    evidence = rea(modulePath);
  } catch (error) {
    const message = error instanceof Error ? error.message : "REA bridge threw.";
    return refuse(
      matrix,
      ledger,
      "VERIFY",
      `REA bridge failed closed: ${message}`,
    );
  }

  if (!evidence || !Array.isArray(evidence.unknowns) || !Array.isArray(evidence.injectionFindings)) {
    return refuse(matrix, ledger, "VERIFY", "REA evidence object is incomplete.");
  }
  if (evidence.injectionFindings.length > 0) {
    return refuse(
      matrix,
      ledger,
      "VERIFY",
      `Injection findings: ${evidence.injectionFindings.join("; ")}`,
    );
  }
  if (evidence.unknowns.length > 0) {
    return refuse(
      matrix,
      ledger,
      "VERIFY",
      `Claims exceed verified evidence. Unknowns: ${evidence.unknowns.join("; ")}`,
    );
  }

  const promoted: KnowledgeNode = {
    ...target,
    epistemicStatus: "VERIFIED",
    provenance: {
      ...target.provenance,
      sourceLayer: "M8_VERIFICATION",
      confidence: 1,
      unresolvedGaps: [],
      timestamp: now,
      originUri: `rea://${modulePath}`,
    },
  };

  const nextMatrix: WholeMemoryMatrix = {
    ...matrix,
    timestamp: now,
    systemInvariantsPassed: true,
    nodes: matrix.nodes.map((entry) => (entry.nodeId === target.nodeId ? promoted : entry)),
  };

  const nextLedger: ProjectLedger = {
    completedTasks: [...ledger.completedTasks, target.nodeId],
    openTasks: ledger.openTasks.filter((id) => id !== target.nodeId),
    verificationEvidence: {
      ...ledger.verificationEvidence,
      [target.nodeId]: {
        timestamp: now,
        status: "VERIFIED_BY_REA_INVARIANT_PROOFS",
        conceptName: target.conceptName,
        modulePath,
        tracedSymbols: evidence.tracedSymbols,
      },
    },
  };

  const log: PhaseLog[] = [
    {
      phase: "RETRIEVE",
      status: "pass",
      detail: `Ingested ${matrix.nodes.length} nodes from ${matrix.snapshotId}.`,
    },
    {
      phase: "INSPECT",
      status: "pass",
      detail: "Schema and systemInvariantsPassed both held.",
    },
    {
      phase: "RECONCILE",
      status: "pass",
      detail: `Planned target: ${target.conceptName}. ${planned.length - 1} left queued.`,
    },
    {
      phase: "PLAN",
      status: "pass",
      detail: `Target path ${modulePath}.`,
    },
    {
      phase: "AUTHORIZE",
      status: "pass",
      detail: `Explicit authority. Confidence ${target.provenance.confidence.toFixed(2)}, blockers 0.`,
    },
    {
      phase: "IMPLEMENT",
      status: "pass",
      detail: "Promotion staged in memory. Disk outside this cycle was not touched.",
    },
    {
      phase: "TEST",
      status: "pass",
      detail: "Local invariant checks passed before REA.",
    },
    {
      phase: "VERIFY",
      status: "pass",
      detail: `REA traced ${evidence.tracedSymbols.length} symbols. Unknowns 0.`,
    },
    {
      phase: "DOCUMENT",
      status: "pass",
      detail: "Ledger recorded VERIFIED_BY_REA_INVARIANT_PROOFS.",
    },
    {
      phase: "EVOLVE",
      status: "pass",
      detail: `${target.conceptName} moved PLANNED → VERIFIED.`,
    },
  ];

  return {
    accepted: true,
    invariant: INVARIANT,
    failClosedReason: null,
    log,
    previousHash,
    nextHash: traceHash(nextMatrix),
    promotedNodeId: target.nodeId,
    ledger: nextLedger,
    nextMatrix,
  };
}
