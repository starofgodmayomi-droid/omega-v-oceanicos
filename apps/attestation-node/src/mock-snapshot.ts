import type { KnowledgeNode, ReaEvidence, WholeMemoryMatrix } from "../../../packages/validation-rules/src/memory-contracts.ts";

const T0 = 1_730_000_000_000;

function node(
  partial: Pick<KnowledgeNode, "nodeId" | "conceptName" | "epistemicStatus" | "provenance"> &
    Partial<KnowledgeNode>,
): KnowledgeNode {
  return {
    targetModulePath: undefined,
    associatedDecisions: [],
    dependencies: [],
    blockers: [],
    ...partial,
  };
}

/**
 * Historical context for one cycle against omega-v-oceanicos.
 * Statuses are not interchangeable: remembered chat is not code evidence.
 */
export function historicalSnapshot(): WholeMemoryMatrix {
  return {
    snapshotId: "6b0e2c4a-8f31-4a6e-9c2d-0a1b2c3d4e5f",
    timestamp: T0,
    systemInvariantsPassed: true,
    nodes: [
      node({
        nodeId: "a1111111-1111-4111-8111-111111111111",
        conceptName: "Operator lineage",
        epistemicStatus: "REMEMBERED",
        provenance: {
          sourceLayer: "M1_PERSONAL",
          originUri: "memory://m1/starofgodmayomi-droid",
          lineageOwner: "starofgodmayomi-droid",
          timestamp: T0 - 86_400_000,
          confidence: 0.81,
          unresolvedGaps: ["Identity was not re-checked against a live session in this cycle."],
        },
        associatedDecisions: ["The public repository is the only write target."],
      }),
      node({
        nodeId: "a2222222-2222-4222-8222-222222222222",
        conceptName: "Conversation continuity",
        epistemicStatus: "REMEMBERED",
        provenance: {
          sourceLayer: "M2_CONVO",
          originUri: "memory://m2/whole-memory-request",
          lineageOwner: "starofgodmayomi-droid",
          timestamp: T0 - 3_600_000,
          confidence: 0.66,
          unresolvedGaps: ["Chat context is not implementation evidence."],
        },
        associatedDecisions: ["Build the 10-phase loop before claiming it runs."],
      }),
      node({
        nodeId: "a3333333-3333-4333-8333-333333333333",
        conceptName: "Inventory non-collapse",
        epistemicStatus: "KNOWN",
        provenance: {
          sourceLayer: "M4_DOCS",
          originUri:
            "https://github.com/starofgodmayomi-droid/omega-v-oceanicos/blob/main/docs/REPO_INVENTORY.md",
          lineageOwner: "omega-v-oceanicos",
          timestamp: T0 - 20 * 86_400_000,
          confidence: 0.98,
          unresolvedGaps: [],
        },
        associatedDecisions: ["A directory on disk is not a workspace member."],
        dependencies: ["pnpm-workspace.yaml", "docs/REPO_INVENTORY.md"],
      }),
      node({
        nodeId: "a4444444-4444-4444-8444-444444444444",
        conceptName: "Verification pipeline",
        epistemicStatus: "KNOWN",
        targetModulePath: ".github/workflows/verify.yml",
        provenance: {
          sourceLayer: "M5_EXEC",
          originUri:
            "https://github.com/starofgodmayomi-droid/omega-v-oceanicos/blob/main/.github/workflows/verify.yml",
          lineageOwner: "omega-v-oceanicos",
          timestamp: T0 - 5 * 86_400_000,
          confidence: 0.93,
          unresolvedGaps: [],
        },
        associatedDecisions: ["CI evidence is commit-scoped, not a deployment proof."],
      }),
      node({
        nodeId: "a5555555-5555-4555-8555-555555555555",
        conceptName: "Remember ledger integrity",
        epistemicStatus: "VERIFIED",
        targetModulePath: "packages/remember/src/index.ts",
        provenance: {
          sourceLayer: "M8_VERIFICATION",
          originUri: "packages/remember/src/index.ts#verifyChain",
          lineageOwner: "@oceanicos/remember",
          timestamp: T0 - 2 * 86_400_000,
          confidence: 0.99,
          unresolvedGaps: [],
        },
        associatedDecisions: ["Tamper fails closed. Observation of a row is not a tip."],
        dependencies: ["SHA-256 payload", "proof-of-work prefix"],
      }),
      node({
        nodeId: "a6666666-6666-4666-8666-666666666666",
        conceptName: "Whole Memory master engine",
        epistemicStatus: "PLANNED",
        targetModulePath: "apps/attestation-node/src/memory-engine.ts",
        provenance: {
          sourceLayer: "M3_ECOSYSTEM",
          originUri: "spec://whole-memory/10-phase",
          lineageOwner: "starofgodmayomi-droid",
          timestamp: T0,
          confidence: 0.94,
          unresolvedGaps: [],
        },
        associatedDecisions: [
          "One planned node per cycle.",
          "Never infer permissions.",
          "Missing REA evidence is not a pass.",
        ],
        dependencies: ["@oceanicos/validation-rules", "REA evidence bridge"],
        blockers: [],
      }),
    ],
  };
}

export const ENGINE_MODULE = "apps/attestation-node/src/memory-engine.ts";

export function cleanReaEvidence(): ReaEvidence {
  return {
    unknowns: [],
    tracedSymbols: [
      "WholeMemoryMasterEngine.executeEvolutionCycle",
      "verifyExplicitAuthority",
    ],
    injectionFindings: [],
  };
}

export type ScenarioId =
  | "clean"
  | "drift"
  | "unauthorized"
  | "blocked"
  | "malformed"
  | "idle";

export type Scenario = {
  id: ScenarioId;
  label: string;
  blurb: string;
};

export const SCENARIOS: Scenario[] = [
  {
    id: "clean",
    label: "Clean cycle",
    blurb: "Authorized plan, empty unknown set. One node may become verified.",
  },
  {
    id: "drift",
    label: "REA drift",
    blurb: "The inspector reports an untracked path. Claims cannot outrun evidence.",
  },
  {
    id: "unauthorized",
    label: "Low confidence",
    blurb: "Confidence at 0.90 is not authority. The cycle stops before implementation.",
  },
  {
    id: "blocked",
    label: "Open blocker",
    blurb: "A named hold is still attached. No inferred override.",
  },
  {
    id: "malformed",
    label: "Bad snapshot",
    blurb: "The matrix does not parse. Nothing after inspect is allowed to run.",
  },
  {
    id: "idle",
    label: "Nothing planned",
    blurb: "History is already known or verified. The state is held, not rewritten.",
  },
];

export function scenarioSnapshot(id: ScenarioId): unknown {
  const base = historicalSnapshot();
  if (id === "malformed") {
    return { ...base, snapshotId: "not-a-uuid", systemInvariantsPassed: "yes" };
  }
  if (id === "idle") {
    return {
      ...base,
      nodes: base.nodes.map((entry) =>
        entry.epistemicStatus === "PLANNED"
          ? { ...entry, epistemicStatus: "KNOWN" as const }
          : entry,
      ),
    };
  }
  if (id === "unauthorized" || id === "blocked") {
    return {
      ...base,
      nodes: base.nodes.map((entry) => {
        if (entry.epistemicStatus !== "PLANNED") return entry;
        if (id === "unauthorized") {
          return {
            ...entry,
            provenance: { ...entry.provenance, confidence: 0.9 },
          };
        }
        return { ...entry, blockers: ["Explicit human hold: do not promote this cycle."] };
      }),
    };
  }
  return base;
}
