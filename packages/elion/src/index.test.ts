import { executeBoundedAction } from './index';

const plan = (run: () => string) => ({ id: 'plan:1', description: 'bounded test plan', run });

describe('ELION — the Hands', () => {
  it('runs only with human authority and admission, and never claims verification', async () => {
    const execution = await executeBoundedAction(plan(() => 'done'), {
      authorizedBy: 'operator',
      admitted: true,
      scope: 'read-only probe',
    });

    expect(execution.status).toBe('EXECUTED_NOT_VERIFIED');
    expect(execution.output).toBe('done');
    expect(execution.verification).toBe('PENDING_OMEGA');
  });

  it('fails closed without a named human authority', async () => {
    let ran = false;
    const execution = await executeBoundedAction(
      plan(() => {
        ran = true;
        return 'should not happen';
      }),
      { authorizedBy: '  ', admitted: true, scope: 'read-only probe' }
    );

    expect(execution.status).toBe('NOT_EXECUTED');
    expect(execution.reason).toContain('human authority required');
    expect(ran).toBe(false);
  });

  it('fails closed when admission was not granted or scope is missing', async () => {
    const notAdmitted = await executeBoundedAction(plan(() => 'x'), {
      authorizedBy: 'operator',
      admitted: false,
      scope: 'read-only probe',
    });
    const noScope = await executeBoundedAction(plan(() => 'x'), {
      authorizedBy: 'operator',
      admitted: true,
      scope: '',
    });

    expect(notAdmitted.status).toBe('NOT_EXECUTED');
    expect(notAdmitted.reason).toContain('admission not granted');
    expect(noScope.reason).toContain('authority scope required');
  });

  it('reports a throwing handler as NOT_EXECUTED, not as success', async () => {
    const execution = await executeBoundedAction(
      plan(() => {
        throw new Error('network refused');
      }),
      { authorizedBy: 'operator', admitted: true, scope: 'read-only probe' }
    );

    expect(execution.status).toBe('NOT_EXECUTED');
    expect(execution.reason).toContain('network refused');
    expect(execution.output).toBeUndefined();
  });
});
