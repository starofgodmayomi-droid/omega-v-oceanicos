import { describe, expect, it } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InvisibleComputer } from '../../InvisibleComputer';
import { installFetch, json } from './harness';

describe('Invisible Computer external-model consent', () => {
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
    await user.click(screen.getByRole('button', { name: 'EXECUTE' }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/execute',
        expect.objectContaining({ body: JSON.stringify({ intent: 'Explain a bounded test', useExternalModel: false }) })
      );
    });

    await user.click(optIn);
    await user.clear(screen.getByRole('textbox', { name: 'What shall we make real?' }));
    await user.type(screen.getByRole('textbox', { name: 'What shall we make real?' }), 'Explain another bounded test');
    await user.click(screen.getByRole('button', { name: 'EXECUTE' }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/execute',
        expect.objectContaining({ body: JSON.stringify({ intent: 'Explain another bounded test', useExternalModel: true }) })
      );
    });
  });
});
