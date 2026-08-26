import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../App';
import {
  failingLoop,
  installFetch,
  json,
  passingLoop,
  splitDissensus,
  type FakeResponse,
} from './harness';

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
 * given, including when that verdict is a failure.
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
    // quietly dropped the step would still look correct.
    //
    // It reads NOT EVALUATED rather than FAIL because the engine could not
    // run that rule at all — the observation carried no responseTime. Both
    // deny the action; only one of them means the system checked.
    const unevaluated = await screen.findByText(
      /NOT EVALUATED \/ Observation does not carry responseTime/
    );
    expect(unevaluated).toBeInTheDocument();
    expect(unevaluated).toHaveClass('evidence-unevaluated');
    expect(screen.getByText(/PASS \/ Status code is 200/)).toBeInTheDocument();
    expect(screen.getByText('FAILED')).toBeInTheDocument();
  });

  it('does not colour a failed verification like a passing one', async () => {
    // The unit tests for these decisions cover the decision. This covers
    // the wiring: that the cell an operator glances at actually receives
    // it. The cell was `className="green"` unconditionally, so FAILED
    // rendered in the same green as PASSED.
    const user = userEvent.setup();
    installFetch({
      '/api/complete-loop': () => json({ data: failingLoop() }, { status: 201 }),
    });
    await renderApp();

    await user.click(await screen.findByRole('button', { name: /run verification/i }));

    const cell = await screen.findByText('FAILED');
    expect(cell).not.toHaveClass('green');
  });

  it('does not colour an unknown event log as a healthy one', async () => {
    // The default health fixture carries no persistence block, so the cell
    // renders UNKNOWN. The previous test was `source === 'partial' ? red :
    // green`, and `undefined !== 'partial'`, so unknown came out green.
    await renderApp();

    const cells = await screen.findAllByText('UNKNOWN');
    for (const cell of cells) {
      expect(cell).not.toHaveClass('green');
    }
  });

  it('omits the rotation recovery row entirely when health is absent', async () => {
    // It used to render with no text and the green class: a positive
    // signal with nothing behind it.
    await renderApp();

    expect(screen.queryByText('ROTATION RECOVERY')).not.toBeInTheDocument();
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
            authMode: 'required',
            readAuthConfigured: true,
            adminAuthConfigured: true,
            revocationEnabled: true,
            persistenceEncryption: 'aes-256-gcm',
            persistenceEncryptionKeySource: 'current',
            persistencePreviousKeyConfigured: false,
            memoryEncryption: 'aes-256-gcm',
          },
        }),
    });
    await renderApp();

    expect(await screen.findByText('ATTESTATION TTL')).toBeInTheDocument();
    expect(screen.getByText('900s')).toBeInTheDocument();
    expect(screen.getByText('REVOCATION / ADMIN')).toBeInTheDocument();
    expect(screen.getByText('REQUIRED')).toBeInTheDocument();
    expect(screen.getByText('REVOCATION INTEGRITY')).toBeInTheDocument();
    expect(screen.getByText('DISABLED')).toBeInTheDocument();
    expect(screen.getByText('CURRENT')).toBeInTheDocument();
    expect(screen.getByText('HEALTH')).toBeInTheDocument();
    expect(screen.getAllByText('READY')).toHaveLength(3);
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

  /**
   * A reconnect clears the stale stream banner and re-pulls runtime state.
   * Both health and state are checked because refreshRuntime reads both
   * contracts; reopening is evidence that the dashboard did not merely hide
   * the error without re-observing the backend.
   */
  it('clears a stream outage after reopening and refreshes runtime evidence', async () => {
    const fetchMock = installFetch();
    await renderApp();
    await screen.findByRole('button', { name: /run verification/i });

    act(() => {
      streams()[0].error();
    });
    expect(await screen.findByText(/stream unavailable/i)).toBeInTheDocument();

    const stateCallsBefore = fetchMock.mock.calls.filter(([url]) => url === '/api/state').length;
    const healthCallsBefore = fetchMock.mock.calls.filter(([url]) => url === '/api/health').length;
    act(() => {
      streams()[0].open();
    });

    await waitFor(() => {
      expect(screen.queryByText(/stream unavailable/i)).not.toBeInTheDocument();
      expect(fetchMock.mock.calls.filter(([url]) => url === '/api/state').length).toBeGreaterThan(
        stateCallsBefore
      );
      expect(fetchMock.mock.calls.filter(([url]) => url === '/api/health').length).toBeGreaterThan(
        healthCallsBefore
      );
    });
  });

  it('sets trust from a stream event carrying a pass or fail status', async () => {
    await renderApp();
    await screen.findByRole('button', { name: /run verification/i });

    expect(await screen.findByText('95.0%')).toBeInTheDocument();

    act(() => {
      streams()[0].emit('message', {
        id: 'evt-2',
        type: 'verification.completed',
        stage: 'verify',
        message: 'Verification failed',
        status: 'failed',
        timestamp: '2026-08-16T10:31:00.000Z',
      });
    });

    expect(await screen.findByText('0.0%')).toBeInTheDocument();
  });

  it('opens the event inspector with correlation, request, and payload evidence', async () => {
    const user = userEvent.setup();
    await renderApp();
    await screen.findByRole('button', { name: /run verification/i });

    act(() => {
      streams()[0].emit('message', {
        id: 'evt-inspect-1',
        type: 'attestation.created',
        stage: 'attest',
        message: 'Attestation created',
        status: 'passed',
        timestamp: '2026-08-16T10:30:00.000Z',
        correlationId: 'corr-1',
        requestId: 'req-1',
        details: { algorithm: 'Ed25519', verified: true },
      });
    });

    await user.click(await screen.findByRole('button', { name: /Attestation created/i }));

    expect(await screen.findByText('evt-inspect-1')).toBeInTheDocument();
    expect(screen.getByText('corr-1')).toBeInTheDocument();
    expect(screen.getByText('req-1')).toBeInTheDocument();
    expect(screen.getByText(/"algorithm": "Ed25519"/)).toBeInTheDocument();
    expect(screen.getByText(/"verified": true/)).toBeInTheDocument();
  });

  it('restores the selected run evidence chain after inspecting a stream event', async () => {
    const user = userEvent.setup();
    installFetch({ '/api/runs': () => json({ data: [passingLoop()] }) });
    await renderApp();
    await screen.findByText('MEMORY / KERNEL RECORD');

    act(() => {
      streams()[0].emit('message', {
        id: 'evt-before-run',
        type: 'observation.received',
        stage: 'observe',
        message: 'Observation received for selection',
        status: 'active',
        timestamp: '2026-08-16T10:30:00.000Z',
      });
    });
    await user.click(
      await screen.findByRole('button', { name: /Observation received for selection/i })
    );
    expect(await screen.findByText('evt-before-run')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /obs-2026-08-16-1 verification passed/i }));

    expect(await screen.findByText('Evidence chain')).toBeInTheDocument();
    expect(screen.getByText('MEMORY / KERNEL RECORD')).toBeInTheDocument();
    expect(screen.queryByText('evt-before-run')).not.toBeInTheDocument();
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
    expect(screen.getAllByText('READY')).toHaveLength(3);
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

  it('opens the read-only Evidence timeline from the primary navigation', async () => {
    const user = userEvent.setup();
    installFetch({
      '/api/runs': () => json({ data: [passingLoop()] }),
      '/api/audit/events?limit=40': () =>
        json({
          data: [
            {
              id: 'evt-evidence-1',
              type: 'observation.created',
              stage: 'observe',
              message: 'Observation recorded',
              status: 'passed',
              timestamp: '2026-08-19T21:00:00.000Z',
              correlationId: 'corr-evidence-1',
              requestId: 'req-evidence-1',
            },
          ],
          meta: { bounded: true, limit: 40, total: 1 },
        }),
    });
    await renderApp();
    const nav = await screen.findByRole('navigation', { name: /primary navigation/i });
    await user.click(within(nav).getByRole('button', { name: /evidence/i }));

    const evidenceView = await screen.findByRole('region', { name: /evidence timeline/i });
    expect(
      within(evidenceView).getByRole('heading', { name: /evidence timeline/i })
    ).toBeInTheDocument();
    expect(within(evidenceView).getByText('Service X is healthy')).toBeInTheDocument();
    expect(within(evidenceView).getByText(/correlation corr-evidence-1/)).toBeInTheDocument();
    expect(
      within(evidenceView).getByText(/bounded evidence; they are not proof/)
    ).toBeInTheDocument();
    expect(
      within(evidenceView).getByRole('button', { name: /return to current/i })
    ).toBeInTheDocument();
  });

  it('reports navigating to a section not yet wired to the runtime', async () => {
    const user = userEvent.setup();
    await renderApp();

    await user.click(await screen.findByRole('button', { name: /agents/i }));

    expect(
      await screen.findByText(/Agents is not connected to the current runtime yet/)
    ).toBeInTheDocument();
  });

  /**
   * `navigate` has three branches: the "Current" item, an item matching a
   * known stage, and everything else (covered by the unwired-section test
   * above). Only the third branch had ever run; a nav click had never
   * resolved to a stage, and a stale error from an unwired section had never
   * been cleared by a later, valid navigation.
   */
  it('navigates to a known stage from the sidebar and clears a prior navigation error', async () => {
    const user = userEvent.setup();
    await renderApp();

    await user.click(await screen.findByRole('button', { name: /agents/i }));
    expect(
      await screen.findByText(/Agents is not connected to the current runtime yet/)
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Verify$/ }));

    expect(screen.getByText('Current / Verify')).toBeInTheDocument();
    expect(screen.getByText('VERIFY')).toBeInTheDocument();
    expect(
      screen.queryByText(/Agents is not connected to the current runtime yet/)
    ).not.toBeInTheDocument();
  });

  it('returns to Current from the sidebar and clears a prior navigation error', async () => {
    const user = userEvent.setup();
    await renderApp();

    await user.click(await screen.findByRole('button', { name: /agents/i }));
    expect(
      await screen.findByText(/Agents is not connected to the current runtime yet/)
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Current$/ }));

    expect(screen.getByText('Current / Current')).toBeInTheDocument();
    expect(screen.getByText('OBSERVE')).toBeInTheDocument();
    expect(
      screen.queryByText(/Agents is not connected to the current runtime yet/)
    ).not.toBeInTheDocument();
  });

  /**
   * The stage-flow row lets an operator jump straight to a stage without
   * going through the sidebar or the command palette. No test had ever
   * clicked one of its pills, so the handler had no coverage.
   */
  it('sets the active stage from a stage-flow pill', async () => {
    const user = userEvent.setup();
    await renderApp();

    await user.click(await screen.findByRole('button', { name: /03 verify/i }));

    expect(screen.getByText('VERIFY')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /03 verify/i })).toHaveClass('stage active');
  });

  /**
   * The claim textarea and status-code input each carry their own onChange
   * handler feeding /api/complete-loop's payload, mirroring how responseTime
   * already had a test. Neither had ever been typed into.
   */
  it('sends the operator-edited claim and status code rather than the defaults', async () => {
    const user = userEvent.setup();
    const fetchMock = installFetch();
    await renderApp();

    const claimInput = await screen.findByLabelText(/what should enter the current/i);
    await user.clear(claimInput);
    await user.type(claimInput, 'Payments API is degraded');

    const statusCodeInput = screen.getByLabelText(/status code/i);
    await user.clear(statusCodeInput);
    await user.type(statusCodeInput, '503');

    await user.click(screen.getByRole('button', { name: /run verification/i }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([url]) => url === '/api/complete-loop');
      expect(call).toBeDefined();
      const body = JSON.parse((call![1] as RequestInit).body as string);
      expect(body.claim).toBe('Payments API is degraded');
      expect(body.metadata.statusCode).toBe(503);
    });
  });

  it('reports a signature check failure from the API rather than showing a stale verdict', async () => {
    const user = userEvent.setup();
    installFetch({
      '/api/attest/verify': () => json({ message: 'verification engine offline' }, { status: 503 }),
    });
    await renderApp();

    await user.click(await screen.findByRole('button', { name: /run verification/i }));
    await screen.findByText('ATTESTATION');
    await user.click(screen.getByRole('button', { name: /verify signature/i }));

    expect(await screen.findByText(/verification engine offline/)).toBeInTheDocument();
    expect(await screen.findByText('INVALID')).toBeInTheDocument();
  });

  it('reports a revocation failure from the API and leaves the attestation valid', async () => {
    const user = userEvent.setup();
    installFetch({
      '/api/attest/revoke': () => json({ message: 'revocation policy denied' }, { status: 403 }),
    });
    await renderApp();

    await user.click(await screen.findByRole('button', { name: /run verification/i }));
    await screen.findByText('ATTESTATION');
    await user.type(screen.getByLabelText(/revocation reason/i), 'testing revocation failure');
    await user.click(screen.getByRole('button', { name: /revoke attestation/i }));

    expect(await screen.findByText('REVOCATION FAILED')).toBeInTheDocument();
    expect(await screen.findByText(/revocation policy denied/)).toBeInTheDocument();
  });

  /**
   * `authorizeAction`, `recordLearning`, and `proposeRecompile` complete the
   * MINI kernel loop (Act -> Learn -> Recompile) but had never been clicked
   * by a test: no test even referenced the "Authorize action" button. All of
   * their error branches, and most of their success branches, ran zero
   * times.
   */
  describe('act, learn, recompile loop', () => {
    const authorize = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.click(await screen.findByRole('button', { name: /run verification/i }));
      await screen.findByText('ATTESTATION');
      await user.click(screen.getByRole('button', { name: /authorize action/i }));
      await screen.findByText('ACTION AUTHORIZED');
    };

    it('authorizes an action, records learning, and proposes a recompile end to end', async () => {
      const user = userEvent.setup();
      const fetchMock = installFetch();
      await renderApp();

      await authorize(user);
      await user.click(screen.getByRole('button', { name: /record learning/i }));
      expect(await screen.findByText('LEARNING RECORDED')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /propose recompile/i }));
      expect(await screen.findByText('RECOMPILE PROPOSED')).toBeInTheDocument();

      const learnCall = fetchMock.mock.calls.find(([url]) => url === '/api/learn');
      expect(JSON.parse(String(learnCall?.[1]?.body))).toMatchObject({ outcome: 'success' });
    });

    /**
     * The learning-feedback outcome select and note input each carry their
     * own onChange handler feeding /api/learn's payload. The end-to-end test
     * above never touches either control, so both handlers, and the
     * non-default outcome values they enable, had no coverage.
     */
    it('sends the operator-selected outcome and note rather than the defaults', async () => {
      const user = userEvent.setup();
      const fetchMock = installFetch();
      await renderApp();

      await authorize(user);
      await user.selectOptions(screen.getByRole('combobox'), 'failure');
      await user.type(
        screen.getByPlaceholderText(/what did the action teach us/i),
        'Rate limit tripped before the retry backoff kicked in'
      );
      await user.click(screen.getByRole('button', { name: /record learning/i }));

      expect(await screen.findByText('LEARNING RECORDED')).toBeInTheDocument();
      const learnCall = fetchMock.mock.calls.find(([url]) => url === '/api/learn');
      expect(JSON.parse(String(learnCall?.[1]?.body))).toMatchObject({
        outcome: 'failure',
        note: 'Rate limit tripped before the retry backoff kicked in',
      });
    });

    it('denies authorization and surfaces the request id when the API rejects it', async () => {
      const user = userEvent.setup();
      installFetch({
        '/api/act': () =>
          json(
            { message: 'Action denied because verification did not pass' },
            { status: 409, headers: { 'x-request-id': 'req-act-99' } }
          ),
      });
      await renderApp();

      await user.click(await screen.findByRole('button', { name: /run verification/i }));
      await screen.findByText('ATTESTATION');
      await user.click(screen.getByRole('button', { name: /authorize action/i }));

      expect(await screen.findByText('ACTION DENIED')).toBeInTheDocument();
      expect(
        await screen.findByText(/Action denied because verification did not pass \[req-act-99\]/)
      ).toBeInTheDocument();
    });

    it('reports a learning recording failure without pretending it was recorded', async () => {
      const user = userEvent.setup();
      installFetch({
        '/api/learn': () => json({ message: 'operator policy denied' }, { status: 403 }),
      });
      await renderApp();

      await authorize(user);
      await user.click(screen.getByRole('button', { name: /record learning/i }));

      expect(await screen.findByText(/operator policy denied/)).toBeInTheDocument();
      expect(screen.queryByText('LEARNING RECORDED')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /propose recompile/i })).not.toBeInTheDocument();
    });

    it('reports when learning records are unavailable while proposing a recompile', async () => {
      const user = userEvent.setup();
      installFetch({ '/api/learning': () => json({}, { status: 500 }) });
      await renderApp();

      await authorize(user);
      await user.click(screen.getByRole('button', { name: /record learning/i }));
      await screen.findByText('LEARNING RECORDED');
      await user.click(screen.getByRole('button', { name: /propose recompile/i }));

      expect(await screen.findByText(/Learning records unavailable/)).toBeInTheDocument();
      expect(await screen.findByText('RECOMPILE FAILED')).toBeInTheDocument();
    });

    it('reports when no learning record exists to recompile from', async () => {
      const user = userEvent.setup();
      installFetch({ '/api/learning': () => json({ data: [] }) });
      await renderApp();

      await authorize(user);
      await user.click(screen.getByRole('button', { name: /record learning/i }));
      await screen.findByText('LEARNING RECORDED');
      await user.click(screen.getByRole('button', { name: /propose recompile/i }));

      expect(await screen.findByText(/No learning record is available/)).toBeInTheDocument();
      expect(await screen.findByText('RECOMPILE FAILED')).toBeInTheDocument();
    });

    it('reports a recompile proposal failure from the API', async () => {
      const user = userEvent.setup();
      installFetch({
        '/api/recompile': () => json({ message: 'compiler unavailable' }, { status: 500 }),
      });
      await renderApp();

      await authorize(user);
      await user.click(screen.getByRole('button', { name: /record learning/i }));
      await screen.findByText('LEARNING RECORDED');
      await user.click(screen.getByRole('button', { name: /propose recompile/i }));

      expect(await screen.findByText('RECOMPILE FAILED')).toBeInTheDocument();
      expect(await screen.findByText(/compiler unavailable/)).toBeInTheDocument();
    });
  });
});

