import { describe, expect, it } from '@jest/globals';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';
import { App as AppSurface } from '../../App';
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

  it('turns an organ choice into a draft prompt without submitting an action', async () => {
    const fetchMock = installFetch();
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: /AI SOUL/i }));
    await user.click(screen.getByRole('button', { name: /continue with this draft/i }));

    expect(screen.getByPlaceholderText("Tell me what you're trying to do…")).toHaveValue('Map AI SOUL.');
    expect(
      fetchMock.mock.calls.some(([, init]) => {
        const options = init as { method?: string } | undefined;
        return options?.method?.toUpperCase() === 'POST';
      })
    ).toBe(false);
  });

  it('starts with the older panels collapsed behind a toggle', async () => {
    installFetch();
    render(<AppSurface surface="dashboard" />);

    expect(await screen.findByRole('region', { name: 'Whole ecosystem command surface' })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Tell me what you're trying to do…")).not.toBeInTheDocument();
    expect(screen.queryByText('What shall we make real?')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Legacy panels' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('reveals the older panels in place instead of navigating to another page', async () => {
    installFetch();
    const user = userEvent.setup();
    render(<AppSurface surface="dashboard" />);

    await user.click(await screen.findByRole('button', { name: 'Legacy panels' }));

    expect(
      within(screen.getByRole('region', { name: 'Legacy console panels' })).getByPlaceholderText(
        "Tell me what you're trying to do…"
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hide legacy panels' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('link', { name: /legacy panels/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Hide legacy panels' }));

    expect(screen.queryByRole('region', { name: 'Legacy console panels' })).not.toBeInTheDocument();
  });

  it('drafts an organ prompt on the dashboard and offers it to the legacy panels', async () => {
    const fetchMock = installFetch();
    const user = userEvent.setup();
    render(<AppSurface surface="dashboard" />);

    await user.click(await screen.findByRole('button', { name: /AI SOUL/i }));

    expect(screen.getByText('DRAFT · Map AI SOUL.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue with this draft/i })).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([, init]) => {
        const options = init as { method?: string } | undefined;
        return options?.method?.toUpperCase() === 'POST';
      })
    ).toBe(false);
  });

  it('opens the toggle already expanded for the legacy deep link', async () => {
    installFetch();
    render(<AppSurface surface="legacy" />);

    expect(await screen.findByPlaceholderText("Tell me what you're trying to do…")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hide legacy panels' })).toBeInTheDocument();
  });

  it('prefills the legacy prompt from the dashboard handoff', async () => {
    installFetch();
    window.history.pushState({}, '', '/console/legacy?intent=Map%20AI%20SOUL.');
    try {
      render(<AppSurface surface="legacy" />);
      expect(await screen.findByPlaceholderText("Tell me what you're trying to do…")).toHaveValue('Map AI SOUL.');
    } finally {
      window.history.pushState({}, '', '/');
    }
  });
});
