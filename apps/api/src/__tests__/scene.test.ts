import { sceneStates, simulateScene } from '../scene';

describe('Ω∞v scene equation simulation', () => {
  it('walks the complete bounded equation deterministically', () => {
    const first = simulateScene({ seed: 'opening-scene' });
    const second = simulateScene({ seed: 'opening-scene' });

    expect(first.states).toEqual(sceneStates());
    expect(first.terminalState).toBe('return');
    expect(first.trace).toHaveLength(13);
    expect(first.trace[0]).toMatchObject({ state: 'darkness', status: 'observed' });
    expect(first.trace.at(-1)).toMatchObject({ state: 'return', status: 'verified' });
    expect(first.trace.map((entry) => entry.evidence)).toEqual(
      second.trace.map((entry) => entry.evidence)
    );
    expect(first.provenance).toMatchObject({
      source: 'local-simulation',
      ruleVersion: 'scene-equation.v1',
      deterministic: true,
      verified: false,
    });
  });

  it('supports a bounded prefix and rejects unsafe step counts', () => {
    expect(simulateScene({ seed: 'prefix', steps: 4 }).states).toEqual([
      'darkness',
      'possibility',
      'ocean',
      'star',
    ]);
    expect(() => simulateScene({ steps: 0 })).toThrow(/between 1 and 32/);
    expect(() => simulateScene({ steps: 33 })).toThrow(/between 1 and 32/);
    expect(() => simulateScene({ steps: 1.5 })).toThrow(/between 1 and 32/);
  });
});
