import { MiniKernel } from '../index';
import { OperatingSystemKernel } from '../os';
import { VerificationRule } from '@omega-v/types';

const DEFAULT_RULE: VerificationRule = {
  name: 'response-time-threshold',
  version: '1.0.0',
  appliesTo: ['mini-cycle'],
  definition: 'responseTime < 100',
  description: 'Test rule for OS kernel',
  createdAt: new Date().toISOString(),
  active: true,
};

describe('OperatingSystemKernel', () => {
  let os: OperatingSystemKernel;

  beforeEach(() => {
    const kernel = new MiniKernel({ rules: [DEFAULT_RULE] });
    os = new OperatingSystemKernel(kernel);
  });

  test('starts in COLD state', () => {
    expect(os.getState()).toBe('COLD');
  });

  test('boot transitions to BOOTED', () => {
    os.boot();
    expect(os.getState()).toBe('BOOTED');
  });

  test('boot fails if not COLD', () => {
    os.boot();
    expect(() => os.boot()).toThrow(/Cannot boot/);
  });

  test('admit processes a cycle in BOOTED state', () => {
    os.boot();
    const result = os.admit({
      claim: 'OS admit test',
      metadata: { responseTime: 20 },
    });

    expect(result.passed).toBe(true);
    expect(result.observation.claim.statement).toBe('OS admit test');
    expect(os.getState()).toBe('BOOTED'); // returns to BOOTED after processing
  });

  test('admit fails if not BOOTED', () => {
    expect(() =>
      os.admit({ claim: 'Should fail' })
    ).toThrow(/Cannot admit/);
  });

  test('complete is an alias for admit', () => {
    os.boot();
    const result = os.complete({
      claim: 'Complete test',
      metadata: { responseTime: 15 },
    });

    expect(result.passed).toBe(true);
  });

  test('stop transitions to STOPPED', () => {
    os.boot();
    os.stop();
    expect(os.getState()).toBe('STOPPED');
  });

  test('stop fails if not BOOTED', () => {
    expect(() => os.stop()).toThrow(/Cannot stop/);
  });

  test('admit fails after stop', () => {
    os.boot();
    os.stop();
    expect(() =>
      os.admit({ claim: 'Should fail after stop' })
    ).toThrow(/Cannot admit/);
  });

  test('snapshot captures current state', () => {
    os.boot();
    os.admit({ claim: 'Snapshot test 1', metadata: { responseTime: 10 } });
    os.admit({ claim: 'Snapshot test 2', metadata: { responseTime: 200 } }); // fails

    const snap = os.snapshot();
    expect(snap.state).toBe('BOOTED');
    expect(snap.totalCycles).toBe(2);
    expect(snap.passedCycles).toBe(1);
    expect(snap.failedCycles).toBe(1);
    expect(snap.memorySize).toBe(6); // 2 cycles × 3 entries
    expect(snap.memoryIntegrity).toBe(true);
    expect(snap.snapshotAt).toBeDefined();
  });

  test('full lifecycle: boot → admit → admit → stop → snapshot', () => {
    os.boot();
    os.admit({ claim: 'Cycle 1', metadata: { responseTime: 10 } });
    os.admit({ claim: 'Cycle 2', metadata: { responseTime: 20 } });
    os.stop();

    const snap = os.snapshot();
    expect(snap.state).toBe('STOPPED');
    expect(snap.totalCycles).toBe(2);
    expect(snap.passedCycles).toBe(2);
    expect(snap.failedCycles).toBe(0);
  });

  test('getKernel returns the underlying MiniKernel', () => {
    expect(os.getKernel()).toBeDefined();
    expect(os.getKernel()).toBeInstanceOf(MiniKernel);
  });
});
