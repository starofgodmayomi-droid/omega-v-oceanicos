import { describe, expect, it } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InvisibleComputer, OmegaConsole } from '../../InvisibleComputer';
import { installFetch, json } from './harness';

describe('Invisible Computer external-model consent', () => {
  it('runs a fixed local action and renders its output and JSON evidence', async () => {
    const fetchMock = installFetch({
      '/api/v1/local-actions': () => json({ success: true, enabled: true, actions: [] }),
      '/api/v1/local-actions/runs': () => json({ success: true, runs: [] }),
      '/api/v1/local-actions/repo-status/run': () =>
        json({
          success: true,
          run: {
            id: 'run-1',
            actionId: 'repo-status',
            label: 'Repository status',
            status: 'SUCCEEDED',
            durationMs: 8,
            exitCode: 0,
            output: '## agent/local-workflow-actions',
            outputTruncated: false,
          },
        }),
    });
    const user = userEvent.setup();
    render(<OmegaConsole />);

    await user.type(screen.getByLabelText('API read token'), 'read-test');
    await user.type(screen.getByLabelText('API admin token'), 'admin-test');
    await user.click(screen.getByRole('button', { name: 'Connect' }));
    const checkStatus = await screen.findByRole('button', { name: 'Check Status' });
    await waitFor(() => expect(checkStatus).toBeEnabled());
    await user.click(checkStatus);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/v1/local-actions/repo-status/run', {
        method: 'POST',
        headers: { authorization: 'Bearer admin-test' },
      });
    });
    expect(await screen.findByText('## agent/local-workflow-actions')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'State' }));
    expect(screen.getByRole('complementary', { name: 'JSON state inspector' })).toHaveClass('is-open');
    expect(screen.getByText(/"Evidence"/)).toBeInTheDocument();
  });

  it('opens the command drawer and inserts a prompt starter', async () => {
    installFetch({});
    const user = userEvent.setup();
    render(<InvisibleComputer />);

    await user.click(screen.getByRole('button', { name: /prompts/i }));

    expect(screen.getByRole('button', { name: /prompts/i })).toHaveAttribute('aria-expanded', 'true');
    await user.click(screen.getByRole('button', { name: 'Build' }));
    expect(screen.getByRole('textbox', { name: 'What shall we make real?' })).toHaveValue('Build and test ');
  });

  it('preserves UNKNOWN when local-action availability cannot be observed', async () => {
    installFetch({
      '/api/v1/local-actions': () => json({ error: 'READ_ACCESS_REQUIRED' }, 401),
    });
    render(<InvisibleComputer />);

    expect(await screen.findByText('LOCAL ACTIONS · UNKNOWN')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check Status' })).toBeDisabled();
  });

  it('keeps provider use off by default and sends the selected value with execution', async () => {
    const fetchMock = installFetch({
      '/api/execute': () =>
        json({
          status: 'VERIFIED',
          intent: 'Explain a bounded test',
          response: 'A bounded local test response.',
          evidence_hash: 'a'.repeat(64),
          reason: null,
          matched_patterns: [],
          steps: [],
          contract: null,
          memory: null,
          engine: 'local-deterministic',
        }),
    });
    const user = userEvent.setup();
    render(<InvisibleComputer />);

    const optIn = screen.getByRole('checkbox', { name: /send this intent to the server-configured external model/i });
    expect(optIn).not.toBeChecked();
    await user.type(screen.getByRole('textbox', { name: 'What shall we make real?' }), 'Explain a bounded test');
    await user.click(screen.getByRole('button', { name: '[Execute]' }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/execute',
        expect.objectContaining({ body: JSON.stringify({ intent: 'Explain a bounded test', useExternalModel: false }) })
      );
    });

    await user.click(optIn);
    await user.clear(screen.getByRole('textbox', { name: 'What shall we make real?' }));
    await user.type(screen.getByRole('textbox', { name: 'What shall we make real?' }), 'Explain another bounded test');
    await user.click(screen.getByRole('button', { name: '[Execute]' }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/execute',
        expect.objectContaining({ body: JSON.stringify({ intent: 'Explain another bounded test', useExternalModel: true }) })
      );
    });
  });

  it('captures only observed API evidence and labels the witness as unsigned', async () => {
    const fetchMock = installFetch({
      '/api/execute': () =>
        json({
          status: 'UNKNOWN',
          intent: 'Check an inconclusive result',
          response: null,
          evidence_hash: null,
          reason: 'Evidence was incomplete.',
          matched_patterns: [],
          steps: [],
          contract: null,
          memory: null,
          engine: 'local-deterministic',
        }),
    });
    const user = userEvent.setup();
    render(<OmegaConsole />);

    const witness = screen.getByRole('button', { name: '[Witness]' });
    expect(witness).toBeDisabled();
    await user.type(
      screen.getByRole('textbox', { name: 'What shall we make real?' }),
      'Check an inconclusive result'
    );
    await user.click(screen.getByRole('button', { name: '[Execute]' }));
    await waitFor(() => expect(witness).toBeEnabled());
    await user.click(witness);

    expect(screen.getByText(/Witness snapshot captured · UNKNOWN/)).toBeInTheDocument();
    expect(screen.getByText(/no evidence hash · unsigned/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'State' }));
    expect(screen.getByText(/"status": "UNKNOWN"/)).toBeInTheDocument();
    expect(screen.getByText(/"attestation": "NOT_REQUESTED"/)).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/attest'))).toBe(false);
  });
});
