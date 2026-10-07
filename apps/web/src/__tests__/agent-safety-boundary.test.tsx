import { render, screen } from '@testing-library/react';
import { AgentSafetyBoundaryPanel } from '../AgentSafetyBoundaryPanel';

describe('AgentSafetyBoundaryPanel', () => {
  it('keeps missing evidence unknown or not executed', () => {
    render(
      <AgentSafetyBoundaryPanel
        capabilityObserved={false}
        policySatisfied={false}
        humanGateRequired={false}
        leaseObserved={false}
        executed={false}
        observedStatus={undefined}
        revocationObserved={false}
        reconciliationStatus={undefined}
      />
    );

    expect(screen.getByRole('region', { name: 'Agent safety boundary' })).toBeInTheDocument();
    expect(screen.getByText('0/8 verified')).toBeInTheDocument();
    expect(screen.getAllByText('Unknown')).toHaveLength(5);
    expect(screen.getAllByText('NOT_EXECUTED')).toHaveLength(3);
  });
});
