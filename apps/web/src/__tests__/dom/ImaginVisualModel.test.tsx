import { buildImaginVisualModel, MAX_IMAGIN_SIGNALS } from '../../imagin-visual-model';

describe('IMAGIN visual model', () => {
  it('preserves supplied status and provenance without claiming live topology', () => {
    const model = buildImaginVisualModel([
      { label: 'Runtime stream', status: 'verified', source: 'SSE connection observed' },
      { label: 'CI', status: 'not queried', source: 'hosted CI not queried by this view' },
      { label: 'Ledger', status: 'DIVERGENT', source: 'local ledger check' },
      { label: 'Image generation', status: 'not executed', source: 'no generation receipt supplied' },
    ]);

    expect(model.mode).toBe('VIEW_LOCAL');
    expect(model.topology).toBe('PRESENTATION_ONLY');
    expect(model.nodes.map(({ label, status, source }) => ({ label, status, source }))).toEqual([
      { label: 'Runtime stream', status: 'VERIFIED', source: 'SSE connection observed' },
      { label: 'CI', status: 'UNKNOWN', source: 'hosted CI not queried by this view' },
      { label: 'Ledger', status: 'DIVERGENT', source: 'local ledger check' },
      { label: 'Image generation', status: 'NOT_EXECUTED', source: 'no generation receipt supplied' },
    ]);
    for (const node of model.nodes) {
      expect(Number.isFinite(node.x)).toBe(true);
      expect(Number.isFinite(node.y)).toBe(true);
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x).toBeLessThanOrEqual(520);
      expect(node.y).toBeGreaterThanOrEqual(0);
      expect(node.y).toBeLessThanOrEqual(280);
    }
    expect(model.caption).toMatch(/visual anchors/i);
  });

  it('bounds rendered nodes and discloses omitted signals', () => {
    const model = buildImaginVisualModel(Array.from({ length: 15 }, (_, index) => ({
      label: 'Signal ' + index,
      status: 'UNKNOWN',
      source: 'bounded test input',
    })));

    expect(MAX_IMAGIN_SIGNALS).toBe(12);
    expect(model.nodes).toHaveLength(12);
    expect(model.omittedCount).toBe(3);
    expect(model.caption).toMatch(/3 not rendered/);
  });

  it('keeps empty input explicit instead of implying completeness', () => {
    const model = buildImaginVisualModel([]);
    expect(model.nodes).toHaveLength(0);
    expect(model.omittedCount).toBe(0);
    expect(model.caption).toMatch(/No signals supplied/);
  });
});
