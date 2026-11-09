/**
 * Ω∞v Notion Surfaces Route — exposes the 7-surface Notion universe
 * and connected domains registry through the API.
 *
 * Returns the status of all 7 canonical Notion surfaces (4 master pages +
 * 2 relational databases + 1 meta companion index), the Composio tool bridge configuration,
 * and the ecosystem workspace layout.
 *
 * 4-Quadrant Master Pages:
 *   1. AI SOUL MASTER COMMAND CENTER    — Prompt router, Truth Weaver nexus
 *   2. OceanicOS Living Universe Blueprint — Metaphysical architecture, 11 layers
 *   3. OceanicOS GitHub↔Notion Map       — Codebase bi-directional mirror
 *   4. OCEANICOS MOTION Wealth Engine    — Treasury & gold ledger
 *
 * 2 Relational Databases:
 *   5. Value Opportunities Pipeline      — Deal flow & scoring
 *   6. Execution Queue                   — Task orchestration
 *
 * 1 Meta Companion Index:
 *   7. OCEANICOS Single Full-Stack Body Companion Index — 14 docs + Rooms 00–09
 */
import type { FastifyInstance } from 'fastify';

export interface NotionSurfaceStatus {
  name: string;
  uuid: string;
  url: string;
  role: string;
  quadrant: string;
  connected: boolean;
  tokenConfigured: boolean;
}

export interface NotionWorkspaceSection {
  name: string;
  status: 'CONFIGURED' | 'PROPOSED' | 'BLOCKED';
  evidence: string;
}

export interface NotionSurfacesResponse {
  success: true;
  token: { configured: boolean; source: string };
  surfaces: NotionSurfaceStatus[];
  workspaceSections: NotionWorkspaceSection[];
  composioBridge: {
    configured: boolean;
    apiKeyPresent: boolean;
    status: string;
  };
  evaluatedAt: string;
}

const SURFACE_DEFS = [
  // ── 4-Quadrant Master Pages ──────────────────────────────────────
  {
    name: 'AI SOUL MASTER COMMAND CENTER',
    envKey: 'NOTION_SOUL_PAGE_ID',
    defaultUuid: '33949ca4-35a2-81a8-9c83-ca074966bbfa',
    url: 'https://app.notion.com/p/AI-SOUL-MASTER-COMMAND-CENTER-33949ca435a281a89c83ca074966bbfa',
    role: 'Prompt router, Truth Weaver nexus, AI soul orchestration',
    quadrant: 'Q1_SOUL',
  },
  {
    name: 'OceanicOS Living Universe Master Blueprint',
    envKey: 'NOTION_BLUEPRINT_PAGE_ID',
    defaultUuid: '4003080b-dd53-8153-b957-c6bdb9417958',
    url: 'https://app.notion.com/p/OceanicOS-Living-Universe-Master-Blueprint-4003080bdd538153b957c6bdb9417958',
    role: 'Metaphysical architecture, 11 topological layers, living universe map',
    quadrant: 'Q2_UNIVERSE',
  },
  {
    name: 'OceanicOS GitHub to Notion Architecture Map',
    envKey: 'NOTION_ARCHITECTURE_PAGE_ID',
    defaultUuid: '4003080b-dd53-8142-a075-c9da63c46c70',
    url: 'https://app.notion.com/p/OceanicOS-GitHub-to-Notion-Architecture-Map-4003080bdd538142a075c9da63c46c70',
    role: 'Codebase-to-Notion bi-directional mirror, repo structure map',
    quadrant: 'Q3_ARCHITECTURE',
  },
  {
    name: 'OCEANICOS MOTION Private Wealth Execution Engine',
    envKey: 'NOTION_PAGE_ID',
    defaultUuid: '4003080b-dd53-8159-8220-ef09061f54b7',
    url: 'https://app.notion.com/p/OCEANICOS-MOTION-Private-Wealth-Execution-Engine-4003080bdd5381598220ef09061f54b7',
    role: 'Canonical control plane — decisions, daily command, treasury & gold ledger',
    quadrant: 'Q4_WEALTH',
  },
  // ── 2 Relational Operational Databases ───────────────────────────
  {
    name: 'Value Opportunities Pipeline',
    envKey: 'NOTION_OPPORTUNITIES_DB_ID',
    defaultUuid: 'baf1877d-e979-4cd8-949e-6c48cdee4c7a',
    url: 'https://app.notion.com/p/baf1877de9794cd8949e6c48cdee4c7a',
    role: 'Tracks buyer, problem, offer, stage, score, next action, review date, evidence',
    quadrant: 'DB_PIPELINE',
  },
  {
    name: 'Execution Queue',
    envKey: 'NOTION_EXECUTION_DB_ID',
    defaultUuid: '75b1967f-fb19-47fc-8f5a-db1298fe8f02',
    url: 'https://app.notion.com/p/75b1967ffb1947fc8f5adb1298fe8f02',
    role: 'Tracks task priority, dependencies, approvals, status, output, test receipts',
    quadrant: 'DB_EXECUTION',
  },
  // ── 1 Meta Companion Index ───────────────────────────────────────
  {
    name: 'OCEANICOS Single Full-Stack Body Companion Index',
    envKey: 'NOTION_COMPANION_INDEX_PAGE_ID',
    defaultUuid: '40749ca4-35a2-815f-b2c8-d7bf15925cce',
    url: 'https://app.notion.com/p/OCEANICOS-SINGLE-FULL-STACK-BODY-Max-Compression-2026-10-28-40749ca435a2815fb2c8d7bf15925cce?pvs=21',
    role: 'Master companion index synthesizing 14 foundational Notion docs and Rooms 00–09',
    quadrant: 'META_COMPANION',
  },
];

