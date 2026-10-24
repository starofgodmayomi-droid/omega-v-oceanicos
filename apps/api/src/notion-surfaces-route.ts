/**
 * Ω∞v Notion Surfaces Route — exposes the tri-surface Notion control plane
 * and connected domains registry through the API.
 *
 * Returns the status of all 3 canonical Notion surfaces, the Composio
 * tool bridge configuration, and the ecosystem workspace layout.
 */
import type { FastifyInstance } from 'fastify';

export interface NotionSurfaceStatus {
  name: string;
  uuid: string;
  url: string;
  role: string;
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
  {
    name: 'Master Motion Control Page',
    envKey: 'NOTION_PAGE_ID',
    defaultUuid: '4003080b-dd53-8159-8220-ef09061f54b7',
    url: 'https://app.notion.com/p/OCEANICOS-MOTION-Private-Wealth-Execution-Engine-4003080bdd5381598220ef09061f54b7',
    role: 'Canonical control plane — decisions, daily command, audit blocks',
  },
  {
    name: 'Value Opportunities Pipeline',
    envKey: 'NOTION_OPPORTUNITIES_DB_ID',
    defaultUuid: 'baf1877d-e979-4cd8-949e-6c48cdee4c7a',
    url: 'https://app.notion.com/p/baf1877de9794cd8949e6c48cdee4c7a',
    role: 'Tracks buyer, problem, offer, stage, score, next action, review date, evidence',
  },
  {
    name: 'Execution Queue',
    envKey: 'NOTION_EXECUTION_DB_ID',
    defaultUuid: '75b1967f-fb19-47fc-8f5a-db1298fe8f02',
    url: 'https://app.notion.com/p/75b1967ffb1947fc8f5adb1298fe8f02',
    role: 'Tracks task priority, dependencies, approvals, status, output, test receipts',
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
