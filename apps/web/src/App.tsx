import React, { useState, useEffect, useRef } from 'react';
import { EcosystemPanel } from './EcosystemPanel';
import { AiSoulCommandCenterPanel } from './AiSoulCommandCenterPanel';
import { SoulPanel } from './SoulPanel';
import { PluralismPanel } from './PluralismPanel';
import { RealityPanel } from './RealityPanel';
import { TransitionProvenancePanel } from './TransitionProvenancePanel';
import { AmbientBar } from './AmbientBar';
import { IntentFlow } from './IntentFlow';
import { SystemControlsPanel } from './SystemControlsPanel';
import { ObservationStreamPanel } from './ObservationStreamPanel';
import { LifecycleFlow, deriveStageStates, type LifecycleStage } from './LifecycleFlow';
import { OmegaWorkspace } from './OmegaWorkspace';
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

const OCEAN_FABRIC_ACTIONS = [
  { icon: '💧', label: 'Truth Membrane', intent: 'Verify Ocean Fabric Water Membrane & Fail-Closed Boundary' },
  { icon: '🪙', label: '11:11 Treasury', intent: 'Verify ELION VAREL Sovereign Treasury bc1qaj8jmp5as80zwew09ep86w6fgw37zwhwzr89mp' },
  { icon: '🏛️', label: 'Duplex Convergence', intent: 'Simulate African Pantheon Duplex Convergence across 5 regional faces' },
  { icon: '📜', label: 'Merkle Audit', intent: 'Audit Canonical State Ledger Tip and cryptographic parent chaining' },
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

  const [openStageId, setOpenStageId] = useState<string | null>(null);
  const [viewportMode, setViewportMode] = useState<'stream' | 'cockpit'>('stream');

  const eventSourceRef = useRef<EventSource | null>(null);

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

  const stageStates = deriveStageStates(omegaCommand);

  const lifecycleStages: LifecycleStage[] = [
    {
      id: 'intent',
      icon: '✦',
      label: 'Intent',
      subtitle: omegaCommand?.command?.intent || 'What shall we make real?',
      state: stageStates.intent,
    },
    {
      id: 'evidence',
      icon: '👁',
      label: 'Evidence',
      subtitle: "What the system knows and doesn't know",
      state: stageStates.evidence,
      detail: <RealityPanel />,
    },
    {
      id: 'authority',
      icon: '🔐',
      label: 'Authority',
      subtitle: humanGateRequired ? 'Human approval required' : 'Autonomous',
      state: stageStates.authority,
    },
    {
      id: 'admit',
      icon: '◇',
      label: 'Admission',
      subtitle: omegaCommand?.command?.change?.decision
        ? `Decision: ${omegaCommand.command.change.decision}`
        : 'Awaiting admission',
      state: stageStates.admit,
    },
    {
      id: 'execute',
      icon: '⚙',
      label: 'Execute',
      subtitle: simulationMode ? 'Bounded simulation' : 'Bounded action',
      state: stageStates.execute,
    },
    {
      id: 'observe',
      icon: '📡',
      label: 'Observe',
      subtitle: 'What actually happened',
      state: stageStates.observe,
      detail: (
        <ObservationStreamPanel
          tip={tip}
          history={history}
          minerActive={minerActive}
          minerStats={minerStats}
        />
      ),
    },
    {
      id: 'verify',
      icon: '✓',
      label: 'Verify',
      subtitle: omegaCommand?.reality?.classification
        ? humanStatus(omegaCommand.reality.classification)
        : 'Does reality match the proposition?',
      state: stageStates.verify,
    },
    {
      id: 'remember',
      icon: '🧠',
      label: 'Remember',
      subtitle: 'Lineage and memory',
      state: stageStates.remember,
      detail: <TransitionProvenancePanel />,
    },
    {
      id: 'next',
      icon: '↺',
      label: 'Next Δ',
      subtitle: 'The next finite transition',
      state: stageStates.next,
    },
    {
      id: 'command-center',
      icon: '🌊',
      label: 'Command Center',
      subtitle: 'AI Soul Master Command Center & Water Current',
      state: 'available' as const,
      detail: <AiSoulCommandCenterPanel />,
    },
    {
      id: 'ecosystem',
      icon: '🌊',
      label: 'Ecosystem',
      subtitle: 'Capability layers and evidence',
      state: 'available' as const,
      detail: <EcosystemPanel />,
    },
    {
      id: 'soul',
      icon: '🪙',
      label: 'Soul',
      subtitle: 'Sovereign treasury & soul income',
      state: 'available' as const,
      detail: <SoulPanel />,
    },
    {
      id: 'pluralism',
      icon: '🏛️',
      label: 'Pluralism',
      subtitle: 'African pantheon duplex & convergence',
      state: 'available' as const,
      detail: <PluralismPanel />,
    },
    {
      id: 'system',
      icon: '⚙',
      label: 'System',
      subtitle: 'Mining, mesh, attestation, identity',
      state: 'available' as const,
      detail: (
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
      ),
    },
  ];

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

      {/* Viewport Mode Switcher */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
          padding: '16px 24px 0',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            padding: '4px',
            background: theme.surface,
            border: `1px solid ${theme.border}`,
            borderRadius: theme.radiusPill,
            gap: '4px',
          }}
        >
          <button
            onClick={() => setViewportMode('stream')}
            style={{
              padding: '6px 16px',
              borderRadius: theme.radiusPill,
              border: 'none',
              background: viewportMode === 'stream' ? theme.surfaceRaised : 'transparent',
              color: viewportMode === 'stream' ? theme.accent : theme.textMuted,
              boxShadow: viewportMode === 'stream' ? `0 0 12px ${theme.accent}22` : 'none',
              fontFamily: theme.fontSans,
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>💧</span>
            <span>Mirror-Water Stream</span>
          </button>
          <button
            onClick={() => setViewportMode('cockpit')}
            style={{
              padding: '6px 16px',
              borderRadius: theme.radiusPill,
              border: 'none',
              background: viewportMode === 'cockpit' ? theme.surfaceRaised : 'transparent',
              color: viewportMode === 'cockpit' ? theme.accent : theme.textMuted,
              boxShadow: viewportMode === 'cockpit' ? `0 0 12px ${theme.accent}22` : 'none',
              fontFamily: theme.fontSans,
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>🌌</span>
            <span>Omega Workspace Cockpit</span>
          </button>
        </div>
      </div>

      {viewportMode === 'cockpit' ? (
        <div
          style={{
            maxWidth: '1360px',
            width: '100%',
            margin: '0 auto',
            padding: '24px 24px 60px',
            flex: 1,
          }}
        >
          <OmegaWorkspace />
        </div>
      ) : (
        <>
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

        {/* Prominent High-Visibility Message & Command Input */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            gap: '10px',
            alignItems: 'stretch',
            background: 'rgba(3, 18, 31, 0.85)',
            padding: '6px',
            borderRadius: theme.radiusPill,
            border: '2px solid rgba(0, 245, 160, 0.5)',
            boxShadow: '0 0 24px rgba(0, 245, 160, 0.25), inset 0 0 12px rgba(0, 245, 160, 0.1)',
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
            placeholder="💬 Type your message or command here (press Enter or click Send)..."
            style={{
              flex: 1,
              padding: '14px 20px',
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              fontFamily: theme.fontSans,
              fontSize: '15px',
              fontWeight: 500,
              outline: 'none',
            }}
          />
          <button
            onClick={proposeOmegaCommand}
            disabled={omegaLoading || !omegaIntent.trim()}
            style={{
              padding: '0 24px',
              borderRadius: theme.radiusPill,
              border: 'none',
              background: omegaLoading || !omegaIntent.trim()
                ? 'rgba(0, 245, 160, 0.2)'
                : 'linear-gradient(135deg, #00f5a0 0%, #00d2ff 100%)',
              color: omegaLoading || !omegaIntent.trim() ? '#64748b' : '#020d18',
              fontFamily: theme.fontSans,
              fontSize: '14px',
              fontWeight: 700,
              cursor: omegaLoading || !omegaIntent.trim() ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: omegaLoading || !omegaIntent.trim() ? 'none' : '0 0 16px rgba(0, 245, 160, 0.4)',
              transition: 'all 0.2s ease',
            }}
          >
            <span>{omegaLoading ? '⏳' : '⚡'}</span>
            <span>{omegaLoading ? 'Sending...' : 'Send Message'}</span>
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

        {/* Ocean Fabric // Access of Truth Membrane Bar */}
        <div
          style={{
            marginTop: '16px',
            padding: '12px 16px',
            background: 'linear-gradient(135deg, rgba(2, 13, 24, 0.8) 0%, rgba(4, 28, 44, 0.8) 100%)',
            border: '1px solid rgba(0, 245, 160, 0.25)',
            borderRadius: theme.radius,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '11px',
              color: '#38bdf8',
              letterSpacing: '0.4px',
            }}
          >
            <span style={{ fontWeight: 600 }}>
              💧 OCEAN FABRIC // ACCESS OF TRUTH GATE
            </span>
            <span style={{ color: '#00f5a0', fontSize: '10px', fontWeight: 600 }}>
              🛡️ TOTAL SURFACE SECURITY · FAIL-CLOSED
            </span>
          </div>

          <div
            style={{
              fontSize: '11px',
              color: '#94a3b8',
              lineHeight: 1.4,
            }}
          >
            The multi-universal city is fully transparent to observe, but impermeable to enter without verified Truth.
          </div>

          <div
            style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >
            {OCEAN_FABRIC_ACTIONS.map((action) => (
              <button
                key={action.label}
                onClick={() => setOmegaIntent(action.intent)}
                style={{
                  padding: '6px 12px',
                  borderRadius: theme.radiusPill,
                  border: '1px solid rgba(0, 245, 160, 0.3)',
                  background: 'rgba(3, 18, 31, 0.6)',
                  color: '#e2e8f0',
                  fontFamily: theme.fontSans,
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'border-color 0.2s, background 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#00f5a0';
                  e.currentTarget.style.background = 'rgba(0, 245, 160, 0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(0, 245, 160, 0.3)';
                  e.currentTarget.style.background = 'rgba(3, 18, 31, 0.6)';
                }}
              >
                <span>{action.icon}</span>
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Intent flow card */}
        <IntentFlow
          command={omegaCommand}
          loading={omegaLoading}
          onApprove={approveOmegaCommand}
          onExecute={executeOmegaCommand}
          onObserve={observeOmegaReality}
          onViewEvidence={() => setOpenStageId('evidence')}
          onViewTimeline={() => setOpenStageId('remember')}
          onDismiss={dismissCommand}
          simulationMode={simulationMode}
          humanGateRequired={humanGateRequired}
        />
      </main>

      {/* Mirror-water lifecycle flow */}
      <div
        style={{
          maxWidth: '720px',
          width: '100%',
          margin: '0 auto',
          padding: '8px 24px 60px',
        }}
      >
        <LifecycleFlow
          stages={lifecycleStages}
          openStageId={openStageId}
          onStageToggle={(id) => setOpenStageId(id || null)}
        />
      </div>
    </>
  )}

  {/* Floating Quick Jump to Message Bar */}
  <div
    style={{
      position: 'fixed',
      bottom: '24px',
      right: '28px',
      zIndex: 9999,
      display: 'flex',
      gap: '10px',
    }}
  >
    <button
      onClick={() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => {
          const input = document.querySelector('input[placeholder*="Type your message"]') as HTMLInputElement;
          if (input) {
            input.focus();
            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 150);
      }}
      style={{
        padding: '10px 18px',
        borderRadius: theme.radiusPill,
        background: 'linear-gradient(135deg, #00f5a0 0%, #00d2ff 100%)',
        border: 'none',
        color: '#020d18',
        fontFamily: theme.fontSans,
        fontWeight: 700,
        fontSize: '13px',
        boxShadow: '0 4px 20px rgba(0, 245, 160, 0.45)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 6px 24px rgba(0, 245, 160, 0.6)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 245, 160, 0.45)';
      }}
    >
      <span>💬</span>
      <span>Jump to Send Message</span>
    </button>
  </div>
</div>
);
}

export default App;
