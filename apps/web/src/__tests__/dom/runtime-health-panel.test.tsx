import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, render, screen } from '@testing-library/react';
import { SystemHealthPanel } from '../../SystemHealthPanel';

const response = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => JSON.stringify(body),
});

describe('runtime health / persistence evidence panel', () => {
  let fetchDescriptor: PropertyDescriptor | undefined;

  afterEach(() => {
    cleanup();
    if (fetchDescriptor) {
      Object.defineProperty(globalThis, 'fetch', fetchDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, 'fetch');
    }
    jest.restoreAllMocks();
  });

  it('renders observed persistence, recovery, and policy evidence', async () => {
    fetchDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'fetch');
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: jest.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/health')) {
          return response({
            data: {
              readiness: 'degraded',
              checks: {
                observer: 'ready',
                verifier: 'ready',
                attester: 'degraded',
                memory: { status: 'ready', integrity: true, encryption: 'disabled' },
                persistence: {
                  mode: 'file',
                  eventLogSource: 'restored',
                  skippedLogEntries: 3,
                  keySource: 'mixed',
                  rotationPending: true,
                  operatorAction: 'review-key-rotation',
                  coverage: { complete: false, unverifiedSurfaces: ['event-log-backfill'] },
                },
              },
              policy: {
                authMode: 'required',
                revocationEnabled: true,
                persistenceEncryption: 'aes-256-gcm',
              },
            },
          });
        }
        return response({ error: 'service unavailable' }, 503);
      }),
    });

    render(<SystemHealthPanel />);

    expect(await screen.findByText('degraded')).toBeInTheDocument();
    expect(screen.getByText('Persistence · file')).toBeInTheDocument();
    expect(screen.getByText('event log: restored')).toBeInTheDocument();
    expect(screen.getByText('skipped: 3')).toBeInTheDocument();
    expect(screen.getByText('rotation pending: true')).toBeInTheDocument();
    expect(
      screen.getByText(/operator action: review-key-rotation · review evidence, not recovery/)
    ).toBeInTheDocument();
    expect(screen.getByText('unverified: event-log-backfill')).toBeInTheDocument();
    expect(screen.getByText('Policy').parentElement).toHaveTextContent('auth: required');
    expect(screen.getByText('enabled')).toBeInTheDocument();
    expect(screen.getByText('aes-256-gcm')).toBeInTheDocument();
  });

  it('keeps absent readiness and persistence evidence UNKNOWN', async () => {
    fetchDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'fetch');
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: jest.fn(async (input: RequestInfo | URL) => {
        if (String(input).endsWith('/health')) {
          return response({ data: { readiness: 'ready', checks: { persistence: {} } } });
        }
        return response({ error: 'service unavailable' }, 503);
      }),
    });

    render(<SystemHealthPanel />);

    expect(await screen.findByText('Persistence')).toBeInTheDocument();
    expect(screen.getByText('Observer').parentElement).toHaveTextContent('UNKNOWN');
    expect(screen.getByText('event log: UNKNOWN')).toBeInTheDocument();
    expect(screen.getByText('key: UNKNOWN')).toBeInTheDocument();
    expect(screen.getByText('rotation pending: UNKNOWN')).toBeInTheDocument();
    expect(screen.getByText('Policy').parentElement).toHaveTextContent('auth: UNKNOWN');
  });
});
