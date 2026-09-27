/**
 * Ω∞v Dependency Map — read-only, evidence-bearing.
 *
 * Serves the workspace package dependency graph with evidence classification
 * so the UI can visualize which packages are:
 *   BUILT           = pnpm workspace + imported by apps/api
 *   WORKSPACE       = pnpm workspace, not imported by apps/api
 *   SOURCE-ONLY     = present on disk, not in pnpm-workspace.yaml
 *   STUB            = present on disk, not workspace, thin implementation
 *
 * This is NOT a claim of VERIFIED / DEPLOYED / HEALTHY.
 * Observed against tip 61b5fff + pnpm-workspace.yaml + apps/api/package.json
 * + apps/api/Dockerfile.
 */
import type { FastifyInstance } from 'fastify';

export type PackageClassification = 'BUILT' | 'WORKSPACE' | 'SOURCE-ONLY' | 'STUB';

export interface DependencyNode {
  name: string;
  package: string;
  classification: PackageClassification;
  specRole: string;
  dependsOn: string[];
  lines: number;
  workspaceActive: boolean;
  apiImported: boolean;
}

export interface DependencyMapResponse {
  success: true;
  contract: {
    name: string;
    version: string;
    schemaVersion: string;
    migrationStep: string;
    invariant: string;
    evaluatedAt: string;
    evidence: string;
  };
  nodes: DependencyNode[];
  summary: {
    built: number;
    workspace: number;
    sourceOnly: number;
    stub: number;
    total: number;
    lowestRiskPromotions: string[];
    blockedBySdk: string[];
    archiveCandidates: number;
  };
}