/**
 * The command palette (⌘K) was entirely uncovered: opening it, the Tab
 * focus trap, Escape/backdrop dismissal, and all four quick actions ran zero
 * times under test. Its commands also share label text with buttons that
 * already exist in the main workspace ("Run verification" appears both as
 * the primary action and as a palette command), so every query below is
 * scoped to the dialog to prove it drives its own action rather than
 * happening to pass because the other button was clicked instead.
 */
describe('command palette', () => {
  beforeEach(() => {
    installFetch();
  });

  const openWithShortcut = async () => {
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    });
    return screen.findByRole('dialog', { name: /command palette/i });
  };

  it('opens with the ⌘K shortcut, focuses the first command, and closes on Escape', async () => {
    await renderApp();
    await screen.findByRole('button', { name: /run verification/i });

    const dialog = await openWithShortcut();
    expect(within(dialog).getByRole('button', { name: /observe/i })).toHaveFocus();

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(screen.queryByRole('dialog', { name: /command palette/i })).not.toBeInTheDocument();
  });

  it('closes when the backdrop is clicked and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    await renderApp();

    const trigger = screen.getByRole('button', { name: '⌘ K' });
    await user.click(trigger);
    const dialog = await screen.findByRole('dialog', { name: /command palette/i });

    // The palette itself stops propagation, so only a click landing on the
    // backdrop (the dialog's parent) should dismiss it.
    await user.click(dialog.parentElement as HTMLElement);

    expect(screen.queryByRole('dialog', { name: /command palette/i })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('runs verification from the palette command, not the main action button', async () => {
    const user = userEvent.setup();
    await renderApp();

    await user.click(screen.getByRole('button', { name: '⌘ K' }));
    const dialog = await screen.findByRole('dialog', { name: /command palette/i });
    await user.click(within(dialog).getByRole('button', { name: /run verification/i }));

    expect(await screen.findByText('OBSERVATION')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: /command palette/i })).not.toBeInTheDocument();
  });

  it('refreshes runtime state from the palette', async () => {
    const user = userEvent.setup();
    const fetchMock = installFetch();
    await renderApp();
    const callsBefore = fetchMock.mock.calls.filter(([url]) => url === '/api/state').length;

    await user.click(screen.getByRole('button', { name: '⌘ K' }));
    const dialog = await screen.findByRole('dialog', { name: /command palette/i });
    await user.click(within(dialog).getByRole('button', { name: /refresh runtime/i }));

    await waitFor(() => {
      const callsAfter = fetchMock.mock.calls.filter(([url]) => url === '/api/state').length;
      expect(callsAfter).toBeGreaterThan(callsBefore);
    });
    expect(screen.queryByRole('dialog', { name: /command palette/i })).not.toBeInTheDocument();
  });

  it('focuses the operator input via the Observe command', async () => {
    const user = userEvent.setup();
    await renderApp();

    await user.click(screen.getByRole('button', { name: '⌘ K' }));
    const dialog = await screen.findByRole('dialog', { name: /command palette/i });
    await user.click(within(dialog).getByRole('button', { name: /observe/i }));

    expect(screen.getByLabelText(/what should enter the current/i)).toHaveFocus();
    expect(screen.queryByRole('dialog', { name: /command palette/i })).not.toBeInTheDocument();
  });

  it('disables verify attestation from the palette until a run has produced a result', async () => {
    const user = userEvent.setup();
    await renderApp();

    await user.click(screen.getByRole('button', { name: '⌘ K' }));
    const dialog = await screen.findByRole('dialog', { name: /command palette/i });
    expect(within(dialog).getByRole('button', { name: /verify attestation/i })).toBeDisabled();
  });

  /**
   * The palette's "Verify attestation" command was only ever asserted as
   * disabled, never actually clicked once a run enabled it. Its own onClick
   * handler, distinct from the main workspace's identically-named button,
   * had no coverage.
   */
  it('verifies an attestation signature from the palette once a run has produced a result', async () => {
    const user = userEvent.setup();
    await renderApp();

    await user.click(await screen.findByRole('button', { name: /run verification/i }));
    await screen.findByText('ATTESTATION');

    await user.click(screen.getByRole('button', { name: '⌘ K' }));
    const dialog = await screen.findByRole('dialog', { name: /command palette/i });
    await user.click(within(dialog).getByRole('button', { name: /verify attestation/i }));

    expect(await screen.findByText('VALID')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: /command palette/i })).not.toBeInTheDocument();
  });

  it('traps Tab focus within the palette, wrapping in both directions', async () => {
    await renderApp();
    const dialog = await openWithShortcut();

    // Disabled buttons (Verify attestation, with no result yet) are excluded
    // from the trap, so the reachable set is Observe -> Run verification ->
    // Refresh runtime -> Open evidence, in that order.
    const observe = within(dialog).getByRole('button', { name: /observe/i });
    const run = within(dialog).getByRole('button', { name: /run verification/i });
    const refresh = within(dialog).getByRole('button', { name: /refresh runtime/i });
    const openEvidence = within(dialog).getByRole('button', { name: /open evidence/i });
    expect(observe).toHaveFocus();

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    });
    expect(run).toHaveFocus();

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    });
    expect(refresh).toHaveFocus();
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    });
    expect(openEvidence).toHaveFocus();
    // Forward from the last focusable control wraps back to the first.

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    });
    expect(observe).toHaveFocus();

    // Backward from the first focusable control wraps to the last.
    await act(async () => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true })
      );
    });
    expect(openEvidence).toHaveFocus();
  });
  it('clears a stale stream error and refreshes runtime when the stream reopens', async () => {
    const fetchMock = installFetch();
    await renderApp();
    await screen.findByRole('button', { name: /run verification/i });

    act(() => {
      streams()[0].error();
    });
    expect(await screen.findByText(/stream unavailable/i)).toBeInTheDocument();

    const healthCallsBeforeReopen = fetchMock.mock.calls.filter(
      ([url]) => url === '/api/health'
    ).length;

    act(() => {
      streams()[0].open();
    });

    await waitFor(() => {
      expect(screen.queryByText(/stream unavailable/i)).not.toBeInTheDocument();
    });
    await waitFor(() => {
      const healthCallsAfterReopen = fetchMock.mock.calls.filter(
        ([url]) => url === '/api/health'
      ).length;
      expect(healthCallsAfterReopen).toBeGreaterThan(healthCallsBeforeReopen);
    });
  });
});

