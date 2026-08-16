import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../App';
import { failingLoop, installFetch, json, passingLoop, type FakeResponse } from './harness';

/** The EventSource instances App.tsx opened, installed by jest.setup.dom.ts. */
type Stream = {
  emit: (type: string, data: unknown) => void;
  error: () => void;
  open: () => void;
  closed: boolean;
};
const streams = (): Stream[] =>
  (globalThis as unknown as { MockEventSource: { instances: Stream[] } }).MockEventSource.instances;

/**
 * Mount inside act(). App.tsx kicks off refreshRuntime() from an effect, so
 * a bare render() lets that promise resolve outside React's batching and
 * every test emits "update not wrapped in act". Awaiting the mount here
 * makes the settled runtime the starting state for each test.
 */
const renderApp = async (): Promise<ReturnType<typeof render>> => {
  let utils!: ReturnType<typeof render>;
  await act(async () => {
    utils = render(<App />);
  });
  return utils;
};

/**
 * The dashboard had no behavioural test of any kind. The one existing web
 * test reads App.tsx as a *string* and regexes it for route literals, which
 * proves the two halves name the same paths and nothing about what a user
 * sees.
 *
 * These render the component. What they defend is narrow and deliberate:
 * the dashboard is the only surface where a human reads a verification
 * verdict, so the thing worth pinning is that it reports the verdict it was
 * given — including when that verdict is a failure.
 */
