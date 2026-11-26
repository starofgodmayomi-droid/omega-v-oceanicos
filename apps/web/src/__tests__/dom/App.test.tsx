import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { act, cleanup, render, screen } from '@testing-library/react';
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

  it('folds the remaining background panels into collapsible groups', async () => {
    const user = userEvent.setup();
    await renderApp();

    await user.click(screen.getByRole('button', { name: /open background full-stack/i }));

    const wholeBody = screen.getByRole('button', { name: /whole body/i });
    expect(wholeBody).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById('panel-group-body')).not.toBeNull();

    const valueGroup = screen.getByRole('button', { name: /value & connections/i });
    expect(valueGroup).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById('panel-group-value')).toBeNull();

    await user.click(valueGroup);

    expect(valueGroup).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById('panel-group-value')).not.toBeNull();
  });

  it('opens and collapses every background group from one control', async () => {
    const user = userEvent.setup();
    await renderApp();

    await user.click(screen.getByRole('button', { name: /open all groups/i }));

    expect(document.getElementById('background-full-stack-workspace')).toHaveAttribute('aria-hidden', 'false');
    for (const id of ['body', 'voice', 'value', 'flow']) {
      expect(document.getElementById(`panel-group-${id}`)).not.toBeNull();
    }

    await user.click(screen.getByRole('button', { name: /collapse all groups/i }));

    for (const id of ['body', 'voice', 'value', 'flow']) {
      expect(document.getElementById(`panel-group-${id}`)).toBeNull();
    }
    expect(screen.getByRole('button', { name: /open all groups/i })).toBeInTheDocument();
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
