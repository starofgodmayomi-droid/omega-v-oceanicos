import React, { useState, useEffect } from 'react';
import {
  fetchOmegaWorkers,
  proposeOmegaCommand,
  admitOmegaCommand,
  approveOmegaCommand,
  executeOmegaCommand,
  observeOmegaCommand,
  verifyRealityOmegaCommand,
  fetchOmegaCommands,
  type OmegaWorkerInfo,
  type OmegaCommandView,
  type OmegaCommandResultView,
} from './omega-api';

export const OmegaWorkspace: React.FC = () => {
  const [workers, setWorkers] = useState<OmegaWorkerInfo[]>([]);
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([
    'worker-observer',
    'worker-planner',
  ]);
  const [prompt, setPrompt] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [activeCommand, setActiveCommand] = useState<OmegaCommandView | null>(null);
  const [activeResult, setActiveResult] = useState<OmegaCommandResultView | null>(null);
  const [recentCommands, setRecentCommands] = useState<OmegaCommandView[]>([]);
  const [selectedObserverType, setSelectedObserverType] = useState<
    'git_working_tree' | 'api_health' | 'build_test'
  >('git_working_tree');

  useEffect(() => {
    loadWorkers();
    loadRecentCommands();
  }, []);

  const loadWorkers = async () => {
    try {
      const res = await fetchOmegaWorkers();
      if (res.success) setWorkers(res.workers);
    } catch {
      // API may be loading
    }
  };

  const loadRecentCommands = async () => {
    try {
      const res = await fetchOmegaCommands(10);
      if (res.success) setRecentCommands(res.commands);
    } catch {
      // API may be loading
    }
  };

  const handleToggleWorker = (workerId: string) => {
    if (selectedWorkers.includes(workerId)) {
      setSelectedWorkers(selectedWorkers.filter((id) => id !== workerId));
    } else {
      setSelectedWorkers([...selectedWorkers, workerId]);
    }
  };

  const handlePropose = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await proposeOmegaCommand(prompt, selectedWorkers);
      if (res.success) {
        setActiveCommand(res.command);
        setActiveResult(null);
        setPrompt('');
        loadRecentCommands();
      } else {
        setErrorMessage(res.error || 'Failed to propose command');
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdmit = async () => {
    if (!activeCommand) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await admitOmegaCommand(activeCommand.commandId);
      if (res.success) {
        setActiveCommand(res.command);
      } else {
        setErrorMessage(res.error || 'Admission check failed');
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!activeCommand) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await approveOmegaCommand(
        activeCommand.commandId,
        'human:web-operator@oceanicos.org',
        'Approved by dashboard human operator.'
      );
      if (res.success) {
        setActiveCommand(res.command);
      } else {
        setErrorMessage(res.error || 'Approval failed');
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!activeCommand) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await executeOmegaCommand(activeCommand.commandId);
      if (res.success) {
        setActiveCommand(res.command);
        setActiveResult(res.result);
      } else {
        setErrorMessage(res.error || 'Execution refused or failed');
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleObserveAndVerify = async () => {
    if (!activeCommand || !activeResult) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      // 1. Observe via selected deterministic engine
      const obsRes = await observeOmegaCommand(
        activeCommand.commandId,
        undefined,
        selectedObserverType,
        selectedObserverType === 'api_health' ? 'http://127.0.0.1:5000/health' : selectedObserverType
      );
      if (!obsRes.success) throw new Error(obsRes.error || 'Observation failed');

      // 2. Verify reality
      const verRes = await verifyRealityOmegaCommand(activeCommand.commandId);
      if (verRes.success) {
        setActiveCommand(verRes.command);
        setActiveResult(verRes.result);
        loadRecentCommands();
      } else {
        setErrorMessage(verRes.error || 'Reality verification failed');
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', color: '#e0f2fe' }}>
      {/* Header & Truth Weaver Radical Honesty Notice */}
      <div style={{ borderBottom: '1px solid rgba(56, 189, 248, 0.2)', paddingBottom: '16px', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '24px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Ω‑ƆREADƆS OS v∞</span>
          <span style={{ fontSize: '13px', background: 'rgba(56, 189, 248, 0.15)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
            Human Source • Verified Reality Loop
          </span>
        </h2>
        <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
          Human prompt is the source of intent. Bounded workers translate and propose. Kernel admits, executes, attests, and observes external reality.
        </p>
        <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(15, 23, 42, 0.6)', borderLeft: '3px solid #f59e0b', borderRadius: '4px', fontSize: '12px', color: '#cbd5e1' }}>
          <strong>RADICAL HONESTY:</strong> Execution receipts never equal reality health. First-class outcome states strictly distinguish:
          <span style={{ color: '#38bdf8', marginLeft: '6px' }}>DECLARED ➔ SIMULATED ➔ OBSERVED ➔ VERIFIED ➔ ATTESTED ➔ AUTHORIZED ➔ EXECUTED</span>
        </div>
      </div>

      {errorMessage && (
        <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '6px', color: '#fca5a5', marginBottom: '20px', fontSize: '13px' }}>
          <strong>Error:</strong> {errorMessage}
        </div>
      )}

      {/* Grid: Left Column Composer & Workers; Right Column Lifecycle Card */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.3fr', gap: '24px' }}>
        {/* Left Column: Prompt Composer & Workers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '8px', padding: '18px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#7dd3fc' }}>1. Human Intent Composer</h3>
            <textarea
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter bounded command prompt (e.g. Inspect architecture contracts, run allowlisted verification)..."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: '#030712',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: '6px',
                color: '#f8fafc',
                padding: '12px',
                fontSize: '13px',
                fontFamily: 'monospace',
                resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '11px', color: '#64748b' }}>
              <span>Secrets are automatically redacted before admission.</span>
              <span>{prompt.length} / 4096 chars</span>
            </div>

            <div style={{ marginTop: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8', marginBottom: '8px' }}>
                Requested Workers:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {workers.map((w) => {
                  const isSelected = selectedWorkers.includes(w.id);
                  const isMutating = w.classification === 'local-mutating';
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => handleToggleWorker(w.id)}
                      style={{
                        background: isSelected
                          ? isMutating
                            ? 'rgba(234, 179, 8, 0.2)'
                            : 'rgba(56, 189, 248, 0.2)'
                          : 'rgba(30, 41, 59, 0.5)',
                        border: isSelected
                          ? isMutating
                            ? '1px solid #eab308'
                            : '1px solid #38bdf8'
                          : '1px solid rgba(148, 163, 184, 0.2)',
                        color: isSelected ? '#f8fafc' : '#94a3b8',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>{isSelected ? '✓' : '+'}</span>
                      <span>{w.role}</span>
                      {isMutating && (
                        <span style={{ fontSize: '10px', background: '#eab308', color: '#000', padding: '1px 4px', borderRadius: '3px', fontWeight: 'bold' }}>
                          APPROVAL REQ
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={handlePropose}
              disabled={loading || !prompt.trim() || selectedWorkers.length === 0}
              style={{
                marginTop: '16px',
                width: '100%',
                padding: '10px',
                background: loading || !prompt.trim() ? '#1e293b' : '#0284c7',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                fontWeight: 600,
                fontSize: '13px',
                cursor: loading || !prompt.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Processing...' : 'Propose Candidate Command (Never Auto-Executes)'}
            </button>
          </div>

          {/* Recent Commands Feed */}
          {recentCommands.length > 0 && (
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(56, 189, 248, 0.15)', borderRadius: '8px', padding: '14px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8', marginBottom: '8px' }}>
                Recent Commands
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {recentCommands.map((c) => (
                  <div
                    key={c.commandId}
                    onClick={() => setActiveCommand(c)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 10px',
                      background: activeCommand?.commandId === c.commandId ? 'rgba(56, 189, 248, 0.15)' : 'rgba(30, 41, 59, 0.3)',
                      border: activeCommand?.commandId === c.commandId ? '1px solid #38bdf8' : '1px solid transparent',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontFamily: 'monospace', color: '#7dd3fc' }}>{c.commandId.slice(0, 14)}...</span>
                    <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#cbd5e1' }}>
                      {c.prompt}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        background:
                          c.status === 'VERIFIED'
                            ? '#065f46'
                            : c.status === 'REVIEW'
                            ? '#854d0e'
                            : c.status === 'DENIED'
                            ? '#991b1b'
                            : '#1e293b',
                        color: '#f8fafc',
                      }}
                    >
                      {c.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Active Command Lifecycle View */}
        <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '8px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#7dd3fc' }}>
            2. Lifecycle & Reality Attestation
          </h3>

          {!activeCommand ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', fontSize: '13px' }}>
              No active command. Propose a prompt or select a recent command to inspect its verified lifecycle.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Status Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#030712', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>COMMAND ID</div>
                  <div style={{ fontFamily: 'monospace', color: '#38bdf8', fontSize: '13px' }}>{activeCommand.commandId}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>LIFECYCLE STATUS</div>
                  <span
                    style={{
                      display: 'inline-block',
                      marginTop: '2px',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      background:
                        activeCommand.status === 'VERIFIED'
                          ? '#10b981'
                          : activeCommand.status === 'DIVERGENT'
                          ? '#f59e0b'
                          : activeCommand.status === 'DENIED'
                          ? '#ef4444'
                          : activeCommand.status === 'REVIEW'
                          ? '#eab308'
                          : '#0284c7',
                      color: '#000',
                    }}
                  >
                    {activeCommand.status}
                  </span>
                </div>
              </div>

              {/* Redaction Notice */}
              {activeCommand.redacted && (
                <div style={{ padding: '8px 12px', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid #eab308', borderRadius: '4px', fontSize: '12px', color: '#fef08a' }}>
                  🛡️ Sensitive credentials redacted: {activeCommand.redactedFields.join(', ')}
                </div>
              )}

              {/* Declarative IR Plan */}
              <div style={{ background: '#030712', padding: '12px', borderRadius: '6px', border: '1px solid rgba(148, 163, 184, 0.1)' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                  Declarative IR 1.0 Execution Plan (Non-Executable)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', fontFamily: 'monospace' }}>
                  {activeCommand.irPlan.workerPlan.map((step) => (
                    <div key={step.step} style={{ color: '#cbd5e1' }}>
                      <span style={{ color: '#38bdf8' }}>Step {step.step}:</span> [{step.workerId}] ➔ {step.action} ({step.readOnly ? 'read-only' : 'MUTATING'})
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '8px', fontSize: '11px', color: '#64748b' }}>
                  Target: {activeCommand.irPlan.transitionSpec.target} | Action: {activeCommand.irPlan.transitionSpec.action}
                </div>
              </div>

              {/* Action Buttons based on status */}
              <div style={{ display: 'flex', gap: '10px' }}>
                {activeCommand.status === 'PROPOSED' && (
                  <button
                    type="button"
                    onClick={handleAdmit}
                    disabled={loading}
                    style={{ flex: 1, padding: '8px', background: '#0284c7', border: 'none', borderRadius: '4px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Run Policy & Authority Admission
                  </button>
                )}

                {activeCommand.status === 'REVIEW' && (
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={loading}
                    style={{ flex: 1, padding: '8px', background: '#eab308', border: 'none', borderRadius: '4px', color: '#000', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Provide Human Approval (Attributable)
                  </button>
                )}

                {activeCommand.status === 'AUTHORIZED' && (
                  <button
                    type="button"
                    onClick={handleExecute}
                    disabled={loading}
                    style={{ flex: 1, padding: '8px', background: '#10b981', border: 'none', borderRadius: '4px', color: '#000', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Execute via Authorized Local Kernel
                  </button>
                )}

                {activeResult && (activeResult.status === 'EXECUTED' || activeResult.status === 'ATTESTED' || activeResult.status === 'VERIFIED' || activeResult.status === 'DIVERGENT') && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%' }}>
                    <select
                      value={selectedObserverType}
                      onChange={(e) => setSelectedObserverType(e.target.value as any)}
                      disabled={loading}
                      style={{
                        padding: '8px 10px',
                        background: '#090e18',
                        border: '1px solid rgba(139, 92, 246, 0.4)',
                        borderRadius: '4px',
                        color: '#c4b5fd',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <option value="git_working_tree">🌳 Git Working Tree (Status & HEAD)</option>
                      <option value="api_health">🩺 API Health & Ledger State</option>
                      <option value="build_test">📦 Monorepo Build Readiness</option>
                    </select>

                    <button
                      type="button"
                      onClick={handleObserveAndVerify}
                      disabled={loading}
                      style={{ flex: 1, padding: '8px', background: '#8b5cf6', border: 'none', borderRadius: '4px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      Probe Reality & Verify Discrepancies
                    </button>
                  </div>
                )}
              </div>

              {/* Execution Result & Attestation Card */}
              {activeResult && (
                <div style={{ background: '#030712', padding: '14px', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.25)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#38bdf8' }}>
                    Execution Consequence & Attestation
                  </div>
                  <div style={{ fontSize: '12px', color: '#e2e8f0' }}>
                    {activeResult.consequence}
                  </div>
                  {activeResult.attestationDigest && (
                    <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#94a3b8' }}>
                      Attestation Digest: <span style={{ color: '#10b981' }}>{activeResult.attestationDigest.slice(0, 24)}...</span>
                    </div>
                  )}
                  {activeResult.outputSummary && (
                    <pre style={{ margin: 0, padding: '8px', background: 'rgba(15, 23, 42, 0.8)', borderRadius: '4px', fontSize: '11px', color: '#93c5fd', whiteSpace: 'pre-wrap', maxHeight: '120px', overflowY: 'auto' }}>
                      {activeResult.outputSummary}
                    </pre>
                  )}

                  {/* Captured External Reality Observation */}
                  {activeResult.observation && (
                    <div style={{ padding: '10px', background: 'rgba(139, 92, 246, 0.12)', borderRadius: '4px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#c4b5fd', marginBottom: '4px' }}>
                        Captured Observation: {activeResult.observation.observerType} ({activeResult.observation.target})
                      </div>
                      <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#94a3b8' }}>
                        Hash: {activeResult.observation.stateHash?.slice(0, 20)}... | Time: {new Date(activeResult.observation.timestamp).toLocaleTimeString()}
                      </div>
                      <pre style={{ margin: '6px 0 0 0', padding: '6px', background: 'rgba(5, 10, 20, 0.8)', borderRadius: '4px', fontSize: '10px', color: '#a5b4fc', maxHeight: '80px', overflowY: 'auto' }}>
                        {JSON.stringify(activeResult.observation.observedData, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Dissent Notes if present */}
                  {activeResult.dissentNotes && activeResult.dissentNotes.length > 0 && (
                    <div style={{ padding: '8px', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid #eab308', borderRadius: '4px', fontSize: '11px', color: '#fef08a' }}>
                      <strong>Preserved Dissent / Reviewer Notes:</strong>
                      <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                        {activeResult.dissentNotes.map((note, idx) => (
                          <li key={idx}>{note}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Reality Verdict */}
                  {activeResult.realityVerdict && (
                    <div style={{ marginTop: '6px', padding: '10px', background: activeResult.realityVerdict.verdict === 'VERIFIED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', borderRadius: '4px', border: activeResult.realityVerdict.verdict === 'VERIFIED' ? '1px solid #10b981' : '1px solid #f59e0b' }}>
                      <div style={{ fontSize: '12px', fontWeight: 'bold', color: activeResult.realityVerdict.verdict === 'VERIFIED' ? '#34d399' : '#fbbf24' }}>
                        Reality Verdict: {activeResult.realityVerdict.verdict}
                      </div>
                      {activeResult.realityVerdict.discrepancies.length > 0 && (
                        <div style={{ marginTop: '4px', fontSize: '11px', color: '#fca5a5' }}>
                          Discrepancies: {activeResult.realityVerdict.discrepancies.join('; ')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default OmegaWorkspace;
