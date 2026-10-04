import { describe, expect, it } from 'vitest';
import { proposeRepositoryChange } from '../repo-builder.js';

describe('repo builder', () => {
  it('creates a bounded proposal without claiming authorization', () => {
    const result = proposeRepositoryChange([
      { path: 'packages/mini/src/example.ts', content: 'export const example = true;\n' },
    ]);
    expect(result.status).toBe('PROPOSED');
    expect(result.worker).toBe('repo-builder');
    expect(result.evidence).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(result.limitations).toContain('proposal is not authorization');
  });

  it('rejects traversal and absolute paths', () => {
    expect(() => proposeRepositoryChange([{ path: '../secret', content: 'x' }])).toThrow();
    expect(() => proposeRepositoryChange([{ path: '/secret', content: 'x' }])).toThrow();
  });

  it('rejects oversized change sets', () => {
    expect(() => proposeRepositoryChange(
      Array.from({ length: 9 }, (_, i) => ({ path: `file-${i}.txt`, content: 'x' })),
    )).toThrow('exceeds 8 files');
  });
});
