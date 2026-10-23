import { describe, expect, it } from '@jest/globals';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';
import { installFetch } from './harness';

describe('current OceanicOS app shell', () => {
  it('renders the whole-ecosystem surface without promoting unqueried sources to verified', async () => {
    installFetch();
    render(<App />);

    const dashboard = await screen.findByRole('region', { name: 'Whole ecosystem command surface' });
    expect(within(dashboard).getByRole('img', { name: /conceptual OCEANICOS system map/i })).toBeInTheDocument();
    expect(within(dashboard).getByText(/relationships shown, not live topology/i)).toBeInTheDocument();
    expect(within(dashboard).getByText(/0 of 5 listed signals are marked VERIFIED in this view/i)).toBeInTheDocument();
    expect(within(dashboard).getByText('hosted CI is not queried by this screen')).toBeInTheDocument();
    expect(within(dashboard).getByText('no external authority inferred')).toBeInTheDocument();
  });

  it('renders read-only status evidence and preserves unknown deployment state', async () => {
    installFetch();
    render(<App />);
    const panel = await screen.findByRole('region', { name: 'Read-only ecosystem status evidence' });
    expect(within(panel).getByText(/Reality Observation/)).toBeInTheDocument();
    expect(within(panel).getByText(/Distribution & Deployment — UNKNOWN/)).toBeInTheDocument();
    expect(within(panel).getByText(/does not prove deployment or external service availability/)).toBeInTheDocument();
  });

  it('shows an explicit error when the status evidence endpoint is unavailable', async () => {
    installFetch({ '/api/v1/ecosystem/status': () => {
      const status = 503;
      return {
        ok: false, status,
        json: async () => ({ error: 'status unavailable' }),
        text: async () => JSON.stringify({ error: 'status unavailable' }),
        headers: { get: () => 'application/json' }
      };
    }});
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/status unavailable/i);
  });

  it('turns an organ choice into a draft prompt without submitting an action', async () => {
    const fetchMock = installFetch();
    const user = userEvent.setup();
    render(<App />);

    const frontView = await screen.findByRole('region', { name: 'OceanicOS unified conversational front view' });
    await user.click(within(frontView).getByRole('button', { name: /AI SOUL/i }));

    expect(screen.getByLabelText('Your intent')).toHaveValue(
      'Map AI SOUL: purpose, implementation, authority boundary, runtime state, and evidence.'
    );
    expect(
      fetchMock.mock.calls.some(([, init]) => {
        const options = init as { method?: string } | undefined;
        return options?.method?.toUpperCase() === 'POST';
      })
    ).toBe(false);
  });
});
