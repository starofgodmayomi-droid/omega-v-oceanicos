import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SystemHealthPanel } from '../../SystemHealthPanel';

const response = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => JSON.stringify(body),
});

const healthyResponse = () => ({
  status: 'ok',
  service: 'api',
  readiness: 'ready',
  checks: {
    observer: 'ready',
    verifier: 'ready',
    attester: 'ready',
    memory: { status: 'ready', integrity: true, encryption: 'disabled' },
    persistence: {
      mode: 'memory',
      source: 'in-memory',
      keySource: 'none',
      rotationPending: false,
      operatorAction: 'none',
      coverage: { complete: true, surfaces: [], unverifiedSurfaces: [] },
    },
  },
  policy: {
    authMode: 'local',
    readAuthConfigured: false,
    adminAuthConfigured: false,
    revocationEnabled: false,
    persistenceEncryption: 'disabled',
  },
  timestamp: '2026-11-01T00:00:00.000Z',
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

describe('SystemHealthPanel evidence availability', () => {
  let fetchDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    fetchDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'fetch');
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
    if (fetchDescriptor) {
      Object.defineProperty(globalThis, 'fetch', fetchDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, 'fetch');
    }
    jest.restoreAllMocks();
  });

  it('distinguishes unavailable evidence from a successful empty feed', async () => {
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: jest.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/health')) return response(healthyResponse());
        if (url.endsWith('/v1/therapeutic/state')) {
          return response({ error: 'service unavailable' }, 503);
        }
        if (url.endsWith('/v1/omega/commands')) {
          return response({ error: 'service unavailable' }, 503);
        }
        if (url.endsWith('/v1/omega/divergences')) {
          return response({ error: 'service unavailable' }, 503);
        }
        return response({ error: 'service unavailable' }, 503);
      }),
    });

    render(<SystemHealthPanel />);

    expect(await screen.findByText(/State unavailable: service unavailable/)).toBeTruthy();
    expect(await screen.findByText(/Command evidence unavailable: service unavailable/)).toBeTruthy();
    expect(await screen.findByText(/Divergence evidence unavailable: service unavailable/)).toBeTruthy();
    expect(screen.queryByText('no command evidence yet')).toBeNull();
    expect(screen.queryByText('no divergent command evidence')).toBeNull();
  });

  it('reports an empty feed only after a successful response', async () => {
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: jest.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/health')) return response(healthyResponse());
        if (url.endsWith('/v1/therapeutic/state')) {
          return response({
            success: true,
            model: 'omega.therapeutic-state-machine.v1',
            status: 'READY',
            evaluatedAt: '2026-11-01T00:00:00.000Z',
            state: {
              kai: { status: 'READY', authority: 'bounded', summary: 'ready' },
              elion: { status: 'READY', authority: 'bounded', summary: 'ready' },
              omega: { status: 'READY', authority: 'bounded', summary: 'ready' },
            },
            loop: ['observe', 'bound', 'execute', 'reconcile', 'remember'],
          });
        }
        if (url.endsWith('/v1/omega/commands')) return response({ commands: [] });
        if (url.endsWith('/v1/omega/divergences')) return response({ alerts: [] });
        return response({ error: 'service unavailable' }, 503);
      }),
    });

    render(<SystemHealthPanel />);

    expect(await screen.findByText('no command evidence yet')).toBeTruthy();
    expect(await screen.findByText('no divergent command evidence')).toBeTruthy();
    expect(screen.queryByText(/evidence unavailable/)).toBeNull();
  });

  it('labels retained polled evidence stale when a later refresh fails', async () => {
    jest.useFakeTimers();
    let failRefresh = false;
    const command = {
      commandId: 'cmd-1',
      intent: 'Check the bounded transition',
      requestedBy: 'operator',
      status: 'DIVERGENT',
      createdAt: '2026-11-01T00:00:00.000Z',
      workers: ['planner'],
      decision: null,
      authority: null,
      policy: null,
      execution: null,
      reality: { classification: 'DIVERGENT', observedState: 'different' },
    };
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: jest.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/health')) return response(healthyResponse());
        if (failRefresh && (
          url.endsWith('/v1/therapeutic/state')
          || url.endsWith('/v1/omega/commands')
          || url.endsWith('/v1/omega/divergences')
        )) {
          return response({ error: 'refresh unavailable' }, 503);
        }
        if (url.endsWith('/v1/therapeutic/state')) {
          return response({
            success: true,
            model: 'omega.therapeutic-state-machine.v1',
            status: 'READY',
            evaluatedAt: '2026-11-01T00:00:00.000Z',
            state: {
              kai: { status: 'READY', authority: 'bounded', summary: 'ready' },
              elion: { status: 'READY', authority: 'bounded', summary: 'ready' },
              omega: { status: 'READY', authority: 'bounded', summary: 'ready' },
            },
            loop: ['observe', 'bound', 'execute', 'reconcile', 'remember'],
          });
        }
        if (url.endsWith('/v1/omega/commands')) return response({ commands: [command] });
        if (url.endsWith('/v1/omega/divergences')) return response({ alerts: [command] });
        if (url.endsWith('/v1/omega/commands/cmd-1/safety-boundary')) {
          return response({ boundary: { policy: {}, execution: {}, observation: {} } });
        }
        if (url.endsWith('/v1/omega/commands/cmd-1')) return response(command);
        return response({ error: 'not found' }, 404);
      }),
    });

    render(<SystemHealthPanel />);
    expect(await screen.findAllByText('Check the bounded transition')).toHaveLength(2);

    failRefresh = true;
    await act(async () => {
      jest.advanceTimersByTime(15_000);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(await screen.findByText('Showing last successful command response; refresh failed.')).toBeTruthy();
    expect(screen.getByText('Showing last successful divergence response; refresh failed.')).toBeTruthy();
    expect(screen.getByText('Showing last successful state response; refresh failed.')).toBeTruthy();
  });

  it('ignores a late response for a command that is no longer selected', async () => {
    const firstCommand = {
      commandId: 'cmd-1',
      intent: 'First command intent',
      requestedBy: 'operator',
      status: 'DIVERGENT',
      createdAt: '2026-11-01T00:00:00.000Z',
      workers: ['planner'],
      decision: null,
      authority: null,
      policy: null,
      execution: null,
      reality: { classification: 'DIVERGENT', observedState: 'first' },
    };
    const secondCommand = {
      ...firstCommand,
      commandId: 'cmd-2',
      intent: 'Second command intent',
      reality: { classification: 'UNKNOWN', observedState: 'second' },
    };
    const delayedFirstDetails = deferred<ReturnType<typeof response>>();

    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: jest.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/health')) return response(healthyResponse());
        if (url.endsWith('/v1/therapeutic/state')) {
          return response({
            success: true,
            model: 'omega.therapeutic-state-machine.v1',
            status: 'READY',
            evaluatedAt: '2026-11-01T00:00:00.000Z',
            state: {
              kai: { status: 'READY', authority: 'bounded', summary: 'ready' },
              elion: { status: 'READY', authority: 'bounded', summary: 'ready' },
              omega: { status: 'READY', authority: 'bounded', summary: 'ready' },
            },
            loop: ['observe', 'bound', 'execute', 'reconcile', 'remember'],
          });
        }
        if (url.endsWith('/v1/omega/commands')) return response({ commands: [firstCommand, secondCommand] });
        if (url.endsWith('/v1/omega/divergences')) return response({ alerts: [] });
        if (url.endsWith('/v1/omega/commands/cmd-1/safety-boundary')) {
          return response({ boundary: {} });
        }
        if (url.endsWith('/v1/omega/commands/cmd-1')) return delayedFirstDetails.promise;
        if (url.endsWith('/v1/omega/commands/cmd-2/safety-boundary')) {
          return response({ boundary: {} });
        }
        if (url.endsWith('/v1/omega/commands/cmd-2')) return response(secondCommand);
        return response({ error: 'not found' }, 404);
      }),
    });

    render(<SystemHealthPanel />);
    expect(await screen.findByText('First command intent')).toBeTruthy();
    expect(await screen.findByText('Second command intent')).toBeTruthy();

    fireEvent.click(screen.getByText('Second command intent'));
    expect(await screen.findByText(/Selected Command Evidence · cmd-2/)).toBeTruthy();

    await act(async () => {
      delayedFirstDetails.resolve(response(firstCommand));
      await delayedFirstDetails.promise;
    });

    expect(screen.getByText(/Selected Command Evidence · cmd-2/)).toBeTruthy();
    expect(screen.queryByText(/Selected Command Evidence · cmd-1/)).toBeNull();
  });

  it('does not refresh old command details after its action completes post-switch', async () => {
    const firstCommand = {
      commandId: 'cmd-1',
      intent: 'First command intent',
      requestedBy: 'operator',
      status: 'PROPOSED',
      createdAt: '2026-11-01T00:00:00.000Z',
      workers: ['planner'],
      decision: null,
      authority: null,
      policy: null,
      execution: null,
      reality: null,
    };
    const secondCommand = {
      ...firstCommand,
      commandId: 'cmd-2',
      intent: 'Second command intent',
      status: 'UNKNOWN',
    };
    const delayedAdmission = deferred<ReturnType<typeof response>>();
    const firstDetailsRequests = jest.fn();
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: jest.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/health')) return response(healthyResponse());
        if (url.endsWith('/v1/therapeutic/state')) {
          return response({
            success: true,
            model: 'omega.therapeutic-state-machine.v1',
            status: 'READY',
            evaluatedAt: '2026-11-01T00:00:00.000Z',
            state: {
              kai: { status: 'READY', authority: 'bounded', summary: 'ready' },
              elion: { status: 'READY', authority: 'bounded', summary: 'ready' },
              omega: { status: 'READY', authority: 'bounded', summary: 'ready' },
            },
            loop: ['observe', 'bound', 'execute', 'reconcile', 'remember'],
          });
        }
        if (url.endsWith('/v1/omega/commands')) return response({ commands: [firstCommand, secondCommand] });
        if (url.endsWith('/v1/omega/divergences')) return response({ alerts: [] });
        if (url.endsWith('/v1/omega/commands/cmd-1/admit')) return delayedAdmission.promise;
        if (url.endsWith('/v1/omega/commands/cmd-1/safety-boundary')) {
          return response({ boundary: {} });
        }
        if (url.endsWith('/v1/omega/commands/cmd-1')) {
          firstDetailsRequests();
          return response(firstCommand);
        }
        if (url.endsWith('/v1/omega/commands/cmd-2/safety-boundary')) {
          return response({ boundary: {} });
        }
        if (url.endsWith('/v1/omega/commands/cmd-2')) return response(secondCommand);
        return response({ error: 'not found' }, 404);
      }),
    });

    render(<SystemHealthPanel />);
    expect(await screen.findByText('First command intent')).toBeTruthy();
    expect(await screen.findByText(/Selected Command Evidence · cmd-1/)).toBeTruthy();
    expect(firstDetailsRequests).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('ADMIT'));
    fireEvent.click(screen.getByText('Second command intent'));
    expect(await screen.findByText(/Selected Command Evidence · cmd-2/)).toBeTruthy();

    await act(async () => {
      delayedAdmission.resolve(response({ command: { ...firstCommand, status: 'AUTHORIZED' } }));
      await delayedAdmission.promise;
    });

    expect(screen.getByText(/Selected Command Evidence · cmd-2/)).toBeTruthy();
    expect(firstDetailsRequests).toHaveBeenCalledTimes(1);
  });

  it('withholds lifecycle actions when safety-boundary evidence is unavailable', async () => {
    const command = {
      commandId: 'cmd-boundary-failure',
      intent: 'Review a proposed command',
      requestedBy: 'operator',
      status: 'PROPOSED',
      createdAt: '2026-11-01T00:00:00.000Z',
      workers: ['planner'],
      decision: null,
      authority: null,
      policy: null,
      execution: null,
      reality: null,
    };

    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: jest.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/health')) return response(healthyResponse());
        if (url.endsWith('/v1/therapeutic/state')) {
          return response({
            success: true,
            model: 'omega.therapeutic-state-machine.v1',
            status: 'READY',
            evaluatedAt: '2026-11-01T00:00:00.000Z',
            state: {
              kai: { status: 'READY', authority: 'bounded', summary: 'ready' },
              elion: { status: 'READY', authority: 'bounded', summary: 'ready' },
              omega: { status: 'READY', authority: 'bounded', summary: 'ready' },
            },
            loop: ['observe', 'bound', 'execute', 'reconcile', 'remember'],
          });
        }
        if (url.endsWith('/v1/omega/commands')) return response({ commands: [command] });
        if (url.endsWith('/v1/omega/divergences')) return response({ alerts: [] });
        if (url.endsWith('/v1/omega/commands/cmd-boundary-failure/safety-boundary')) {
          return response({ error: 'safety boundary unavailable' }, 503);
        }
        if (url.endsWith('/v1/omega/commands/cmd-boundary-failure')) return response(command);
        return response({ error: 'not found' }, 404);
      }),
    });

    render(<SystemHealthPanel />);

    expect(await screen.findByText(
      'Selected command details unavailable: safety boundary unavailable',
    )).toBeTruthy();
    expect(screen.queryByText(/Selected Command Evidence · cmd-boundary-failure/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'ADMIT' })).toBeNull();
  });

  it('only offers lifecycle actions allowed by the selected command status', async () => {
    const divergentCommand = {
      commandId: 'cmd-divergent',
      intent: 'Review a divergent result',
      requestedBy: 'operator',
      status: 'DIVERGENT',
      createdAt: '2026-11-01T00:00:00.000Z',
      workers: ['planner'],
      decision: null,
      authority: null,
      policy: null,
      execution: null,
      reality: { classification: 'DIVERGENT', observedState: 'mismatch' },
    };

    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: jest.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/health')) return response(healthyResponse());
        if (url.endsWith('/v1/therapeutic/state')) {
          return response({
            success: true,
            model: 'omega.therapeutic-state-machine.v1',
            status: 'READY',
            evaluatedAt: '2026-11-01T00:00:00.000Z',
            state: {
              kai: { status: 'READY', authority: 'bounded', summary: 'ready' },
              elion: { status: 'READY', authority: 'bounded', summary: 'ready' },
              omega: { status: 'READY', authority: 'bounded', summary: 'ready' },
            },
            loop: ['observe', 'bound', 'execute', 'reconcile', 'remember'],
          });
        }
        if (url.endsWith('/v1/omega/commands')) return response({ commands: [divergentCommand] });
        if (url.endsWith('/v1/omega/divergences')) return response({ alerts: [divergentCommand] });
        if (url.endsWith('/v1/omega/commands/cmd-divergent/safety-boundary')) {
          return response({ boundary: {} });
        }
        if (url.endsWith('/v1/omega/commands/cmd-divergent')) return response(divergentCommand);
        return response({ error: 'not found' }, 404);
      }),
    });

    render(<SystemHealthPanel />);

    expect(await screen.findByText(/Selected Command Evidence · cmd-divergent/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'ADMIT' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'APPROVE' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'EXECUTE' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'OBSERVE' })).toBeNull();
    expect(screen.getByText(/not independent identity proof/)).toBeTruthy();
  });
});
