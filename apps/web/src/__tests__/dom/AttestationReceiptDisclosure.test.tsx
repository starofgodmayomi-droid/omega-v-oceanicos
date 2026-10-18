import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { SystemControlsPanel } from '../../SystemControlsPanel';

const renderReceipt = (verified: boolean) =>
  render(
    <SystemControlsPanel
      onCycle={() => undefined}
      cycleLoading={false}
      minerActive={false}
      minerInterval={5000}
      onToggleMiner={() => undefined}
      onSetMinerInterval={() => undefined}
      meshSimulation={null}
      meshLoading={false}
      onRunMesh={() => undefined}
      attestationData={{
        signingAlgorithm: 'HMAC-SHA256',
        verified,
        confidence: 1,
        signature: 'fixture-signature-not-a-secret',
      }}
      attestLoading={false}
      onRequestAttestation={() => undefined}
      moodData={null}
      onFetchMood={() => undefined}
      keyPair={null}
      onGenerateWebCrypto={() => undefined}
      onGenerateServerKeys={() => undefined}
      signRequests={false}
      onSetSignRequests={() => undefined}
    />,
  );

describe('attestation receipt claim boundary', () => {
  it('labels the server-reported result without claiming independent verification', () => {
    renderReceipt(true);

    expect(screen.getByText(/Attestation receipt · HMAC-SHA256/)).toBeInTheDocument();
    expect(document.body.textContent).toContain('Server-reported verification claim: YES');
    expect(document.body.textContent).toContain('API-reported confidence: 100%');
    expect(screen.getByRole('note', { name: 'Attestation evidence boundary' })).toHaveTextContent(
      /has not independently verified the signature or the underlying observation/i,
    );
    expect(document.body.textContent).not.toContain('Verified: YES');
  });

  it('does not upgrade a negative server-reported claim', () => {
    renderReceipt(false);

    expect(document.body.textContent).toContain('Server-reported verification claim: NO');
    expect(screen.getByRole('note', { name: 'Attestation evidence boundary' })).toBeInTheDocument();
  });
});