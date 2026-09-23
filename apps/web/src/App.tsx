import React, { useState, useEffect, useRef } from 'react';
import { EcosystemPanel } from './EcosystemPanel';
import { RealityPanel } from './RealityPanel';
import { TransitionProvenancePanel } from './TransitionProvenancePanel';
import { AmbientBar } from './AmbientBar';
import { IntentFlow } from './IntentFlow';
import { DeepSection } from './DeepSection';
import { SystemControlsPanel } from './SystemControlsPanel';
import { MultiJobPanel } from './MultiJobPanel';
import { ObservationStreamPanel } from './ObservationStreamPanel';
import {
  theme,
  statusColor,
  humanStatus,
  KeyPair,
  MeshConvergenceReceipt,
  KernelCapabilitySnapshot,
} from './oceanicosTheme';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), init);
  const text = await response.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`API returned invalid JSON (${response.status})`);
  }
  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || `API request failed (${response.status})`);
  }
  return payload as T;
}

const MODE_BUTTONS = [
  { icon: '✦', label: 'Create', template: 'Create a new ' },
  { icon: '◇', label: 'Explore', template: 'Explore the current state of ' },
  { icon: '⚙', label: 'Build', template: 'Build and test ' },
  { icon: '◎', label: 'Change', template: 'Change ' },
];