describe('dashboard', () => {
  beforeEach(() => {
    installFetch();
  });

  it('renders the runtime once state resolves', async () => {
    await renderApp();

    expect(await screen.findByRole('button', { name: /run verification/i })).toBeInTheDocument();
    // Persistence and service health come from /api/state, not from defaults.
    expect(await screen.findByText('MEMORY')).toBeInTheDocument();
    expect(await screen.findByText('02 / 02')).toBeInTheDocument();
    expect(await screen.findAllByText('Ed25519 / 1')).toHaveLength(2);
  });

  it('reports unavailable public trust metadata without blocking the dashboard', async () => {
    installFetch({
      '/api/attest/public-key': () =>
        json({ message: 'Ed25519 is not configured' }, { status: 503 }),
    });
    await renderApp();

    expect(await screen.findByText('Trust unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /run verification/i })).toBeInTheDocument();
  });

  it('renders all three MINI steps plus the attestation after a run', async () => {
    const user = userEvent.setup();
    await renderApp();

    await user.click(await screen.findByRole('button', { name: /run verification/i }));

    // Observe -> Verify -> Remember, then the earned expansion. The memory
    // step is the one that existed in the API response but was invisible
    // here until it was wired up; nothing tested that it renders.
    expect(await screen.findByText('OBSERVATION')).toBeInTheDocument();
    expect(await screen.findByText('VERIFICATION / EVIDENCE')).toBeInTheDocument();
    expect(await screen.findByText('MEMORY / KERNEL RECORD')).toBeInTheDocument();
    expect(await screen.findByText('ATTESTATION')).toBeInTheDocument();

    const loop = passingLoop();
    expect(screen.getByText(loop.observation.id)).toBeInTheDocument();
    expect(screen.getByText(loop.memory.id)).toBeInTheDocument();
    expect(screen.getByText(loop.attestation.id)).toBeInTheDocument();
  });

  it('shows every evidence step, passing and failing alike', async () => {
    const user = userEvent.setup();
    installFetch({
      '/api/complete-loop': () => json({ data: failingLoop() }, { status: 201 }),
    });
    await renderApp();

    await user.click(await screen.findByRole('button', { name: /run verification/i }));

    // The UI claims "Failures remain visible as evidence". A dashboard that
    // quietly dropped the failing step would still look correct.
    const failed = await screen.findByText(/FAIL \/ Observation does not carry responseTime/);
    expect(failed).toBeInTheDocument();
    expect(screen.getByText(/PASS \/ Status code is 200/)).toBeInTheDocument();
    expect(screen.getByText('FAILED')).toBeInTheDocument();
  });

  it('does not report a failed verification as passed', async () => {
    const user = userEvent.setup();
    installFetch({
      '/api/complete-loop': () => json({ data: failingLoop() }, { status: 201 }),
    });
    await renderApp();

    await user.click(await screen.findByRole('button', { name: /run verification/i }));

    await screen.findByText('FAILED');
    expect(screen.queryByText('PASSED')).not.toBeInTheDocument();
  });

  it('surfaces the request id when the API returns an error', async () => {
    const user = userEvent.setup();
    installFetch({
      '/api/complete-loop': () =>
        json(
          { code: 'LOOP_FAILED', message: 'Verification engine unavailable', requestId: 'req-42' },
          { status: 500 }
        ),
    });
    await renderApp();

    await user.click(await screen.findByRole('button', { name: /run verification/i }));

    // Provenance is the point: an error a user cannot trace back to a
    // request id is not much of an error report.
    expect(await screen.findByText(/Verification engine unavailable/)).toBeInTheDocument();
    expect(screen.getByText(/req-42/)).toBeInTheDocument();
  });

  it('reports an unavailable runtime instead of rendering empty state as healthy', async () => {
    installFetch({
      '/api/state': () => json({ code: 'DOWN' }, { status: 503 }),
    });
    await renderApp();

    expect(await screen.findByText(/Runtime unavailable/)).toBeInTheDocument();
  });

  it('verifies an attestation signature through the API', async () => {
    const user = userEvent.setup();
    await renderApp();

    await user.click(await screen.findByRole('button', { name: /run verification/i }));
    await screen.findByText('ATTESTATION');
    await user.click(screen.getByRole('button', { name: /verify signature/i }));

    expect(await screen.findByText('VALID')).toBeInTheDocument();
  });

  it('revokes an attestation with an explicit operator reason', async () => {
    const user = userEvent.setup();
    const fetchMock = installFetch();
    await renderApp();

    await user.click(await screen.findByRole('button', { name: /run verification/i }));
    await screen.findByText('ATTESTATION');

    const revokeButton = screen.getByRole('button', { name: /revoke attestation/i });
    expect(revokeButton).toBeDisabled();

    await user.type(
      screen.getByLabelText(/revocation reason/i),
      'Operator review found stale evidence'
    );
    expect(revokeButton).toBeEnabled();
    await user.click(revokeButton);

    expect(await screen.findByText('ATTESTATION REVOKED')).toBeInTheDocument();
    const call = fetchMock.mock.calls.find(([url]) => url === '/api/attest/revoke');
    expect(call).toBeDefined();
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({
      attestationId: 'att-2026-08-16-def',
      reason: 'Operator review found stale evidence',
      revokedBy: 'dashboard-operator',
    });
  });

  it('reports an invalid signature as invalid', async () => {
    const user = userEvent.setup();
    installFetch({
      '/api/attest/verify': () => json({ data: { valid: false } }),
    });
    await renderApp();

    await user.click(await screen.findByRole('button', { name: /run verification/i }));
    await screen.findByText('ATTESTATION');
    await user.click(screen.getByRole('button', { name: /verify signature/i }));

    // A dashboard that renders "VALID" regardless would defeat the entire
    // point of asymmetric attestation.
    expect(await screen.findByText('INVALID')).toBeInTheDocument();
    expect(screen.queryByText('VALID')).not.toBeInTheDocument();
  });

  it('renders the API attestation TTL policy evidence', async () => {
    installFetch({
      '/api/state': () =>
        json({
          data: {
            mode: 'observe',
            trust: 0.95,
            trustBasis: {
              evidenceQuality: 0.95,
              verificationCoverage: 1,
              attestationValidity: 1,
              serviceReadiness: 1,
              recentFailures: 0,
            },
            persistence: 'memory',
            attestationTtlMs: 900000,
            services: [{ status: 'ready' }, { status: 'ready' }],
          },
        }),
      '/api/attest/policy': () =>
        json({
          data: {
            attestationAlgorithm: 'HMAC-SHA256',
            attestationTtlMs: 900000,
            readAuthConfigured: true,
            adminAuthConfigured: true,
            revocationEnabled: true,
            persistenceEncryption: 'aes-256-gcm',
            memoryEncryption: 'aes-256-gcm',
          },
        }),
    });
    await renderApp();

    expect(await screen.findByText('ATTESTATION TTL')).toBeInTheDocument();
    expect(screen.getByText('900s')).toBeInTheDocument();
    expect(screen.getByText('REVOCATION / ADMIN')).toBeInTheDocument();
    expect(screen.getByText('HEALTH')).toBeInTheDocument();
    expect(screen.getAllByText('READY')).toHaveLength(2);
  });

  it('renders persisted revocation evidence in the ledger', async () => {
    const user = userEvent.setup();
    installFetch({
      '/api/attest/revocations': () =>
        json({
          data: [
            {
              id: 'rev-1',
              attestationId: 'att-1',
              reason: 'stale evidence',
              revokedBy: 'operator',
              revokedAt: '2026-08-16T10:30:00.000Z',
            },
          ],
        }),
    });
    await renderApp();

    expect(await screen.findByText('REVOCATION LEDGER')).toBeInTheDocument();
    expect(screen.getByText('Proofs no longer authorize action')).toBeInTheDocument();
    expect(screen.getByText('att-1')).toBeInTheDocument();
    expect(screen.getByText('stale evidence')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /run verification/i }));
    expect(await screen.findByText('ATTESTATION')).toBeInTheDocument();
  });

  it('sends the operator-supplied evidence rather than a hardcoded payload', async () => {
    const user = userEvent.setup();
    const fetchMock = installFetch();
    await renderApp();

    const responseTime = await screen.findByLabelText(/response ms/i);
    await user.clear(responseTime);
    await user.type(responseTime, '250');
    await user.click(screen.getByRole('button', { name: /run verification/i }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([url]) => url === '/api/complete-loop');
      expect(call).toBeDefined();
      const body = JSON.parse((call![1] as RequestInit).body as string);
      expect(body.metadata.responseTime).toBe(250);
    });
  });

  it('renders lifecycle events pushed over the stream', async () => {
    await renderApp();
    await screen.findByRole('button', { name: /run verification/i });

    const stream = streams()[0];
    expect(stream).toBeDefined();

    act(() => {
      stream.emit('message', {
        id: 'evt-1',
        type: 'observation.received',
        stage: 'observe',
        message: 'Observation received',
        status: 'active',
        timestamp: '2026-08-16T10:30:00.000Z',
      });
    });

    expect(await screen.findByText(/Observation received/)).toBeInTheDocument();
  });

  it('reports an unreadable stream event instead of dropping it', async () => {
    await renderApp();
    await screen.findByRole('button', { name: /run verification/i });

    act(() => {
      streams()[0].emit('message', 'not-json');
    });

    expect(await screen.findByText(/unreadable event/i)).toBeInTheDocument();
  });

  it('reports a lost event stream', async () => {
    await renderApp();
    await screen.findByRole('button', { name: /run verification/i });

    act(() => {
      streams()[0].error();
    });

    expect(await screen.findByText(/stream unavailable/i)).toBeInTheDocument();
  });

  it('closes the event stream on unmount', async () => {
    const { unmount } = await renderApp();
    await screen.findByRole('button', { name: /run verification/i });
    const stream = streams()[0];

    unmount();

    // A dashboard left holding an open stream per mount leaks connections.
    expect(stream.closed).toBe(true);
  });

  it('starts with no evidence rather than an implied healthy state', async () => {
    await renderApp();

    expect(
      await screen.findByText(/No observations have entered the current yet/)
    ).toBeInTheDocument();
    expect(screen.getAllByText('READY')).toHaveLength(2);
    expect(screen.queryByText('OBSERVATION')).not.toBeInTheDocument();
  });

  it('disables the run button while a verification is in flight', async () => {
    const user = userEvent.setup();
    let release: (value: FakeResponse) => void = () => {};
    installFetch({
      '/api/complete-loop': () =>
        new Promise<FakeResponse>((resolve) => {
          release = resolve;
        }),
    });
    await renderApp();

    const run = await screen.findByRole('button', { name: /run verification/i });
    await user.click(run);

    const running = await screen.findByRole('button', { name: /running current/i });
    expect(running).toBeDisabled();

    await act(async () => {
      release(json({ data: passingLoop() }, { status: 201 }));
    });
    await screen.findByText('OBSERVATION');
  });

  it('restores the last completed run after a reload', async () => {
    installFetch({
      '/api/runs': () => json({ data: [passingLoop()] }),
    });
    await renderApp();

    // Nothing was submitted in this session; the chain comes from /api/runs.
    expect(await screen.findByText('MEMORY / KERNEL RECORD')).toBeInTheDocument();
    expect(screen.getByText(passingLoop().memory.id)).toBeInTheDocument();
  });

  it('keeps the primary navigation reachable by role', async () => {
    await renderApp();

    const nav = await screen.findByRole('navigation', { name: /primary navigation/i });
    expect(within(nav).getAllByRole('button').length).toBeGreaterThan(0);
  });
});
