import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../App';
import { installFetch, json } from './harness';

describe('current Oceanicos app shell', () => {
  beforeEach(() => {
    installFetch();
  });

  afterEach(() => {
    cleanup();
  });

  const renderApp = async () => {
    await act(async () => {
      render(<App />);
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
});
