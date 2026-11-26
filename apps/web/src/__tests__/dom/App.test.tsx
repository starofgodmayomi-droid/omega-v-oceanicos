import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LegacyDashboard } from '../../LegacyDashboard';
import { installFetch, json } from './harness';

describe('legacy OceanicOS dashboard', () => {
  beforeEach(() => {
    installFetch();
  });

  afterEach(() => {
    cleanup();
  });

  const renderApp = async () => {
    await act(async () => {
      render(<LegacyDashboard onClose={() => {}} />);
    });
  };

  it('keeps the front surface visible and the detailed workspace collapsed by default', async () => {
    await renderApp();

    expect(screen.getByRole('heading', { level: 1, name: /what shall we make real/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Invisible Online Computer' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /open background full-stack/i })
    ).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById('background-full-stack-workspace')).toHaveAttribute(
      'aria-hidden',
      'true'
    );
  });

  it('shows a proposed command receipt without executing it', async () => {
    const fetchMock = installFetch({
      '/api/v1/omega/commands': () =>
        json({
          success: true,
          command: { commandId: 'omega-front-receipt-1', status: 'PROPOSED', intent: 'Map AI SOUL.' },
          status: 'PROPOSED',
          nextAction: 'admit the command with explicit authority and policy evidence',
        }),
    });
    const user = userEvent.setup();
    await renderApp();

    await user.type(
      screen.getByPlaceholderText("Tell me what you're trying to do…"),
      'Map AI SOUL.'
    );
    await user.click(screen.getByRole('button', { name: '→' }));

    const receipt = await screen.findByRole('status', { name: 'Command receipt' });
    expect(receipt).toHaveTextContent('Command PROPOSED · not executed');
    expect(receipt).toHaveTextContent('omega-front-receipt-1');
    expect(fetchMock.mock.calls.some(([url, init]) =>
      url === '/api/v1/omega/commands/omega-front-receipt-1/execute'
      || (init as { method?: string } | undefined)?.method?.toUpperCase() === 'POST'
        && url !== '/api/v1/omega/commands'
    )).toBe(false);
  });

  it('surfaces a proposal error instead of showing a successful receipt', async () => {
    installFetch({
      '/api/v1/omega/commands': () => json({ message: 'command service unavailable' }, { status: 503 }),
    });
    const user = userEvent.setup();
    await renderApp();

    await user.type(
      screen.getByPlaceholderText("Tell me what you're trying to do…"),
      'Review the current state.'
    );
    await user.click(screen.getByRole('button', { name: '→' }));

    expect(await screen.findByText('command service unavailable')).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Command receipt' })).not.toBeInTheDocument();
  });

  it('compresses the background panels into collapsed groups that expand on demand', async () => {
    const user = userEvent.setup();
    await renderApp();

    await user.click(screen.getByRole('button', { name: /open background full-stack/i }));

    const organsHeader = screen.getByRole('button', { name: /ambient organs/i });
    const organsSection = document.getElementById('organs-section');
    expect(organsHeader).toHaveAttribute('aria-expanded', 'false');
    expect(organsSection).toHaveStyle({ display: 'none' });
    expect(
      screen.queryByRole('region', { name: 'ƆREADE symbolic intent console' })
    ).not.toBeInTheDocument();

    await user.click(organsHeader);

    expect(organsHeader).toHaveAttribute('aria-expanded', 'true');
    expect(organsSection).toHaveStyle({ display: 'block' });
    expect(
      await screen.findByRole('region', { name: 'ƆREADE symbolic intent console' })
    ).toBeInTheDocument();
  });

  it('opens the intent flow group when a proposed command is reviewed', async () => {
    installFetch({
      '/api/v1/omega/commands': () =>
        json({
          success: true,
          command: { commandId: 'omega-front-receipt-1', status: 'PROPOSED', intent: 'Map AI SOUL.' },
          status: 'PROPOSED',
          nextAction: 'admit the command with explicit authority and policy evidence',
        }),
    });
    const user = userEvent.setup();
    await renderApp();

    await user.type(
      screen.getByPlaceholderText("Tell me what you're trying to do…"),
      'Map AI SOUL.'
    );
    await user.click(screen.getByRole('button', { name: '→' }));

    const receipt = await screen.findByRole('status', { name: 'Command receipt' });
    expect(document.getElementById('flow-section')).toHaveStyle({ display: 'none' });

    await user.click(within(receipt).getByRole('button', { name: /review & authorize/i }));

    expect(document.getElementById('flow-section')).toHaveStyle({ display: 'block' });
  });
});
