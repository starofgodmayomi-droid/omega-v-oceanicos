import { describe, expect, it } from '@jest/globals';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LegacyDashboard } from '../../LegacyDashboard';
import { installFetch, json } from './harness';

describe('legacy OceanicOS dashboard', () => {
  it('renders the whole-ecosystem surface without promoting unqueried sources to verified', async () => {
    installFetch();
    render(<LegacyDashboard onClose={() => {}} />);

    await userEvent.click(await screen.findByRole('button', { name: /open background full-stack/i }));
    const dashboard = await screen.findByRole('region', { name: 'Whole ecosystem command surface' });
    expect(within(dashboard).getByRole('img', { name: /conceptual OCEANICOS system map/i })).toBeInTheDocument();
    expect(within(dashboard).getByText(/relationships shown, not live topology/i)).toBeInTheDocument();
    expect(within(dashboard).getByText(/0 of 5 listed signals are marked VERIFIED in this view/i)).toBeInTheDocument();
    expect(within(dashboard).getByText('hosted CI is not queried by this screen')).toBeInTheDocument();
    expect(within(dashboard).getByText('no external authority inferred')).toBeInTheDocument();
  });

  it('shows the command the front prompt created and opens the workspace on request', async () => {
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
    render(<LegacyDashboard onClose={() => {}} />);

    const workspace = document.getElementById('background-full-stack-workspace');
    expect(workspace).not.toBeNull();
    expect(workspace).toHaveStyle({ display: 'none' });

    await user.type(
      screen.getByPlaceholderText("Tell me what you're trying to do…"),
      'Map AI SOUL.'
    );
    await user.click(screen.getByRole('button', { name: '→' }));

    const receipt = await screen.findByRole('status', { name: 'Command receipt' });
    expect(within(receipt).getByText('omega-front-receipt-1')).toBeInTheDocument();
    expect(within(receipt).getByText(/command proposed/i)).toBeInTheDocument();
    expect(workspace).toHaveStyle({ display: 'none' });

    await user.click(within(receipt).getByRole('button', { name: /review & authorize/i }));
    expect(workspace).toHaveStyle({ display: 'block' });
  });

  it('turns an organ choice into a draft prompt without submitting an action', async () => {
    const fetchMock = installFetch();
    const user = userEvent.setup();
    render(<LegacyDashboard onClose={() => {}} />);

    await user.click(await screen.findByRole('button', { name: /open background full-stack/i }));
    await user.click(await screen.findByRole('button', { name: /AI SOUL/i }));

    expect(screen.getByPlaceholderText("Tell me what you're trying to do…")).toHaveValue('Map AI SOUL.');
    expect(
      fetchMock.mock.calls.some(([, init]) => {
        const options = init as { method?: string } | undefined;
        return options?.method?.toUpperCase() === 'POST';
      })
    ).toBe(false);
  });

  it('syncs Notion schema reconciliation summary inside WholeEcosystemDashboard', async () => {
    installFetch({
      '/api/v1/notion/schema-sync': () =>
        json({
          success: true,
          status: 'VERIFIED',
          sync: {
            id: 'notion.schema.sync.v1',
            schemaName: 'omega.notion.ledger.v1',
            schemaHash: 'd2f0e74c688dd56c10a46adebf7548df',
            observationSummary: {
              count: 1,
              integrity: true,
              latestHash: 'abc123',
              latestStatus: 'VERIFIED',
              liveNotionObserved: true,
            },
          },
        }),
    });
    const user = userEvent.setup();
    render(<LegacyDashboard onClose={() => {}} />);

    await user.click(await screen.findByRole('button', { name: /open background full-stack/i }));
    const syncPanel = screen.getByLabelText('Notion schema sync reconciliation');
    expect(within(syncPanel).getByText(/UNKNOWN · no schema sync observation supplied/i)).toBeInTheDocument();

    await user.click(within(syncPanel).getByRole('button', { name: /SYNC NOTION SCHEMA/i }));
    expect(await within(syncPanel).findByText(/omega\.notion\.ledger\.v1 · d2f0e74c688d/i)).toBeInTheDocument();
    expect(within(syncPanel).getByText(/Observations: 1 \(VERIFIED\)/i)).toBeInTheDocument();
  });
});
