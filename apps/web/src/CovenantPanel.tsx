import React, { useState, useEffect } from 'react';
import { theme } from './oceanicosTheme';
import {
  fetchCovenants as loadCovenantsApi,
  transitionCovenantApi,
  verifySanctumApi,
  type CovenantRecordView as CovenantRecord,
} from './omega-api';

interface CovenantPanelProps {
  onClose?: () => void;
}

function getStatusBadgeStyle(status: string) {
  switch (status) {
    case 'FULFILLED':
      return { background: 'rgba(0, 245, 160, 0.18)', border: '1px solid #00f5a0', color: '#00f5a0' };
    case 'SEALED':
      return { background: 'rgba(168, 85, 247, 0.18)', border: '1px solid #a855f7', color: '#c084fc' };
    case 'TESTED':
      return { background: 'rgba(234, 179, 8, 0.18)', border: '1px solid #eab308', color: '#facc15' };
    case 'BREACHED':
      return { background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#f87171' };
    case 'RESTORED':
      return { background: 'rgba(56, 189, 248, 0.18)', border: '1px solid #38bdf8', color: '#38bdf8' };
    case 'PROMISED':
    default:
      return { background: 'rgba(148, 163, 184, 0.15)', border: '1px solid #94a3b8', color: '#cbd5e1' };
  }
}

function getSanctumBadge(sanctum: string) {
  switch (sanctum) {
    case 'HOLY_OF_HOLIES':
      return { icon: '👑', label: 'Holy of Holies (L0/L1 Human Root)', color: '#fbbf24' };
    case 'HOLY_PLACE':
      return { icon: '📜', label: 'Holy Place (L2/L3 Bounded Calculus)', color: '#38bdf8' };
    case 'OUTER_COURT':
    default:
      return { icon: '🏛️', label: 'Outer Court (L4 Execution & Runtime)', color: '#94a3b8' };
  }
}

export const CovenantPanel: React.FC<CovenantPanelProps> = ({ onClose }) => {
  const [covenants, setCovenants] = useState<CovenantRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [evidenceInput, setEvidenceInput] = useState('');
  const [selectedCovenantId, setSelectedCovenantId] = useState<string>('cov-genesis-1111');

  const fetchCovenants = async () => {
    setLoading(true);
    try {
      const data = await loadCovenantsApi();
      if (data && data.covenants) {
        setCovenants(data.covenants);
        if (!selectedCovenantId && data.covenants.length > 0) {
          setSelectedCovenantId(data.covenants[0].covenantId);
        }
      }
    } catch {
      setActionFeedback('Failed to connect to /v1/covenant endpoint');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCovenants();
  }, []);

  const handleTransition = async (targetStatus: string, requireEvidence = false) => {
    if (requireEvidence && !evidenceInput.trim()) {
      setActionFeedback('Reality-First Invariant: Evidence receipt is strictly required to fulfill a covenant!');
      return;
    }

    setLoading(true);
    setActionFeedback(null);
    try {
      const data = await transitionCovenantApi({
        covenantId: selectedCovenantId,
        targetStatus,
        requestedBy: 'did:omega:human:starofgodmayomi',
        reason: `Transition to ${targetStatus} via Web Covenant Console`,
        evidenceReceipts: evidenceInput.trim() ? [evidenceInput.trim()] : [],
        stewardSignature: 'sig-steward-web-session-root',
      });

      if (data && data.success) {
        setActionFeedback(`✓ Transitioned to ${targetStatus}: ${data.rationale}`);
        setEvidenceInput('');
        await fetchCovenants();
      } else {
        setActionFeedback(`✗ Transition Denied: ${data?.rationale || data?.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      setActionFeedback(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSanctumProbe = async (sanctum: 'HOLY_OF_HOLIES' | 'OUTER_COURT', withSteward: boolean) => {
    setLoading(true);
    setActionFeedback(null);
    try {
      const data = await verifySanctumApi({
        sanctum,
        requesterDid: withSteward ? 'did:omega:human:starofgodmayomi' : 'worker:unauthorized-probe',
        stewardSignature: withSteward ? 'sig-valid-steward' : undefined,
      });

      if (data && data.allowed) {
        setActionFeedback(`✓ Sanctum Access Allowed for ${sanctum} (Steward Verified)`);
      } else {
        setActionFeedback(`🛡️ Fail-Closed Triggered: Access to ${sanctum} was denied per Constitution!`);
      }
    } catch (err: any) {
      setActionFeedback(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const activeCovenant = covenants.find((c) => c.covenantId === selectedCovenantId) || covenants[0];

  return (
    <div
      style={{
        background: 'rgba(4, 18, 29, 0.95)',
        border: '1px solid rgba(0, 245, 160, 0.35)',
        borderRadius: theme.radius,
        backdropFilter: 'blur(16px)',
        padding: '24px',
        color: '#f8fafc',
        boxShadow: '0 12px 48px rgba(0, 0, 0, 0.6), 0 0 24px rgba(0, 245, 160, 0.1)',
        marginBottom: '24px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>📜</span>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#00f5a0', letterSpacing: '-0.3px' }}>
              Biblical Engine — Covenant State Machine & Sanctum Trace
            </h2>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              &ldquo;One root. One current. Infinite forms.&rdquo; • Fail-closed on uncertainty • Reality as final authority
            </div>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '18px',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '13px',
            fontFamily: theme.fontMono,
            background: actionFeedback.startsWith('✓') ? 'rgba(0, 245, 160, 0.12)' : 'rgba(239, 68, 68, 0.15)',
            border: actionFeedback.startsWith('✓') ? '1px solid rgba(0, 245, 160, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
            color: actionFeedback.startsWith('✓') ? '#00f5a0' : '#fca5a5',
          }}
        >
          {actionFeedback}
        </div>
      )}

      {/* Covenant Selection Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '6px' }}>
        {covenants.map((cov) => {
          const badge = getStatusBadgeStyle(cov.status);
          const isSelected = cov.covenantId === selectedCovenantId;
          return (
            <button
              key={cov.covenantId}
              onClick={() => setSelectedCovenantId(cov.covenantId)}
              style={{
                padding: '8px 14px',
                borderRadius: theme.radiusPill,
                border: isSelected ? '1px solid #00f5a0' : '1px solid rgba(148, 163, 184, 0.2)',
                background: isSelected ? 'rgba(0, 245, 160, 0.15)' : 'rgba(15, 23, 42, 0.6)',
                color: isSelected ? '#ffffff' : '#94a3b8',
                fontFamily: theme.fontSans,
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
              }}
            >
              <span>{cov.title}</span>
              <span
                style={{
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontFamily: theme.fontMono,
                  ...badge,
                }}
              >
                {cov.status}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Covenant Card */}
      {activeCovenant && (
        <div
          style={{
            background: 'rgba(2, 10, 20, 0.75)',
            border: '1px solid rgba(0, 245, 160, 0.2)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px',
          }}
        >
          {/* Header Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#64748b', fontFamily: theme.fontMono }}>
                ID: {activeCovenant.covenantId}
              </div>
              <h3 style={{ margin: '4px 0 6px', fontSize: '16px', fontWeight: 600, color: '#f1f5f9' }}>
                {activeCovenant.title}
              </h3>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {/* Sanctum Badge */}
              {(() => {
                const s = getSanctumBadge(activeCovenant.thread.sanctum);
                return (
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: theme.radiusPill,
                      fontSize: '11px',
                      fontWeight: 600,
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: `1px solid ${s.color}`,
                      color: s.color,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>{s.icon}</span>
                    <span>{s.label}</span>
                  </span>
                );
              })()}
              {/* Status Badge */}
              <span
                style={{
                  padding: '4px 12px',
                  borderRadius: theme.radiusPill,
                  fontSize: '12px',
                  fontWeight: 700,
                  fontFamily: theme.fontMono,
                  ...getStatusBadgeStyle(activeCovenant.status),
                }}
              >
                {activeCovenant.status}
              </span>
            </div>
          </div>

          {/* Lineage & Ancestry */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '12px',
              marginBottom: '16px',
              fontSize: '11.5px',
              fontFamily: theme.fontMono,
            }}
          >
            <div style={{ padding: '8px 12px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '6px' }}>
              <span style={{ color: '#64748b' }}>Steward DID:</span>
              <div style={{ color: '#38bdf8', marginTop: '2px', wordBreak: 'break-all' }}>
                {activeCovenant.thread.stewardDid}
              </div>
            </div>
            <div style={{ padding: '8px 12px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '6px' }}>
              <span style={{ color: '#64748b' }}>Covenant State Hash:</span>
              <div style={{ color: '#a855f7', marginTop: '2px', wordBreak: 'break-all' }}>
                {activeCovenant.thread.covenantStateHash.slice(0, 16)}...{activeCovenant.thread.covenantStateHash.slice(-8)}
              </div>
            </div>
            <div style={{ padding: '8px 12px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '6px' }}>
              <span style={{ color: '#64748b' }}>Attestation Proof:</span>
              <div style={{ color: activeCovenant.attestationHash ? '#00f5a0' : '#64748b', marginTop: '2px' }}>
                {activeCovenant.attestationHash ? `${activeCovenant.attestationHash.slice(0, 16)}...` : 'Unsealed / Pending'}
              </div>
            </div>
          </div>

          {/* Terms List */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>
              Bound Constitutional Terms:
            </div>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6' }}>
              {activeCovenant.terms.map((t, idx) => (
                <li key={idx}>{t}</li>
              ))}
            </ul>
          </div>

          {/* Interactive State Machine Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid rgba(148, 163, 184, 0.15)' }}>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Covenant Actions:</span>

            {activeCovenant.status === 'PROMISED' && (
              <button
                onClick={() => handleTransition('SEALED')}
                disabled={loading}
                style={{
                  padding: '6px 14px',
                  borderRadius: theme.radiusPill,
                  border: '1px solid #a855f7',
                  background: 'rgba(168, 85, 247, 0.2)',
                  color: '#e9d5ff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ✍️ Seal with Steward Signature
              </button>
            )}

            {activeCovenant.status === 'SEALED' && (
              <button
                onClick={() => handleTransition('TESTED')}
                disabled={loading}
                style={{
                  padding: '6px 14px',
                  borderRadius: theme.radiusPill,
                  border: '1px solid #eab308',
                  background: 'rgba(234, 179, 8, 0.2)',
                  color: '#fef08a',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ⚖️ Submit to Wilderness Testing
              </button>
            )}

            {activeCovenant.status === 'TESTED' && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Receipt ID or evidence hash..."
                  value={evidenceInput}
                  onChange={(e) => setEvidenceInput(e.target.value)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid rgba(0, 245, 160, 0.4)',
                    background: 'rgba(15, 23, 42, 0.8)',
                    color: '#fff',
                    fontSize: '12px',
                    fontFamily: theme.fontMono,
                  }}
                />
                <button
                  onClick={() => handleTransition('FULFILLED', true)}
                  disabled={loading}
                  style={{
                    padding: '6px 14px',
                    borderRadius: theme.radiusPill,
                    border: '1px solid #00f5a0',
                    background: 'rgba(0, 245, 160, 0.2)',
                    color: '#00f5a0',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ✓ Fulfill with Reality Evidence
                </button>
              </div>
            )}

            {activeCovenant.status !== 'BREACHED' && (
              <button
                onClick={() => handleTransition('BREACHED')}
                disabled={loading}
                style={{
                  padding: '6px 14px',
                  borderRadius: theme.radiusPill,
                  border: '1px solid rgba(239, 68, 68, 0.5)',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#fca5a5',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginLeft: 'auto',
                }}
              >
                ⚠️ Trigger Test Breach (Fail-Closed)
              </button>
            )}

            {activeCovenant.status === 'BREACHED' && (
              <button
                onClick={() => handleTransition('RESTORED', true)}
                disabled={loading}
                style={{
                  padding: '6px 14px',
                  borderRadius: theme.radiusPill,
                  border: '1px solid #38bdf8',
                  background: 'rgba(56, 189, 248, 0.2)',
                  color: '#bae6fd',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                🕊️ Restore in Truth-in-Love
              </button>
            )}
          </div>
        </div>
      )}

      {/* Temple Thread Sanctum Probe Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          background: 'rgba(15, 23, 42, 0.6)',
          borderRadius: '8px',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          fontSize: '12px',
        }}
      >
        <span style={{ color: '#94a3b8' }}>
          Temple Thread Sanctum Gate Check (Fail-Closed Barrier Probe):
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => handleSanctumProbe('HOLY_OF_HOLIES', false)}
            style={{
              padding: '4px 10px',
              borderRadius: theme.radiusPill,
              border: '1px solid rgba(239, 68, 68, 0.4)',
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#f87171',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            Probe Holy of Holies (Unsigned ➔ Fail-Closed)
          </button>
          <button
            onClick={() => handleSanctumProbe('HOLY_OF_HOLIES', true)}
            style={{
              padding: '4px 10px',
              borderRadius: theme.radiusPill,
              border: '1px solid rgba(0, 245, 160, 0.4)',
              background: 'rgba(0, 245, 160, 0.15)',
              color: '#00f5a0',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            Probe Holy of Holies (Steward Signed ➔ Pass)
          </button>
        </div>
      </div>
    </div>
  );
};
