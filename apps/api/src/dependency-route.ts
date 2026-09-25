/**
 * Ω∞v Dependency Map — read-only, evidence-bearing.
 *
 * Serves the workspace package dependency graph with evidence classification
 * so the UI can visualize which packages are earned (BUILT) vs not-yet-earned
 * (SOURCE-ONLY / STUB) and the dependency edges between them.
 *
 * This is step 2 of the migration path: INVENTORY → DEPENDENCY MAP → CONTRACT MAP.
 */
import type { FastifyInstance } from 'fastify';

export type PackageClassification = 'BUILT' | 'SOURCE-ONLY' | 'STUB';

export interface DependencyNode {
  name: string;
  package: string;
  classification: PackageClassification;
  specRole: string;
  dependsOn: string[];
  lines: number;
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
  };
  nodes: DependencyNode[];
  summary: {
    built: number;
    sourceOnly: number;
    stub: number;
    total: number;
    lowestRiskPromotions: string[];
    blockedBySdk: string[];
    archiveCandidates: number;
  };
}

const ALL_PACKAGES: DependencyNode[] = [
  // ── BUILT (earned) ──
  { name: 'types', package: '@oceanicos/types', classification: 'BUILT', specRole: 'Shared contracts & validators', dependsOn: [], lines: 1232 },
  { name: 'kernel', package: '@omega-v/kernel', classification: 'BUILT', specRole: 'Constitutional state machine', dependsOn: [], lines: 822 },
  { name: 'ir', package: '@omega-v/ir', classification: 'BUILT', specRole: 'ΩIR spec + verification VM', dependsOn: ['@omega-v/types'], lines: 395 },
  { name: 'observer', package: '@oceanicos/observer', classification: 'BUILT', specRole: 'Telemetry generation', dependsOn: ['@oceanicos/types'], lines: 418 },
  { name: 'verification', package: '@oceanicos/verification', classification: 'BUILT', specRole: 'Rule evaluation, asymmetric signing', dependsOn: ['@oceanicos/types', '@oceanicos/observer'], lines: 748 },
  { name: 'remember', package: '@oceanicos/remember', classification: 'BUILT', specRole: 'SQLite append-only hash chain', dependsOn: ['@oceanicos/types', '@oceanicos/verification'], lines: 648 },
  { name: 'attestation', package: '@oceanicos/attestation', classification: 'BUILT', specRole: 'HMAC-SHA256 + Ed25519 signing', dependsOn: ['@oceanicos/types'], lines: 1085 },
  { name: 'mini', package: '@oceanicos/mini', classification: 'BUILT', specRole: 'MINI kernel + admission + transition', dependsOn: ['@oceanicos/types', '@oceanicos/observer', '@oceanicos/verification', '@oceanicos/remember'], lines: 2677 },

  // ── SOURCE-ONLY (spec-aligned) ──
  { name: 'policy', package: '@omega-v/policy', classification: 'SOURCE-ONLY', specRole: 'POLICY = constraint', dependsOn: ['@omega-v/types', '@omega-v/sdk'], lines: 407 },
  { name: 'worker', package: '@omega-v/worker', classification: 'SOURCE-ONLY', specRole: 'WORKER = bounded capability', dependsOn: ['@omega-v/types', '@omega-v/sdk'], lines: 699 },
  { name: 'registry', package: '@omega-v/registry', classification: 'SOURCE-ONLY', specRole: 'Worker registry', dependsOn: ['@omega-v/types'], lines: 423 },
  { name: 'compiler', package: '@omega-v/compiler', classification: 'SOURCE-ONLY', specRole: 'C1 deterministic compiler', dependsOn: ['@omega-v/types', '@omega-v/ir'], lines: 204 },
  { name: 'sdk', package: '@omega-v/sdk', classification: 'SOURCE-ONLY', specRole: 'C9 SDK', dependsOn: ['@omega-v/types', '@omega-v/observer', '@omega-v/verification', '@omega-v/attestation', '@omega-v/store', '@omega-v/contract', '@omega-v/auth', '@omega-v/replay', '@omega-v/vaas', '@omega-v/federation', '@omega-v/remember', '@omega-v/mini'], lines: 3015 },
  { name: 'cli', package: '@omega-v/cli', classification: 'SOURCE-ONLY', specRole: 'C9 CLI', dependsOn: ['@omega-v/types', '@omega-v/sdk', '@omega-v/agents', '@omega-v/edge', '@omega-v/analytics', '@omega-v/scheduler', '@omega-v/telemetry', '@omega-v/vaas', '@omega-v/remember', '@omega-v/mini'], lines: 5296 },
  { name: 'evidence', package: '@omega-v/evidence', classification: 'SOURCE-ONLY', specRole: 'Evidence model', dependsOn: ['@omega-v/types'], lines: 146 },
  { name: 'intent', package: '@omega-v/intent', classification: 'SOURCE-ONLY', specRole: 'Intent model', dependsOn: ['@omega-v/types'], lines: 378 },
  { name: 'contract', package: '@omega-v/contract', classification: 'SOURCE-ONLY', specRole: 'Contract model', dependsOn: ['@omega-v/types'], lines: 576 },
  { name: 'governance', package: '@omega-v/governance', classification: 'SOURCE-ONLY', specRole: 'Governance model', dependsOn: ['@omega-v/types'], lines: 166 },
  { name: 'human', package: '@omega-v/human', classification: 'SOURCE-ONLY', specRole: 'Human authority', dependsOn: ['@omega-v/types'], lines: 85 },
  { name: 'learning', package: '@omega-v/learning', classification: 'SOURCE-ONLY', specRole: 'Learning loop', dependsOn: ['@omega-v/types'], lines: 150 },
  { name: 'evolution', package: '@omega-v/evolution', classification: 'SOURCE-ONLY', specRole: 'Evolution', dependsOn: ['@omega-v/types', '@omega-v/compiler'], lines: 161 },
  { name: 'runtime', package: '@omega-v/runtime', classification: 'STUB', specRole: 'Runtime model', dependsOn: [], lines: 192 },
  { name: 'mood', package: '@omega-v/mood', classification: 'STUB', specRole: 'MOOD = experience', dependsOn: [], lines: 371 },
  { name: 'graph', package: '@omega-v/graph', classification: 'SOURCE-ONLY', specRole: 'Relationship graph', dependsOn: ['@omega-v/types', '@omega-v/store'], lines: 273 },
  { name: 'store', package: '@omega-v/store', classification: 'SOURCE-ONLY', specRole: 'State store', dependsOn: ['@omega-v/types'], lines: 344 },
  { name: 'pipeline', package: '@omega-v/pipeline', classification: 'SOURCE-ONLY', specRole: 'Pipeline', dependsOn: ['@omega-v/types', '@omega-v/worker'], lines: 640 },
  { name: 'security', package: '@omega-v/security', classification: 'SOURCE-ONLY', specRole: 'Security', dependsOn: ['@omega-v/types'], lines: 196 },
  { name: 'sandbox', package: '@omega-v/sandbox', classification: 'SOURCE-ONLY', specRole: 'Sandbox', dependsOn: ['@omega-v/types', '@omega-v/sdk'], lines: 310 },
  { name: 'scheduler', package: '@omega-v/scheduler', classification: 'SOURCE-ONLY', specRole: 'Scheduler', dependsOn: ['@omega-v/types', '@omega-v/sdk'], lines: 306 },
  { name: 'telemetry', package: '@omega-v/telemetry', classification: 'SOURCE-ONLY', specRole: 'Telemetry', dependsOn: ['@omega-v/types'], lines: 266 },
  { name: 'webhook', package: '@omega-v/webhook', classification: 'SOURCE-ONLY', specRole: 'Webhook', dependsOn: ['@omega-v/types'], lines: 428 },
  { name: 'gateway', package: '@omega-v/gateway', classification: 'SOURCE-ONLY', specRole: 'Gateway', dependsOn: ['@oceanicos/types'], lines: 526 },
  { name: 'bridge', package: '@omega-v/bridge', classification: 'SOURCE-ONLY', specRole: 'Bridge', dependsOn: ['@omega-v/types'], lines: 383 },
  { name: 'edge', package: '@omega-v/edge', classification: 'SOURCE-ONLY', specRole: 'Edge', dependsOn: ['@omega-v/types', '@omega-v/observer'], lines: 283 },
  { name: 'auth', package: '@omega-v/auth', classification: 'SOURCE-ONLY', specRole: 'Auth', dependsOn: ['@omega-v/types'], lines: 408 },
  { name: 'analytics', package: '@omega-v/analytics', classification: 'SOURCE-ONLY', specRole: 'Analytics', dependsOn: ['@omega-v/types'], lines: 261 },
  { name: 'benchmark', package: '@omega-v/benchmark', classification: 'SOURCE-ONLY', specRole: 'Benchmark', dependsOn: ['@omega-v/types', '@omega-v/sdk', '@omega-v/verification', '@omega-v/attestation'], lines: 373 },
  { name: 'friction', package: '@omega-v/friction', classification: 'SOURCE-ONLY', specRole: 'Friction signal', dependsOn: ['@omega-v/types', '@omega-v/store'], lines: 251 },
  { name: 'green', package: '@omega-v/green', classification: 'SOURCE-ONLY', specRole: 'Green / sustainability', dependsOn: ['@omega-v/types'], lines: 207 },
  { name: 'lexicon', package: '@omega-v/lexicon', classification: 'STUB', specRole: 'Lexicon', dependsOn: [], lines: 332 },
  { name: 'notary', package: '@omega-v/notary', classification: 'SOURCE-ONLY', specRole: 'Notary', dependsOn: ['@omega-v/types', '@omega-v/sdk'], lines: 344 },
];

