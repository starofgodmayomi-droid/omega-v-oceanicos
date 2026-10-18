import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { SystemControlsPanel } from '../../SystemControlsPanel';
import { theme } from '../../oceanicosTheme';

const mountControls = () => render(
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
    attestationData={null}
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

describe('system controls accessible names and contrast', () => {
  it('names the miner interval select for assistive technology', () => {
    mountControls();
    expect(screen.getByRole('combobox', { name: 'Miner interval' })).toBeInTheDocument();
  });

  it('uses a dark foreground for the bright accent cycle button', () => {
    mountControls();
    expect(screen.getByRole('button', { name: /Execute cycle/ })).toHaveStyle({
      background: theme.accent,
      color: theme.bg,
    });
  });
});
