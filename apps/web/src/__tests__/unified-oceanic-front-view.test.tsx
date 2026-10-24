import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import { UnifiedOceanicFrontView } from '../UnifiedOceanicFrontView';

const baseProps = {
  intent: '', onIntentChange: jest.fn(), onSubmit: jest.fn(), loading: false,
  streamConnected: false, simulationMode: true, humanGateRequired: true,
  realityStatus: null, ledgerIntegrity: null, ecosystemBody: null, command: null,
};

describe('unified OceanicOS conversational front view', () => {
  it('renders a single conversation surface and keeps absent signals unknown', () => {
    render(<UnifiedOceanicFrontView {...baseProps} />);
    expect(screen.getByRole('region', {name:'OceanicOS unified conversational front view'})).toBeInTheDocument();
    expect(screen.getByRole('region', {name:'Conversation with the OceanicOS full-stack assistant'})).toBeInTheDocument();
    expect(screen.getByText('Snapshot unavailable')).toBeInTheDocument();
    expect(screen.getAllByText('UNKNOWN').length).toBeGreaterThan(0);
    expect(screen.getByText('Consequential actions require a human authorization gate.')).toBeInTheDocument();
  });
  it('drafts an organ prompt without executing it', () => {
    const onIntentChange=jest.fn(), onSubmit=jest.fn();
    render(<UnifiedOceanicFrontView {...baseProps} onIntentChange={onIntentChange} onSubmit={onSubmit}/>);
    fireEvent.click(screen.getByRole('button',{name:/Notion/i}));
    expect(onIntentChange).toHaveBeenCalledWith(expect.stringContaining('Notion'));
    expect(onSubmit).not.toHaveBeenCalled();
  });
  it('submits a non-empty intent through the supplied handler', () => {
    const onSubmit=jest.fn();
    render(<UnifiedOceanicFrontView {...baseProps} intent="Map the body" onSubmit={onSubmit}/>);
    fireEvent.submit(screen.getByRole('form',{name:'OceanicOS intent submission'}));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
  it('does not submit empty or in-flight requests', () => {
    const onSubmit=jest.fn();
    const {rerender}=render(<UnifiedOceanicFrontView {...baseProps} onSubmit={onSubmit}/>);
    fireEvent.submit(screen.getByRole('form',{name:'OceanicOS intent submission'}));
    expect(onSubmit).not.toHaveBeenCalled();
    rerender(<UnifiedOceanicFrontView {...baseProps} intent="Inspect state" loading onSubmit={onSubmit}/>);
    fireEvent.submit(screen.getByRole('form',{name:'OceanicOS intent submission'}));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
