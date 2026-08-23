import { HumanEngine } from '../index';

describe('HumanEngine (Section XXVIII Human Intelligence)', () => {
  let engine: HumanEngine;

  beforeEach(() => {
    engine = new HumanEngine();
  });

  it('should record a human input', () => {
    const input = engine.recordInput(
      'APPROVAL',
      'user-123',
      'I approve this deployment',
      { action: 'deploy' },
      'gov-456'
    );

    expect(input.id).toContain('hum-');
    expect(input.type).toBe('APPROVAL');
    expect(input.humanId).toBe('user-123');
    expect(input.contextId).toBe('gov-456');
    expect(input.rationale).toBe('I approve this deployment');
  });

  it('should retrieve inputs by context ID', () => {
    engine.recordInput('APPROVAL', 'user-123', 'Approve 1', {}, 'gov-456');
    engine.recordInput('DISSENT', 'user-999', 'I disagree', {}, 'gov-456');
    engine.recordInput('FEEDBACK', 'user-123', 'Looks good', {}, 'gov-789');

    const gov456Inputs = engine.getInputsForContext('gov-456');
    expect(gov456Inputs).toHaveLength(2);
    expect(gov456Inputs.map((i) => i.type)).toContain('APPROVAL');
    expect(gov456Inputs.map((i) => i.type)).toContain('DISSENT');
  });
});