export function registerDependencyRoute(fastify: FastifyInstance): void {
  fastify.get('/v1/dependencies', async () => {
    const now = new Date().toISOString();

    const built = ALL_PACKAGES.filter((p) => p.classification === 'BUILT');
    const sourceOnly = ALL_PACKAGES.filter((p) => p.classification === 'SOURCE-ONLY');
    const stub = ALL_PACKAGES.filter((p) => p.classification === 'STUB');

    // Lowest-risk: depend only on types (already built) and nothing source-only
    const lowestRiskPromotions = sourceOnly
      .filter((p) => p.dependsOn.every((d) => d === '@omega-v/types' || d === '@oceanicos/types'))
      .map((p) => p.name);

    // Blocked by sdk: depend on @omega-v/sdk
    const blockedBySdk = sourceOnly
      .filter((p) => p.dependsOn.includes('@omega-v/sdk'))
      .map((p) => p.name);

    const response: DependencyMapResponse = {
      success: true,
      contract: {
        name: 'omega-v-oceanicos',
        version: '1.0.0',
        schemaVersion: '1',
        migrationStep: 'DEPENDENCY MAP (step 2 of 5)',
        invariant: 'VERIFY(ΔREALITY)',
        evaluatedAt: now,
      },
      nodes: ALL_PACKAGES,
      summary: {
        built: built.length,
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
