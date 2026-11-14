import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConnectorPanel, type ConnectorAuth } from '../../ConnectorPanel';
import { installFetch, json } from './harness';

function authenticatedUser(): ConnectorAuth {
  return {
    isLoading: false,
    isAuthenticated: true,
    login: jest.fn(async () => {}),
    logout: jest.fn(async () => {}),
    getAccessToken: jest.fn(async () => 'auth0-api-access-token'),
  };
}

describe('connector observation panel', () => {
  it('keeps connector actions unavailable when Auth0 is not configured', () => {
    const fetchMock = installFetch();
    render(<ConnectorPanel />);

    expect(screen.getByText(/Auth0 is not configured/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /approve this exact read/i })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('starts Auth0 sign-in before making connector actions available', async () => {
    const user = userEvent.setup();
    const auth = { ...authenticatedUser(), isAuthenticated: false };
    render(<ConnectorPanel auth={auth} />);

    await user.click(screen.getByRole('button', { name: /sign in with auth0/i }));

    expect(auth.login).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: /approve this exact read/i })).not.toBeInTheDocument();
  });

  it('approves the displayed connector and sends that approval with the separate run request', async () => {
    const fetchMock = installFetch({
      '/api/v1/omega/connectors/approvals': () =>
        json({ success: true, approval: { id: 'approval-1', expiresAt: 1_900_000_000 } }, { status: 201 }),
      '/api/v1/omega/connectors/observe': () =>
        json({
          success: true,
          status: 'VERIFIED',
          authorized: true,
          executed: true,
          observed: true,
          expectedObservation: 'github repository metadata',
          actualObservation: 'github:starofgodmayomi-droid/omega-v-oceanicos:metadata',
          evidence: 'server-observed public repository metadata',
          issues: [],
          observedAt: '2026-11-13T00:00:00.000Z',
          admission: { decision: 'ALLOW', admitted: true },
        }),
    });
    const user = userEvent.setup();
    render(<ConnectorPanel auth={authenticatedUser()} />);

    expect(screen.getByText('starofgodmayomi-droid/omega-v-oceanicos')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /approve this exact read/i }));
    expect(await screen.findByRole('status', { name: 'Connector approval' })).toHaveTextContent(
      'single use',
    );

    const approvalCall = fetchMock.mock.calls.find(([url]) => url === '/api/v1/omega/connectors/approvals');
    expect(approvalCall).toBeDefined();
    const approvalInit = approvalCall?.[1] as RequestInit;
    const approvalHeaders = new Headers(approvalInit.headers);
    expect(approvalHeaders.get('Authorization')).toBe('Bearer auth0-api-access-token');
    expect(approvalHeaders.get('Content-Type')).toBe('application/json');
    const approvalBody = JSON.parse(approvalInit.body as string) as {
      connector: { id: string; scope: string[]; mode: string };
    };
    expect(approvalBody.connector).toMatchObject({
      id: 'github.read-repository',
      scope: ['repo:starofgodmayomi-droid/omega-v-oceanicos'],
      mode: 'read-only',
    });

    await user.click(screen.getByRole('button', { name: /run approved read/i }));
    expect(await screen.findByText('VERIFIED')).toBeInTheDocument();
    const observeCall = fetchMock.mock.calls.find(([url]) => url === '/api/v1/omega/connectors/observe');
    expect(observeCall).toBeDefined();
    const observeInit = observeCall?.[1] as RequestInit;
    const observeHeaders = new Headers(observeInit.headers);
    expect(JSON.parse(observeInit.body as string)).toMatchObject({
      approvalId: 'approval-1',
      liveAdapter: 'github-public-repository',
      connector: { id: 'github.read-repository' },
    });
    expect(observeHeaders.get('Authorization')).toBe('Bearer auth0-api-access-token');
    expect(observeHeaders.get('Content-Type')).toBe('application/json');
  });

  it('shows server policy denial and never exposes the run action without an approval', async () => {
    const fetchMock = installFetch({
      '/api/v1/omega/connectors/approvals': () =>
        json({ success: false, error: 'CONNECTOR_POLICY_DENIED' }, { status: 403 }),
    });
    const user = userEvent.setup();
    render(<ConnectorPanel auth={authenticatedUser()} />);

    await user.click(screen.getByRole('button', { name: /approve this exact read/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('CONNECTOR_POLICY_DENIED');
    expect(screen.queryByRole('button', { name: /run approved read/i })).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/v1/omega/connectors/observe')).toBe(false);
  });
});
