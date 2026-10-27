import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createApp } from '../index.js';

describe('🏛️ Notion Operating Surfaces & Wealth Engine API Route', () => {
  let directory: string;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    directory = mkdtempSync(join(tmpdir(), 'omega-api-notion-surfaces-test-'));
    app = createApp(join(directory, 'ledger.db'), false, { allowUnsignedCycle: true });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('serves GET /v1/notion/surfaces with all 6 canonical surfaces (4 master pages + 2 databases)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/notion/surfaces',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.surfaces).toHaveLength(6);

    const quadrants = body.surfaces.map((s: any) => s.quadrant);
    expect(quadrants).toContain('Q1_SOUL');
    expect(quadrants).toContain('Q2_UNIVERSE');
    expect(quadrants).toContain('Q3_ARCHITECTURE');
    expect(quadrants).toContain('Q4_WEALTH');
    expect(quadrants).toContain('DB_PIPELINE');
    expect(quadrants).toContain('DB_EXECUTION');

    // Check specific canonical surfaces
    const soulPage = body.surfaces.find((s: any) => s.quadrant === 'Q1_SOUL');
    expect(soulPage.name).toBe('AI SOUL MASTER COMMAND CENTER');
    expect(soulPage.uuid).toBe('33949ca4-35a2-81a8-9c83-ca074966bbfa');
    expect(soulPage.url).toContain('33949ca435a281a89c83ca074966bbfa');

    const blueprintPage = body.surfaces.find((s: any) => s.quadrant === 'Q2_UNIVERSE');
    expect(blueprintPage.name).toBe('OceanicOS Living Universe Master Blueprint');
    expect(blueprintPage.uuid).toBe('4003080b-dd53-8153-b957-c6bdb9417958');

    const archPage = body.surfaces.find((s: any) => s.quadrant === 'Q3_ARCHITECTURE');
    expect(archPage.name).toBe('OceanicOS GitHub to Notion Architecture Map');
    expect(archPage.uuid).toBe('4003080b-dd53-8142-a075-c9da63c46c70');

    const wealthPage = body.surfaces.find((s: any) => s.quadrant === 'Q4_WEALTH');
    expect(wealthPage.name).toBe('OCEANICOS MOTION Private Wealth Execution Engine');
    expect(wealthPage.uuid).toBe('4003080b-dd53-8159-8220-ef09061f54b7');

    const oppDb = body.surfaces.find((s: any) => s.quadrant === 'DB_PIPELINE');
    expect(oppDb.name).toBe('Value Opportunities Pipeline');
    expect(oppDb.uuid).toBe('baf1877d-e979-4cd8-949e-6c48cdee4c7a');

    const execDb = body.surfaces.find((s: any) => s.quadrant === 'DB_EXECUTION');
    expect(execDb.name).toBe('Execution Queue');
    expect(execDb.uuid).toBe('75b1967f-fb19-47fc-8f5a-db1298fe8f02');
  });

  it('exposes the 9 connected workspace sections and composio bridge status', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/notion/surfaces',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.workspaceSections).toHaveLength(9);

    const sectionNames = body.workspaceSections.map((s: any) => s.name);
    expect(sectionNames).toContain('Ecosystem control center');
    expect(sectionNames).toContain('Architecture and product roadmap');
    expect(sectionNames).toContain('Projects and execution queue');
    expect(sectionNames).toContain('Repository and integration registry');
    expect(sectionNames).toContain('Knowledge and decision records');
    expect(sectionNames).toContain('Verification and evidence ledger');
    expect(sectionNames).toContain('Business opportunities and product experiments');
    expect(sectionNames).toContain('Metrics, revenue tracking, and asset development');
    expect(sectionNames).toContain('Risks, permissions, dependencies, and unresolved questions');

    expect(body.composioBridge).toBeDefined();
    expect(body.token).toBeDefined();
    expect(typeof body.evaluatedAt).toBe('string');
  });
});