export function App() {
  const [tip, setTip] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [streamConnected, setStreamConnected] = useState(false);
  const [keyPair, setKeyPair] = useState<KeyPair | null>(null);
  const [signRequests, setSignRequests] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  const [minerActive, setMinerActive] = useState(false);
  const [minerInterval, setMinerInterval] = useState(5000);
  const [minerStats, setMinerStats] = useState<{ totalMined: number; lastBlockTime: string }>({
    totalMined: 0,
    lastBlockTime: '',
  });

  const [meshSimulation, setMeshSimulation] = useState<MeshConvergenceReceipt | null>(null);
  const [meshLoading, setMeshLoading] = useState(false);

  const [moodData, setMoodData] = useState<any>(null);
  const [attestationData, setAttestationData] = useState<any>(null);
  const [attestLoading, setAttestLoading] = useState(false);
  const [kernelCapabilities, setKernelCapabilities] = useState<KernelCapabilitySnapshot | null>(null);
  const [kernelCapabilitiesError, setKernelCapabilitiesError] = useState<string | null>(null);
  const [omegaIntent, setOmegaIntent] = useState('');
  const [omegaCommand, setOmegaCommand] = useState<any>(null);
  const [omegaLoading, setOmegaLoading] = useState(false);

  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  const eventSourceRef = useRef<EventSource | null>(null);

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openSection = (id: string) => {
    setOpenSections((prev) => new Set(prev).add(id));
  };

  const fetchMinerStatus = async () => {
    try {
      const data = await apiRequest<any>('/v1/miner/status');
      if (data.success && data.miner) {
        setMinerActive(data.miner.active);
        setMinerInterval(data.miner.intervalMs);
        setMinerStats({
          totalMined: data.miner.totalMined,
          lastBlockTime: data.miner.lastBlockTime,
        });
      }
    } catch {
      /* ambient — don't surface miner status errors */
    }
  };

  const fetchKernelCapabilities = async () => {
    try {
      const data = await apiRequest<{ success: boolean; capability?: KernelCapabilitySnapshot }>(
        '/v1/kernel/capabilities'
      );
      if (!data.success || !data.capability) throw new Error('invalid capability response');
      setKernelCapabilities(data.capability);
      setKernelCapabilitiesError(null);
    } catch (err: any) {
      setKernelCapabilities(null);
      setKernelCapabilitiesError(
        err instanceof Error ? err.message : 'capability snapshot unavailable'
      );
    }
  };

  const fetchMood = async () => {
    try {
      const data = await apiRequest<any>('/v1/mood');
      setMoodData(data);
    } catch {
      /* ambient */
    }
  };

  useEffect(() => {
    fetchMinerStatus();
    fetchKernelCapabilities();
    fetchMood();

    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;
    let attempt = 0;

    const connect = () => {
      if (disposed) return;
      es?.close();
      try {
        es = new EventSource(apiUrl('/v1/stream'));
        eventSourceRef.current = es;

        es.onopen = () => {
          attempt = 0;
          setReconnectAttempt(0);
          setStreamConnected(true);
          setLastError(null);
        };

        es.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.block) {
              setTip(payload.block);
              setHistory((prev) => {
                const exists = prev.some((b) => b.hash === payload.block.hash);
                if (exists) return prev;
                return [payload.block, ...prev.slice(0, 14)];
              });
              setMinerStats((prev) => ({
                totalMined: prev.totalMined + 1,
                lastBlockTime: payload.block.timestamp,
              }));
            }
          } catch {
            /* skip malformed event */
          }
        };

        es.onerror = () => {
          es?.close();
          setStreamConnected(false);
          attempt += 1;
          setReconnectAttempt(attempt);
          void fetchTipFallback();
          const delay = Math.min(30_000, 1_000 * 2 ** Math.min(attempt - 1, 4));
          reconnectTimer = setTimeout(connect, delay);
        };
      } catch {
        setStreamConnected(false);
      }
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      es?.close();
    };
  }, []);

  const fetchTipFallback = async () => {
    try {
      const d = await apiRequest<any>('/v1/block/tip');
      if (d.tip) {
        setTip(d.tip);
        setHistory((prev) => (prev.length === 0 ? [d.tip] : prev));
      }
    } catch {
      /* ambient */
    }
  };

  const proposeOmegaCommand = async () => {
    setOmegaLoading(true);
    setLastError(null);
    try {
      const data = await apiRequest<any>('/v1/omega/commands', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          intent: omegaIntent,
          requestedBy: 'dashboard-user',
          workers: ['planner', 'tester'],
          idempotencyKey: `dashboard-${Date.now()}`,
          context: { stateBefore: tip?.hash ?? 'unknown', observationKind: 'supplied-state' },
        }),
      });
      setOmegaCommand(data);
    } catch (err: any) {
      setLastError(err.message);
    } finally {
      setOmegaLoading(false);
    }
  };

  const observeOmegaReality = async () => {
    if (!omegaCommand?.command?.commandId) return;
    setOmegaLoading(true);
    try {
      const data = await apiRequest<any>(
        `/v1/omega/commands/${omegaCommand.command.commandId}/observe`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            observedState:
              omegaCommand.command.change.stateAfter ?? tip?.hash ?? 'unknown',
          }),
        }
      );
      setOmegaCommand(data);
    } catch (err: any) {
      setLastError(err.message);
    } finally {
      setOmegaLoading(false);
    }
  };

  const approveOmegaCommand = async () => {
    if (!omegaCommand?.command?.commandId) return;
    setOmegaLoading(true);
    try {
      const data = await apiRequest<any>(
        `/v1/omega/commands/${omegaCommand.command.commandId}/approve`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ operator: 'dashboard-operator' }),
        }
      );
      setOmegaCommand(data);
    } catch (err: any) {
      setLastError(err.message);
    } finally {
      setOmegaLoading(false);
    }
  };

  const executeOmegaCommand = async () => {
    if (!omegaCommand?.command?.commandId) return;
    setOmegaLoading(true);
    try {
      const data = await apiRequest<any>(
        `/v1/omega/commands/${omegaCommand.command.commandId}/execute`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({}),
        }
      );
      setOmegaCommand(data);
    } catch (err: any) {
      setLastError(err.message);
    } finally {
      setOmegaLoading(false);
    }
  };

  const generateServerKeys = async () => {
    try {
      const data = await apiRequest<any>('/v1/auth/keypair', { method: 'POST' });
      if (data.success) {
        setKeyPair({
          publicKey: data.publicKey,
          privateKey: data.privateKey,
          type: 'ED25519_SERVER',
        });
        setSignRequests(true);
      }
    } catch (err: any) {
      setLastError(err.message);
    }
  };

  const generateWebCryptoKeys = async () => {
    try {
      if (!window.crypto || !window.crypto.subtle) {
        throw new Error('WebCrypto API not supported');
      }
      const keyPairGen = await window.crypto.subtle.generateKey(
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['sign', 'verify']
      );
      const exportedPub = await window.crypto.subtle.exportKey('spki', keyPairGen.publicKey);
      const pubB64 = btoa(String.fromCharCode(...new Uint8Array(exportedPub)));
      const pemPub = `-----BEGIN PUBLIC KEY-----\n${pubB64.match(/.{1,64}/g)?.join('\n')}\n-----END PUBLIC KEY-----`;
      setKeyPair({
        publicKey: pemPub,
        privateKey: '[SECURE_ENCLAVE_HARDWARE_PROTECTED_KEY]',
        type: 'WEBCRYPTO_ENCLAVE',
      });
      setSignRequests(true);
    } catch (err: any) {
      await generateServerKeys();
    }
  };

  const toggleMiner = async () => {
    try {
      if (minerActive) {
        const data = await apiRequest<any>('/v1/miner/stop', { method: 'POST' });
        if (data.success) setMinerActive(false);
      } else {
        const data = await apiRequest<any>('/v1/miner/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ intervalMs: minerInterval }),
        });
        if (data.success) setMinerActive(true);
      }
    } catch (err: any) {
      setLastError(err.message);
    }
  };

  const runMeshSimulation = async () => {
    setMeshLoading(true);
    setLastError(null);
    try {
      const data = await apiRequest<any>('/v1/mesh/simulate');
      if (data.success && data.convergence) {
        setMeshSimulation(data.convergence);
      }
    } catch (err: any) {
      setLastError(err.message);
    } finally {
      setMeshLoading(false);
    }
  };

  const requestAttestation = async () => {
    setAttestLoading(true);
    setLastError(null);
    try {
      const data = await apiRequest<any>('/v1/attest', { method: 'POST' });
      if (data.success && data.attestation) {
        setAttestationData(data.attestation);
      }
    } catch (err: any) {
      setLastError(err.message);
    } finally {
      setAttestLoading(false);
    }
  };

  const cycle = async () => {
    setLoading(true);
    setLastError(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (signRequests && keyPair) {
        if (keyPair.type === 'ED25519_SERVER') {
          const signData = await apiRequest<any>('/v1/block/sign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: 'EXECUTE_OMNI_CYCLE', privateKey: keyPair.privateKey }),
          });
          if (signData.signature) {
            headers['x-omega-signature'] = signData.signature;
            headers['x-omega-public-key'] = keyPair.publicKey;
          }
        }
      }
      const data = await apiRequest<any>('/v1/cycle', {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });
      if (!data.success) {
        setLastError(data.error || 'Cycle execution rejected');
      } else if (data.block) {
        setTip(data.block);
      }
    } catch (err: any) {
      setLastError(err.message);
      await fetchTipFallback();
    } finally {
      setLoading(false);
    }
  };

  const dismissCommand = () => {
    setOmegaCommand(null);
    setOmegaIntent('');
  };

  const simulationMode = kernelCapabilities?.execution === 'SIMULATION';
  const humanGateRequired = kernelCapabilities?.humanAuthorizationRequired ?? true;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: theme.bgGradient,
        color: theme.text,
        fontFamily: theme.fontSans,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Ambient status bar */}
      <AmbientBar
        connected={streamConnected}
        reconnectAttempt={reconnectAttempt}
        simulationMode={simulationMode}
        identityActive={!!keyPair}
        realityStatus={tip?.evidence?.status ?? null}
        epochsRemembered={history.length}
        miningActive={minerActive}
      />

      {/* Error toast */}
      {lastError && (
        <div
          style={{
            margin: '12px 28px 0',
            padding: '10px 16px',
            borderRadius: theme.radiusSmall,
            background: `${theme.warning}11`,
            border: `1px solid ${theme.warning}33`,
            color: theme.warning,
            fontSize: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{lastError}</span>
          <button
            onClick={() => setLastError(null)}
            style={{
              background: 'none',
              border: 'none',
              color: theme.warning,
              cursor: 'pointer',
              fontSize: '14px',
              padding: '0 4px',
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Main surface */}
      <main
        style={{
          maxWidth: '720px',
          width: '100%',
          margin: '0 auto',
          padding: '60px 24px 40px',
          flex: 1,
        }}
      >
        {/* Logo */}
        <div
          style={{
            fontSize: '13px',
            fontWeight: 800,
            letterSpacing: '0.2em',
            color: theme.accent,
            textAlign: 'center',
            marginBottom: '8px',
          }}
        >
          💧 OCEANICOS
        </div>

        {/* Prompt */}
        <h1
          style={{
            fontSize: '28px',
            fontWeight: 600,
            color: theme.text,
            textAlign: 'center',
            margin: '0 0 28px',
            letterSpacing: '-0.5px',
          }}
        >
          What shall we make real?
        </h1>

        {/* Input */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'stretch',
          }}
        >
          <input
            value={omegaIntent}
            onChange={(e) => setOmegaIntent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && omegaIntent.trim() && !omegaLoading) {
                proposeOmegaCommand();
              }
            }}
            maxLength={2000}
            placeholder="Tell me what you're trying to do…"
            style={{
              flex: 1,
              padding: '14px 18px',
              background: theme.surface,
              border: `1px solid ${theme.borderBright}`,
              borderRadius: theme.radiusPill,
              color: theme.text,
              fontFamily: theme.fontSans,
              fontSize: '15px',
              outline: 'none',
            }}
          />
          <button
            onClick={proposeOmegaCommand}
            disabled={omegaLoading || !omegaIntent.trim()}
            style={{
              padding: '0 22px',
              borderRadius: theme.radiusPill,
              border: 'none',
              background: omegaLoading || !omegaIntent.trim() ? `${theme.accent}44` : theme.accent,
              color: theme.bg,
              fontFamily: theme.fontSans,
              fontSize: '18px',
              fontWeight: 700,
              cursor: omegaLoading || !omegaIntent.trim() ? 'not-allowed' : 'pointer',
              opacity: omegaLoading || !omegaIntent.trim() ? 0.5 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            →
          </button>
        </div>

        {/* Mode buttons */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            marginTop: '14px',
            flexWrap: 'wrap',
          }}
        >
          {MODE_BUTTONS.map((mode) => (
            <button
              key={mode.label}
              onClick={() => setOmegaIntent(mode.template)}
              style={{
                padding: '8px 16px',
                borderRadius: theme.radiusPill,
                border: `1px solid ${theme.border}`,
                background: 'transparent',
                color: theme.textMuted,
                fontFamily: theme.fontSans,
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'border-color 0.2s, color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = theme.borderBright;
                e.currentTarget.style.color = theme.text;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = theme.border;
                e.currentTarget.style.color = theme.textMuted;
              }}
            >
              {mode.icon} {mode.label}
            </button>
          ))}
        </div>

        {/* Intent flow card */}
        <IntentFlow
          command={omegaCommand}
          loading={omegaLoading}
          onApprove={approveOmegaCommand}
          onExecute={executeOmegaCommand}
          onObserve={observeOmegaReality}
          onViewEvidence={() => openSection('reality')}
          onViewTimeline={() => openSection('provenance')}
          onDismiss={dismissCommand}
          simulationMode={simulationMode}
          humanGateRequired={humanGateRequired}
        />

        <MultiJobPanel />
      </main>

      {/* Deep sections */}
      <div
        style={{
          maxWidth: '960px',
          width: '100%',
          margin: '0 auto',
          padding: '0 24px 60px',
        }}
      >
        <DeepSection
          id="reality"
          title="Reality Verification"
          subtitle="What the system knows and doesn't know"
          isOpen={openSections.has('reality')}
          onToggle={toggleSection}
        >
          <RealityPanel />
        </DeepSection>

        <DeepSection
          id="ecosystem"
          title="Ecosystem Status"
          subtitle="Capability layers and evidence"
          isOpen={openSections.has('ecosystem')}
          onToggle={toggleSection}
        >
          <EcosystemPanel />
        </DeepSection>

        <DeepSection
          id="provenance"
          title="Transition Provenance"
          subtitle="τ-record lineage and event trail"
          isOpen={openSections.has('provenance')}
          onToggle={toggleSection}
        >
          <TransitionProvenancePanel />
        </DeepSection>

        <DeepSection
          id="system"
          title="System Controls"
          subtitle="Mining, mesh, attestation, identity"
          isOpen={openSections.has('system')}
          onToggle={toggleSection}
        >
          <SystemControlsPanel
            onCycle={cycle}
            cycleLoading={loading}
            minerActive={minerActive}
            minerInterval={minerInterval}
            onToggleMiner={toggleMiner}
            onSetMinerInterval={setMinerInterval}
            meshSimulation={meshSimulation}
            meshLoading={meshLoading}
            onRunMesh={runMeshSimulation}
            attestationData={attestationData}
            attestLoading={attestLoading}
            onRequestAttestation={requestAttestation}
            moodData={moodData}
            onFetchMood={fetchMood}
            keyPair={keyPair}
            onGenerateWebCrypto={generateWebCryptoKeys}
            onGenerateServerKeys={generateServerKeys}
            signRequests={signRequests}
            onSetSignRequests={setSignRequests}
          />
        </DeepSection>

        <DeepSection
          id="stream"
          title="Observation Stream"
          subtitle="Live telemetry and block history"
          isOpen={openSections.has('stream')}
          onToggle={toggleSection}
        >
          <ObservationStreamPanel
            tip={tip}
            history={history}
            minerActive={minerActive}
            minerStats={minerStats}
          />
        </DeepSection>
      </div>
    </div>
  );
}

export default App;