const ALL_PACKAGES: DependencyNode[] = [
  // ── BUILT: workspace + imported by apps/api ──
  { name: 'types', package: '@oceanicos/types', classification: 'BUILT', specRole: 'Shared contracts & validators', dependsOn: [], lines: 1232, workspaceActive: true, apiImported: true },
  { name: 'kernel', package: '@omega-v/kernel', classification: 'BUILT', specRole: 'Constitutional state machine', dependsOn: [], lines: 822, workspaceActive: true, apiImported: true },
  { name: 'observer', package: '@oceanicos/observer', classification: 'BUILT', specRole: 'Telemetry generation', dependsOn: ['@oceanicos/types'], lines: 418, workspaceActive: true, apiImported: true },
  { name: 'verification', package: '@oceanicos/verification', classification: 'BUILT', specRole: 'Rule evaluation, asymmetric signing', dependsOn: ['@oceanicos/types', '@oceanicos/observer'], lines: 748, workspaceActive: true, apiImported: true },
  { name: 'remember', package: '@oceanicos/remember', classification: 'BUILT', specRole: 'SQLite append-only hash chain', dependsOn: ['@oceanicos/types', '@oceanicos/verification'], lines: 648, workspaceActive: true, apiImported: true },
  { name: 'attestation', package: '@oceanicos/attestation', classification: 'BUILT', specRole: 'HMAC-SHA256 + Ed25519 signing', dependsOn: ['@oceanicos/types'], lines: 1085, workspaceActive: true, apiImported: true },
  { name: 'mini', package: '@oceanicos/mini', classification: 'BUILT', specRole: 'MINI kernel + admission + transition', dependsOn: ['@oceanicos/types', '@oceanicos/observer', '@oceanicos/verification', '@oceanicos/remember'], lines: 2677, workspaceActive: true, apiImported: true },
  { name: 'oreade', package: '@omega-v/oreade', classification: 'BUILT', specRole: 'ƆREADE symbolic translation', dependsOn: [], lines: 0, workspaceActive: true, apiImported: true },
  { name: 'mood', package: '@omega-v/mood', classification: 'BUILT', specRole: 'MOOD = experience context, not authority', dependsOn: [], lines: 371, workspaceActive: true, apiImported: true },

  // ── WORKSPACE: in pnpm-workspace.yaml, not imported by apps/api ──
  { name: 'gateway', package: '@omega-v/gateway', classification: 'WORKSPACE', specRole: 'Gateway', dependsOn: ['@oceanicos/types'], lines: 526, workspaceActive: true, apiImported: false },
  { name: 'coordination', package: '@omega-v/coordination', classification: 'WORKSPACE', specRole: 'Bounded workers and builders', dependsOn: [], lines: 335, workspaceActive: true, apiImported: false },
  { name: 'auth', package: '@omega-v/auth', classification: 'WORKSPACE', specRole: 'Auth / DID / capability tokens', dependsOn: ['@oceanicos/types'], lines: 408, workspaceActive: true, apiImported: false },
  { name: 'webhook', package: '@omega-v/webhook', classification: 'WORKSPACE', specRole: 'Webhook dispatcher', dependsOn: ['@oceanicos/types'], lines: 428, workspaceActive: true, apiImported: false },

  // ── SOURCE-ONLY: present on disk, not in pnpm-workspace.yaml ──
  { name: 'ir', package: '@omega-v/ir', classification: 'SOURCE-ONLY', specRole: 'ΩIR spec + verification VM', dependsOn: ['@omega-v/types'], lines: 395, workspaceActive: false, apiImported: false },
  { name: 'policy', package: '@omega-v/policy', classification: 'SOURCE-ONLY', specRole: 'POLICY = constraint', dependsOn: ['@omega-v/types', '@omega-v/sdk'], lines: 407, workspaceActive: false, apiImported: false },
  { name: 'worker', package: '@omega-v/worker', classification: 'SOURCE-ONLY', specRole: 'WORKER = bounded capability', dependsOn: ['@omega-v/types', '@omega-v/sdk'], lines: 699, workspaceActive: false, apiImported: false },
  { name: 'registry', package: '@omega-v/registry', classification: 'SOURCE-ONLY', specRole: 'Worker registry', dependsOn: ['@omega-v/types'], lines: 423, workspaceActive: false, apiImported: false },
  { name: 'compiler', package: '@omega-v/compiler', classification: 'SOURCE-ONLY', specRole: 'C1 deterministic compiler', dependsOn: ['@omega-v/types', '@omega-v/ir'], lines: 204, workspaceActive: false, apiImported: false },
  { name: 'sdk', package: '@omega-v/sdk', classification: 'SOURCE-ONLY', specRole: 'C9 SDK', dependsOn: ['@omega-v/types', '@omega-v/observer', '@omega-v/verification', '@omega-v/attestation', '@omega-v/store', '@omega-v/contract', '@omega-v/auth', '@omega-v/replay', '@omega-v/vaas', '@omega-v/federation', '@omega-v/remember', '@omega-v/mini'], lines: 3015, workspaceActive: false, apiImported: false },
  { name: 'cli', package: '@omega-v/cli', classification: 'SOURCE-ONLY', specRole: 'C9 CLI', dependsOn: ['@omega-v/types', '@omega-v/sdk', '@omega-v/agents', '@omega-v/edge', '@omega-v/analytics', '@omega-v/scheduler', '@omega-v/telemetry', '@omega-v/vaas', '@omega-v/remember', '@omega-v/mini'], lines: 5296, workspaceActive: false, apiImported: false },
  { name: 'evidence', package: '@omega-v/evidence', classification: 'SOURCE-ONLY', specRole: 'Evidence model', dependsOn: ['@omega-v/types'], lines: 146, workspaceActive: false, apiImported: false },
  { name: 'intent', package: '@omega-v/intent', classification: 'SOURCE-ONLY', specRole: 'Intent model', dependsOn: ['@omega-v/types'], lines: 378, workspaceActive: false, apiImported: false },
  { name: 'contract', package: '@omega-v/contract', classification: 'SOURCE-ONLY', specRole: 'Contract model', dependsOn: ['@omega-v/types'], lines: 576, workspaceActive: false, apiImported: false },
  { name: 'governance', package: '@omega-v/governance', classification: 'SOURCE-ONLY', specRole: 'Governance model', dependsOn: ['@omega-v/types'], lines: 166, workspaceActive: false, apiImported: false },
  { name: 'human', package: '@omega-v/human', classification: 'SOURCE-ONLY', specRole: 'Human authority', dependsOn: ['@omega-v/types'], lines: 85, workspaceActive: false, apiImported: false },
  { name: 'learning', package: '@omega-v/learning', classification: 'SOURCE-ONLY', specRole: 'Learning loop', dependsOn: ['@omega-v/types'], lines: 150, workspaceActive: false, apiImported: false },
  { name: 'evolution', package: '@omega-v/evolution', classification: 'SOURCE-ONLY', specRole: 'Evolution', dependsOn: ['@omega-v/types', '@omega-v/compiler'], lines: 161, workspaceActive: false, apiImported: false },
  { name: 'runtime', package: '@omega-v/runtime', classification: 'STUB', specRole: 'Runtime model', dependsOn: [], lines: 192, workspaceActive: false, apiImported: false },
  { name: 'graph', package: '@omega-v/graph', classification: 'SOURCE-ONLY', specRole: 'Relationship graph', dependsOn: ['@omega-v/types', '@omega-v/store'], lines: 273, workspaceActive: false, apiImported: false },
  { name: 'store', package: '@omega-v/store', classification: 'SOURCE-ONLY', specRole: 'State store', dependsOn: ['@omega-v/types'], lines: 344, workspaceActive: false, apiImported: false },
  { name: 'pipeline', package: '@omega-v/pipeline', classification: 'SOURCE-ONLY', specRole: 'Pipeline', dependsOn: ['@omega-v/types', '@omega-v/worker'], lines: 640, workspaceActive: false, apiImported: false },
  { name: 'security', package: '@omega-v/security', classification: 'SOURCE-ONLY', specRole: 'Security', dependsOn: ['@omega-v/types'], lines: 196, workspaceActive: false, apiImported: false },
  { name: 'sandbox', package: '@omega-v/sandbox', classification: 'SOURCE-ONLY', specRole: 'Sandbox', dependsOn: ['@omega-v/types', '@omega-v/sdk'], lines: 310, workspaceActive: false, apiImported: false },
  { name: 'scheduler', package: '@omega-v/scheduler', classification: 'SOURCE-ONLY', specRole: 'Scheduler', dependsOn: ['@omega-v/types', '@omega-v/sdk'], lines: 306, workspaceActive: false, apiImported: false },
  { name: 'telemetry', package: '@omega-v/telemetry', classification: 'SOURCE-ONLY', specRole: 'Telemetry', dependsOn: ['@omega-v/types'], lines: 266, workspaceActive: false, apiImported: false },
  { name: 'bridge', package: '@omega-v/bridge', classification: 'SOURCE-ONLY', specRole: 'Bridge', dependsOn: ['@omega-v/types'], lines: 383, workspaceActive: false, apiImported: false },
  { name: 'edge', package: '@omega-v/edge', classification: 'SOURCE-ONLY', specRole: 'Edge', dependsOn: ['@omega-v/types', '@omega-v/observer'], lines: 283, workspaceActive: false, apiImported: false },
  { name: 'analytics', package: '@omega-v/analytics', classification: 'SOURCE-ONLY', specRole: 'Analytics', dependsOn: ['@omega-v/types'], lines: 261, workspaceActive: false, apiImported: false },
  { name: 'benchmark', package: '@omega-v/benchmark', classification: 'SOURCE-ONLY', specRole: 'Benchmark', dependsOn: ['@omega-v/types', '@omega-v/sdk', '@omega-v/verification', '@omega-v/attestation'], lines: 373, workspaceActive: false, apiImported: false },
  { name: 'friction', package: '@omega-v/friction', classification: 'SOURCE-ONLY', specRole: 'Friction signal', dependsOn: ['@omega-v/types', '@omega-v/store'], lines: 251, workspaceActive: false, apiImported: false },
  { name: 'green', package: '@omega-v/green', classification: 'SOURCE-ONLY', specRole: 'Green / sustainability', dependsOn: ['@omega-v/types'], lines: 207, workspaceActive: false, apiImported: false },
  { name: 'lexicon', package: '@omega-v/lexicon', classification: 'STUB', specRole: 'Lexicon', dependsOn: [], lines: 332, workspaceActive: false, apiImported: false },
  { name: 'notary', package: '@omega-v/notary', classification: 'SOURCE-ONLY', specRole: 'Notary', dependsOn: ['@omega-v/types', '@omega-v/sdk'], lines: 344, workspaceActive: false, apiImported: false },
];