const WORKSPACE_SECTIONS: NotionWorkspaceSection[] = [
  { name: 'Ecosystem control center', status: 'CONFIGURED', evidence: 'Master Motion Control Page configured' },
  { name: 'Architecture and product roadmap', status: 'CONFIGURED', evidence: 'docs/ROADMAP.md + Notion page' },
  { name: 'Projects and execution queue', status: 'CONFIGURED', evidence: 'Execution Queue DB configured' },
  { name: 'Repository and integration registry', status: 'CONFIGURED', evidence: 'GitHub repo + Composio placeholder' },
  { name: 'Knowledge and decision records', status: 'PROPOSED', evidence: 'Notion-side knowledge base not yet structured' },
  { name: 'Verification and evidence ledger', status: 'CONFIGURED', evidence: 'notion-evidence-sync.mjs, 15/15 tests pass' },
  { name: 'Business opportunities and product experiments', status: 'CONFIGURED', evidence: 'Value Opportunities Pipeline DB configured' },
  { name: 'Metrics, revenue tracking, and asset development', status: 'PROPOSED', evidence: 'Revenue = $0; metrics tracking proposed' },
  { name: 'Risks, permissions, dependencies, and unresolved questions', status: 'PROPOSED', evidence: 'Risk registry not yet implemented in Notion' },
];

export function registerNotionSurfacesRoute(fastify: FastifyInstance): void {
  fastify.get('/v1/notion/surfaces', async () => {
    const now = new Date().toISOString();
    const notionToken = process.env.NOTION_TOKEN?.trim() ?? '';
    const composioKey = process.env.COMPOSIO_API_KEY?.trim() ?? '';
    const tokenConfigured = notionToken.length > 0;

    const surfaces: NotionSurfaceStatus[] = SURFACE_DEFS.map(def => {
      const uuid = process.env[def.envKey]?.trim() || def.defaultUuid;
      return {
        name: def.name,
        uuid,
        url: def.url,
        role: def.role,
        quadrant: def.quadrant,
        connected: tokenConfigured,
        tokenConfigured,
      };
    });

    const response: NotionSurfacesResponse = {
      success: true,
      token: {
        configured: tokenConfigured,
        source: tokenConfigured ? 'environment' : 'not-configured',
      },
      surfaces,
      workspaceSections: WORKSPACE_SECTIONS,
      composioBridge: {
        configured: composioKey.length > 0,
        apiKeyPresent: composioKey.length > 0,
        status: composioKey.length > 0 ? 'ready' : 'not-configured',
      },
      evaluatedAt: now,
    };

    return response;
  });
}