describe('independent verification panel', () => {
  it('verifies a real attestation entirely in the browser', async () => {
    installFetch();
    await renderApp();

    const { generateKeyPairSync, sign } = await import('node:crypto');
    const pair = generateKeyPairSync('ed25519');
    const publicKeyPem = pair.publicKey.export({ type: 'spki', format: 'pem' }).toString();

    const attestation: Record<string, unknown> = {
      verificationId: 'ver-panel-1',
      observationId: 'obs-panel-1',
      verified: true,
      confidence: 0.95,
      ruleVersions: { 'status-code-check': '1.0.0' },
      attestedAt: '2026-08-17T00:00:00.000Z',
      attestedBy: 'attestation-service',
      keyVersion: '1',
      signingAlgorithm: 'Ed25519',
      status: 'signed',
      signature: '',
    };
    const payload: Record<string, unknown> = {};
    for (const field of [
      'verificationId',
      'observationId',
      'verified',
      'confidence',
      'ruleVersions',
      'attestedAt',
      'attestedBy',
      'keyVersion',
    ]) {
      payload[field] = attestation[field];
    }
    attestation.signature = `0x${sign(null, Buffer.from(JSON.stringify(payload)), pair.privateKey).toString('hex')}`;

    const user = userEvent.setup();
    await user.click(screen.getByLabelText(/attestation json/i));
    await user.paste(JSON.stringify(attestation));
    await user.click(screen.getByLabelText(/public key/i));
    await user.paste(publicKeyPem);

    // The control is disabled until both fields hold something. Clicking it
    // before then is a silent no-op: no handler, no crypto, no result, and
    // a failure that reads as "role=status not found" rather than "the
    // paste did not land". Waiting for enabled makes the precondition
    // explicit instead of assumed.
    const verify = screen.getByRole('button', { name: /verify locally/i });
    await waitFor(() => expect(verify).toBeEnabled());
    await user.click(verify);

    // Coverage instrumentation makes the real WebCrypto verification path
    // slower in hosted Node 20/22 runs. Keep this a bounded assertion-specific
    // budget; a missing or stalled result still fails the test.
    //
    // That last sentence only holds while this budget is reachable. It equalled
    // the suite-wide jest.setTimeout(30000), and this test spends seconds
    // before reaching here on renderApp, key generation, four userEvent
    // interactions and a waitFor — so jest always expired first and the wait
    // could never reach its own limit. See the explicit per-test timeout below.
    let result: HTMLElement;
    try {
      result = await screen.findByRole('status', undefined, { timeout: 30_000 });
    } catch (error) {
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}\nDOM at WebCrypto timeout:\n${document.body.innerHTML}`
      );
    }
    expect(within(result).getByText('VALID')).toBeInTheDocument();
    // The panel must never let a valid signature read as a valid decision.
    expect(
      within(result).getByText(/does not prove the verification was correct/i)
    ).toBeInTheDocument();
    // Total budget must exceed the 30s assertion budget above, or that budget
    // is unreachable and a stalled WebCrypto path is killed by jest instead of
    // failing on its own terms. The difference is not cosmetic: a jest timeout
    // aborts the test inside act(), which left every later test in this file
    // rendering an empty container — one stall became ten failures, and the
    // reported error named none of them.
  }, 90_000);

  it('reports invalid JSON without claiming the signature was forged', async () => {
    installFetch();
    await renderApp();

    const user = userEvent.setup();
    await user.click(screen.getByLabelText(/attestation json/i));
    await user.paste('{ not json');
    await user.click(screen.getByLabelText(/public key/i));
    await user.paste('-----BEGIN PUBLIC KEY-----\nAAAA\n-----END PUBLIC KEY-----');

    const verifyMalformed = screen.getByRole('button', { name: /verify locally/i });
    await waitFor(() => expect(verifyMalformed).toBeEnabled());
    await user.click(verifyMalformed);

    const result = await screen.findByRole('status');
    expect(within(result).getByText('INVALID')).toBeInTheDocument();
    expect(within(result).getByText(/not valid JSON/i)).toBeInTheDocument();
  });

  it('keeps the verify control disabled until both inputs are present', async () => {
    installFetch();
    await renderApp();

    const button = screen.getByRole('button', { name: /verify locally/i });
    expect(button).toBeDisabled();

    const user = userEvent.setup();
    await user.click(screen.getByLabelText(/attestation json/i));
    await user.paste('{}');
    expect(button).toBeDisabled();
  });
});

describe('dissent ledger', () => {
  const withSplit = (): void => {
    installFetch({
      '/api/dissensus': () =>
        json({ data: [splitDissensus()], meta: { window: 40, unresolved: 1 } }),
    });
  };

  it('shows nothing when no reconciliation has been recorded', async () => {
    installFetch();
    await renderApp();

    expect(screen.queryByText(/where the verifiers did not agree/i)).not.toBeInTheDocument();
  });

  it('renders a split as DISSENTING rather than as a failure', async () => {
    withSplit();
    await renderApp();

    const panel = await screen.findByText(/where the verifiers did not agree/i);
    const section = panel.closest('section') as HTMLElement;

    // A split is the system working, not an error. The word FAILED belongs
    // to the objecting opinion, never to the verdict.
    expect(within(section).getByText('DISSENTING')).toBeInTheDocument();
    expect(within(section).queryByText('SPLIT')).not.toBeInTheDocument();
  });

  it('shows every opinion, and marks the one that objected', async () => {
    withSplit();
    await renderApp();

    const section = (await screen.findByText(/where the verifiers did not agree/i)).closest(
      'section'
    ) as HTMLElement;

    // Both sides are visible. Showing only the majority would be the
    // erasure the engine refuses to perform.
    expect(within(section).getByText(/rules: PASSED/)).toBeInTheDocument();
    const objector = within(section).getByText(/model: FAILED/);
    expect(objector).toBeInTheDocument();
    expect(objector).toHaveClass('is-objecting');
  });

  it('says a human was routed to, and why', async () => {
    withSplit();
    await renderApp();

    const section = (await screen.findByText(/where the verifiers did not agree/i)).closest(
      'section'
    ) as HTMLElement;

    expect(within(section).getByText('ROUTED TO HUMAN')).toBeInTheDocument();
    expect(within(section).getByText(/1 passed, 1 failed/)).toBeInTheDocument();
  });

  it('states that the confidence shown is the minimum, not the mean', async () => {
    withSplit();
    await renderApp();

    const section = (await screen.findByText(/where the verifiers did not agree/i)).closest(
      'section'
    ) as HTMLElement;

    // 0.6 is the minimum; the mean of 0.9 and 0.6 would read 0.75 and
    // overstate how much the verifiers actually supported the claim.
    expect(within(section).getByText(/confidence 0\.6/)).toBeInTheDocument();
    expect(within(section).getByText(/never the mean/i)).toBeInTheDocument();
  });

  it('counts the unresolved reconciliations in the panel seal', async () => {
    withSplit();
    await renderApp();

    const section = (await screen.findByText(/where the verifiers did not agree/i)).closest(
      'section'
    ) as HTMLElement;

    expect(within(section).getByText('01')).toBeInTheDocument();
  });
});

describe('read-only local job evidence', () => {
  beforeEach(() => {
    installFetch();
  });

  it('renders the disabled boundary without worker controls', async () => {
    await renderApp();
    const panel = await screen.findByRole('region', { name: /local jobs/i });
    expect(within(panel).getByText(/local jobs are disabled/i)).toBeInTheDocument();
    expect(within(panel).getByText(/durable=false/i)).toBeInTheDocument();
    expect(
      within(panel).queryByRole('button', { name: /start|claim|retry|delete|cancel/i })
    ).not.toBeInTheDocument();
  });

  it('renders bounded running and terminal evidence as read-only text', async () => {
    installFetch({
      '/api/jobs?limit=20': () =>
        json({
          data: {
            jobs: [
              {
                id: 'job-running',
                state: 'running',
                attempt: 1,
                workerId: 'worker-a',
                createdAt: '2026-08-20T00:00:00.000Z',
                updatedAt: '2026-08-20T00:01:00.000Z',
                finishedAt: null,
                errorClass: null,
                provenance: { requestId: 'req-job', correlationId: 'corr-job' },
              },
              {
                id: 'job-failed',
                state: 'failed',
                attempt: 1,
                workerId: 'worker-b',
                createdAt: '2026-08-20T00:00:00.000Z',
                updatedAt: '2026-08-20T00:02:00.000Z',
                finishedAt: '2026-08-20T00:02:00.000Z',
                errorClass: 'fixture_failure',
                provenance: { requestId: 'req-failed', correlationId: null },
              },
            ],
            status: {
              enabled: true,
              durable: true,
              source: 'file',
              encryption: 'aes-256-gcm',
              counts: { queued: 0, running: 1, succeeded: 0, failed: 1, unknown: 0 },
              recentWindow: 40,
            },
          },
        }),
    });
    await renderApp();
    const panel = await screen.findByRole('region', { name: /local jobs/i });
    expect(within(panel).getByText('job-running')).toBeInTheDocument();
    expect(within(panel).getByText('job-failed')).toBeInTheDocument();
    expect(within(panel).getByText('storage=file')).toBeInTheDocument();
    expect(within(panel).getByText('encryption=aes-256-gcm')).toBeInTheDocument();
    expect(within(panel).getByText(/error class: fixture_failure/i)).toBeInTheDocument();
    expect(within(panel).getByText(/durable=true/i)).toBeInTheDocument();
    expect(within(panel).queryByRole('button')).not.toBeInTheDocument();
  });
});