export function registerDependencyRoute(fastify: FastifyInstance): void {
  fastify.get('/v1/dependencies', async () => {
    const now = new Date().toISOString();

    const built = ALL_PACKAGES.filter((p) => p.classification === 'BUILT');
    const workspace = ALL_PACKAGES.filter((p) => p.classification === 'WORKSPACE');
    const sourceOnly = ALL_PACKAGES.filter((p) => p.classification === 'SOURCE-ONLY');
    const stub = ALL_PACKAGES.filter((p) => p.classification === 'STUB');

    const lowestRiskPromotions = sourceOnly
      .filter((p) => p.dependsOn.every((d) => d === '@omega-v/types' || d === '@oceanicos/types'))
      .map((p) => p.name);

    const blockedBySdk = sourceOnly
      .filter((p) => p.dependsOn.includes('@omega-v/sdk'))
      .map((p) => p.name);

    const response: DependencyMapResponse = {
      success: true,
      contract: {
        name: 'omega-v-oceanicos',
        version: '1.0.0',
        schemaVersion: '2',
        migrationStep: 'DEPENDENCY MAP reconciled to pnpm-workspace.yaml',
        invariant: 'PRESENT ≠ WORKSPACE ≠ IMPORTED ≠ VERIFIED',
        evaluatedAt: now,
        evidence: 'pnpm-workspace.yaml + apps/api/package.json + apps/api/Dockerfile at 61b5fff',
      },
      nodes: ALL_PACKAGES,
      summary: {
        built: built.length,
        workspace: workspace.length,
        sourceOnly: sourceOnly.length,
        stub: stub.length,
        total: ALL_PACKAGES.length,
        lowestRiskPromotions,
        blockedBySdk,
        archiveCandidates: 27,
      },
    };

    return response;
  });
}
