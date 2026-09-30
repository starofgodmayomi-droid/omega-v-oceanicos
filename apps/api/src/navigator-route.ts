import type { FastifyInstance } from 'fastify';
import type {
  NavigatorEvidenceItem,
  NavigatorEvidenceSnapshot,
  NavigatorEvidenceSource,
} from '@oceanicos/types';

const CONTRACT = 'omega-navigator-evidence.v1' as const;
const LOCATOR = 'apps/api/src/navigator-route.ts';

function sourceAt(observedAt: string): NavigatorEvidenceSource {
  return {
    repository:
      process.env.OMEGA_SOURCE_REPOSITORY?.trim() ||
      'starofgodmayomi-droid/omega-v-oceanicos',
    commit: process.env.OMEGA_SOURCE_COMMIT?.trim() || 'unknown',
    branch: process.env.OMEGA_SOURCE_BRANCH?.trim() || 'unknown',
    observedAt,
    locator: LOCATOR,
  };
}

export function buildNavigatorEvidenceSnapshot(now = new Date().toISOString()): NavigatorEvidenceSnapshot {
  const source = sourceAt(now);
  const evidence: NavigatorEvidenceItem[] = [
    {
      id: 'omega-api-contract-v1',
      status: 'SUPPORTED',
      claim: 'The Omega API exposes a versioned read-only evidence snapshot for presentation consumers.',
      observedAt: now,
      source,
      policyVersion: 'navigator-display.v1',
      limitations: [
        'This is source/runtime contract evidence, not proof of a deployed target.',
      ],
    },
    {
      id: 'omega-github-system-of-record',
      status: 'SUPPORTED',
      claim: 'starofgodmayomi-droid/omega-v-oceanicos is the implementation system of record for Navigator evidence IDs.',
      observedAt: now,
      source,
      policyVersion: 'navigator-display.v1',
      limitations: [
        'A repository listing is not deployment, health, or authorization.',
      ],
    },
    {
      id: 'omega-deployment-observation',
      status: 'UNKNOWN',
      claim: 'A deployed Omega target and its external health have not been observed by this local API process.',
      observedAt: now,
      source,
      policyVersion: 'navigator-display.v1',
      limitations: [
        'No deployment, cloud, edge, or device health is inferred from local execution.',
      ],
    },
  ];

  return {
    contract: CONTRACT,
    generatedAt: now,
    source,
    overallStatus: 'SUPPORTED',
    evidence,
    readOnly: true,
  };
}

export function registerNavigatorEvidenceRoute(fastify: FastifyInstance): void {
  fastify.get('/v1/navigator/evidence', async () => buildNavigatorEvidenceSnapshot());
}
