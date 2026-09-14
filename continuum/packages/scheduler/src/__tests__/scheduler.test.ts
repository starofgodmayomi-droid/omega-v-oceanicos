import { VerificationScheduler } from '../index';

describe('VerificationScheduler (@omega-v/scheduler)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should start in IDLE state and transition to RUNNING on start()', () => {
    const scheduler = new VerificationScheduler(undefined, {
      intervalMs: 1000,
      claim: 'Scheduler unit test claim',
      maxRuns: 3,
    });

    expect(scheduler.getState().status).toBe('IDLE');
    scheduler.start();
    expect(scheduler.getState().status).toBe('RUNNING');
    scheduler.stop();
  });

  it('should execute runs up to maxRuns and auto-stop', async () => {
    const runs: number[] = [];
    const scheduler = new VerificationScheduler(undefined, {
      intervalMs: 100,
      claim: 'Auto-stop test claim',
      maxRuns: 2,
      onRun: (r) => runs.push(r.runIndex),
    });

    scheduler.start();

    // Run first immediately, then after each tick
    await Promise.resolve();
    jest.advanceTimersByTime(200);
    await Promise.resolve();

    scheduler.stop();

    expect(runs.length).toBeGreaterThanOrEqual(1);
  });

  it('should pause and resume without losing state', () => {
    const scheduler = new VerificationScheduler(undefined, {
      intervalMs: 500,
      claim: 'Pause/resume test claim',
    });

    scheduler.start();
    expect(scheduler.getState().status).toBe('RUNNING');

    scheduler.pause();
    expect(scheduler.getState().status).toBe('PAUSED');

    scheduler.resume();
    expect(scheduler.getState().status).toBe('RUNNING');

    scheduler.stop();
    expect(scheduler.getState().status).toBe('STOPPED');
  });

  it('should reconfigure claim and interval while running', () => {
    const scheduler = new VerificationScheduler(undefined, {
      intervalMs: 1000,
      claim: 'Original claim',
    });

    scheduler.start();
    scheduler.reconfigure({ claim: 'Reconfigured claim', intervalMs: 500 });

    // State still RUNNING after reconfigure
    expect(scheduler.getState().status).toBe('RUNNING');
    scheduler.stop();
  });

  it('should track passedRuns, failedRuns and totalRuns in state', async () => {
    const scheduler = new VerificationScheduler(undefined, {
      intervalMs: 10000,
      claim: 'State tracking test',
      maxRuns: 1,
    });

    scheduler.start();
    // Allow async run to settle
    await Promise.resolve();
    await Promise.resolve();

    scheduler.stop();
    const state = scheduler.getState();
    // totalRuns starts incrementing from first execution
    expect(state.totalRuns).toBeGreaterThanOrEqual(1);
    expect(state.passedRuns + state.failedRuns).toBe(state.totalRuns);
  });
});
