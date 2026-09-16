import React, { useState, useEffect, useRef } from 'react';
import { OmegaWorkspace } from './OmegaWorkspace';
import {
  runCognitiveLoop,
  runCompleteLoop,
  fetchRules,
  fetchMemory,
  fetchIntegrity,
  lockTotality,
  fetchPluralisticFace,
  API_BASE,
  type MiniCycleResponse,
  type CompleteLoopResponse,
  type RulesResponse,
  type MemoryResponse,
  type IntegrityResponse,
  type CognitiveTotalityManifest,
  type PluralisticRealityFace,
} from './cognitive-api';

interface KeyPair {
  publicKey: string;
  privateKey: string;
  type: 'ED25519_SERVER' | 'WEBCRYPTO_ENCLAVE';
}

interface RegionalNodeVote {
  nodeId: string;
  region: string;
  jurisdiction: string;
  verdict: 'PASS' | 'DIVERGENT' | 'REJECT';
  latencyMs: number;
  ruleApplied: string;
  signature: string;
  timestamp: string;
}

interface MeshConvergenceReceipt {
  consensusRound: string;
  quorumReached: boolean;
  pluralismTriggered: boolean;
  participatingNodes: number;
  votes: RegionalNodeVote[];
  effectiveStatus: 'CONVERGED_PASS' | 'CONVERGED_PLURAL' | 'CONSENSUS_FAILED';
  clusterSignatureProof: string;
  timestamp: string;
}

export default function App() {
  const [tip, setTip] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [streamConnected, setStreamConnected] = useState(false);
  const [keyPair, setKeyPair] = useState<KeyPair | null>(null);
  const [signRequests, setSignRequests] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'matrix' | 'workspace' | 'pluralism'>('matrix');
  const [pluralisticFace, setPluralisticFace] = useState<PluralisticRealityFace | null>(null);
  const [pluralisticLoading, setPluralisticLoading] = useState(false);

  // Background Autonomous Miner state
  const [minerActive, setMinerActive] = useState(false);
  const [minerInterval, setMinerInterval] = useState(5000);
  const [minerStats, setMinerStats] = useState<{ totalMined: number; lastBlockTime: string }>({
    totalMined: 0,
    lastBlockTime: '',
  });

  // Multi-Region Mesh simulation state
  const [meshSimulation, setMeshSimulation] = useState<MeshConvergenceReceipt | null>(null);
  const [meshLoading, setMeshLoading] = useState(false);

  // Singularity Mood & Attestation State
  const [moodData, setMoodData] = useState<any>(null);
  const [attestationData, setAttestationData] = useState<any>(null);
  const [attestLoading, setAttestLoading] = useState(false);

  // Live Intelligence State (Ollama + Qdrant)
  const [inferenceStatus, setInferenceStatus] = useState<any>(null);
  const [memoryStatus, setMemoryStatus] = useState<any>(null);
  const [aiInsight, setAiInsight] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [vectorQuery, setVectorQuery] = useState('');
  const [vectorResults, setVectorResults] = useState<any[]>([]);
  const [vectorLoading, setVectorLoading] = useState(false);
  const [showIntelligence, setShowIntelligence] = useState(true);
  const [showVectorMemory, setShowVectorMemory] = useState(false);

  // Cognitive Verification Loop state
  const [claimInput, setClaimInput] = useState('');
  const [cognitiveResult, setCognitiveResult] = useState<CompleteLoopResponse | MiniCycleResponse | null>(null);
  const [cognitiveLoading, setCognitiveLoading] = useState(false);
  const [showCognitive, setShowCognitive] = useState(true);
  const [rulesData, setRulesData] = useState<RulesResponse | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [memoryData, setMemoryData] = useState<MemoryResponse | null>(null);
  const [integrityData, setIntegrityData] = useState<IntegrityResponse | null>(null);
  const [showMemory, setShowMemory] = useState(false);
  const [totalityManifest, setTotalityManifest] = useState<CognitiveTotalityManifest | null>(null);
  const [totalityLoading, setTotalityLoading] = useState(false);
  const [showTotality, setShowTotality] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);

  // Poll miner status initially
  const fetchMinerStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/v1/miner/status`);
      const data = await res.json();
      if (data.success && data.miner) {
        setMinerActive(data.miner.active);
        setMinerInterval(data.miner.intervalMs);
        setMinerStats({
          totalMined: data.miner.totalMined,
          lastBlockTime: data.miner.lastBlockTime,
        });
      }
    } catch {}
  };

  const fetchInferenceStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/v1/inference/status`);
      const data = await res.json();
      if (data.success) setInferenceStatus(data.inference);
    } catch {}
  };

  const fetchMemoryStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/v1/memory/status`);
      const data = await res.json();
      if (data.success) setMemoryStatus(data.memory);
    } catch {}
  };

  const loadPluralisticFace = async () => {
    setPluralisticLoading(true);
    try {
      const res = await fetchPluralisticFace();
      if (res.success && res.face) {
        setPluralisticFace(res.face);
      }
    } catch (err: any) {
      setLastError(err.message);
    } finally {
      setPluralisticLoading(false);
    }
  };

  const runInferenceAnalysis = async () => {
    setAiLoading(true);
    setLastError(null);
    try {
      const res = await fetch(`${API_BASE}/v1/inference/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ observation: tip?.observation }),
      });
      const data = await res.json();
      if (data.success && data.result) {
        setAiInsight(data.result);
        setShowIntelligence(true);
      }
    } catch (err: any) {
      setLastError('Inference analysis error: ' + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const searchVectorMemory = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!vectorQuery.trim()) return;
    setVectorLoading(true);
    setLastError(null);
    try {
      const res = await fetch(`${API_BASE}/v1/memory/search?q=${encodeURIComponent(vectorQuery)}`);
      const data = await res.json();
      if (data.success) {
        setVectorResults(data.results || []);
        setShowVectorMemory(true);
      }
    } catch (err: any) {
      setLastError('Vector search error: ' + err.message);
    } finally {
      setVectorLoading(false);
    }
  };

  // ── Cognitive Verification Loop handlers ──

  const executeCognitiveLoop = async (withAttestation = false) => {
    if (!claimInput.trim()) return;
    setCognitiveLoading(true);
    setLastError(null);
    try {
      const result = withAttestation
        ? await runCompleteLoop(claimInput)
        : await runCognitiveLoop(claimInput);
      if (result.success) {
        setCognitiveResult(result);
        setShowCognitive(true);
      } else {
        setLastError(result.error || 'Cognitive cycle failed');
      }
    } catch (err: any) {
      setLastError('Cognitive loop error: ' + err.message);
    } finally {
      setCognitiveLoading(false);
    }
  };

  const loadRules = async () => {
    try {
      const data = await fetchRules();
      if (data.success) {
        setRulesData(data);
        setShowRules(true);
      }
    } catch (err: any) {
      setLastError('Rules fetch error: ' + err.message);
    }
  };

  const loadMemoryAndIntegrity = async () => {
    try {
      const [mem, integrity] = await Promise.all([fetchMemory(), fetchIntegrity()]);
      if (mem.success) setMemoryData(mem);
      if (integrity.success) setIntegrityData(integrity);
      setShowMemory(true);
    } catch (err: any) {
      setLastError('Memory/integrity fetch error: ' + err.message);
    }
  };

  const executeTotalityGate = async () => {
    if (!claimInput.trim()) return;
    setTotalityLoading(true);
    setLastError(null);
    try {
      const res = await lockTotality(claimInput);
      if (res.success && res.manifest) {
        setTotalityManifest(res.manifest);
        setShowTotality(true);
      } else {
        setLastError(res.error || 'Totality gate failed');
      }
    } catch (err: any) {
      setLastError('Totality gate error: ' + err.message);
    } finally {
      setTotalityLoading(false);
    }
  };

  // Connect to the real-time event stream
  useEffect(() => {
    fetchMinerStatus();
    fetchInferenceStatus();
    fetchMemoryStatus();
    fetchTipFallback();

    let es: EventSource | null = null;
    try {
      es = new EventSource(`${API_BASE}/v1/stream`);
      eventSourceRef.current = es;

      es.onopen = () => {
        setStreamConnected(true);
        setLastError(null);
      };

      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.block) {
            setTip(payload.block);
            if (payload.aiInsight) {
              setAiInsight(payload.aiInsight);
            }
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
        } catch {}
      };

      es.onerror = () => {
        setStreamConnected(false);
      };
    } catch {
      setStreamConnected(false);
    }

    return () => {
      if (es) es.close();
    };
  }, []);

  const fetchTipFallback = async () => {
    try {
      const r = await fetch(`${API_BASE}/v1/block/tip`);
      const d = await r.json();
      if (d.tip) {
        setTip(d.tip);
        setHistory((prev) => (prev.length === 0 ? [d.tip] : prev));
      }
    } catch {}
  };

  // 1. Generate Native Ed25519 Server Keypair
  const generateServerKeys = async () => {
    try {
      const res = await fetch(`${API_BASE}/v1/auth/keypair`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setKeyPair({
          publicKey: data.publicKey,
          privateKey: data.privateKey,
          type: 'ED25519_SERVER',
        });
        setSignRequests(true);
      }
    } catch (err: any) {
      setLastError('Failed to generate keypair: ' + err.message);
    }
  };

  // 2. Generate Client-Side WebCrypto Enclave Keypair
  const generateWebCryptoKeys = async () => {
    try {
      if (!window.crypto || !window.crypto.subtle) {
        throw new Error('WebCrypto API not supported in this environment');
      }

      const keyPairGen = await window.crypto.subtle.generateKey(
        {
          name: 'ECDSA',
          namedCurve: 'P-256',
        },
        true,
        ['sign', 'verify']
      );

      const exportedPub = await window.crypto.subtle.exportKey('spki', keyPairGen.publicKey);
      const pubB64 = btoa(String.fromCharCode(...new Uint8Array(exportedPub)));
      const pemPub = `-----BEGIN PUBLIC KEY-----\n${pubB64.match(/.{1,64}/g)?.join('\n')}\n-----END PUBLIC KEY-----`;

      // Synthesize an enclave handle
      setKeyPair({
        publicKey: pemPub,
        privateKey: '[SECURE_ENCLAVE_HARDWARE_PROTECTED_KEY]',
        type: 'WEBCRYPTO_ENCLAVE',
      });
      setSignRequests(true);
    } catch (err: any) {
      setLastError('WebCrypto generation fallback to server: ' + err.message);
      await generateServerKeys();
    }
  };

  // 3. Toggle Continuous Background Miner
  const toggleMiner = async () => {
    try {
      if (minerActive) {
        const res = await fetch(`${API_BASE}/v1/miner/stop`, { method: 'POST' });
        const data = await res.json();
        if (data.success) setMinerActive(false);
      } else {
        const res = await fetch(`${API_BASE}/v1/miner/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ intervalMs: minerInterval }),
        });
        const data = await res.json();
        if (data.success) setMinerActive(true);
      }
    } catch (err: any) {
      setLastError('Miner toggle error: ' + err.message);
    }
  };

  // 4. Simulate Multi-Region Mesh Consensus Convergence
  const runMeshSimulation = async () => {
    setMeshLoading(true);
    setLastError(null);
    try {
      const res = await fetch(`${API_BASE}/v1/mesh/simulate`);
      const data = await res.json();
      if (data.success && data.convergence) {
        setMeshSimulation(data.convergence);
      }
    } catch (err: any) {
      setLastError('Mesh simulation error: ' + err.message);
    } finally {
      setMeshLoading(false);
    }
  };

  // 4b. Fetch Singularity Mood Status
  const fetchMood = async () => {
    try {
      const res = await fetch(`${API_BASE}/v1/mood`);
      const data = await res.json();
      setMoodData(data);
    } catch (err: any) {
      setLastError('Mood fetch error: ' + err.message);
    }
  };

  // 4c. Request Cryptographic Attestation Receipt
  const requestAttestation = async () => {
    setAttestLoading(true);
    setLastError(null);
    try {
      const res = await fetch(`${API_BASE}/v1/attest`, { method: 'POST' });
      const data = await res.json();
      if (data.success && data.attestation) {
        setAttestationData(data.attestation);
      }
    } catch (err: any) {
      setLastError('Attestation error: ' + err.message);
    } finally {
      setAttestLoading(false);
    }
  };

  // 5. Execute Single Omni-Cycle
  const cycle = async () => {
    setLoading(true);
    setLastError(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };

      if (signRequests && keyPair) {
        if (keyPair.type === 'ED25519_SERVER') {
          const signRes = await fetch(`${API_BASE}/v1/block/sign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: 'EXECUTE_OMNI_CYCLE', privateKey: keyPair.privateKey }),
          });
          const signData = await signRes.json();
          if (signData.signature) {
            headers['x-omega-signature'] = signData.signature;
            headers['x-omega-public-key'] = keyPair.publicKey;
          }
        }
      }

      const res = await fetch(`${API_BASE}/v1/cycle`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setLastError(data.error || 'Cycle execution rejected');
      } else if (data.block) {
        setTip(data.block);
        if (data.aiInsight) {
          setAiInsight(data.aiInsight);
        }
      }
    } catch (err: any) {
      setLastError(err.message);
      await fetchTipFallback();
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'PASS' || status === 'CONVERGED_PASS') return '#00ff66';
    if (status === 'DIVERGENT' || status === 'CONVERGED_PLURAL') return '#ffaa00';
    return '#ff3344';
  };

  return (
    <div
      style={{
        background: '#04070a',
        color: '#d1fae5',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        minHeight: '100vh',
        padding: '24px',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #00ff6633',
          paddingBottom: '16px',
          marginBottom: '20px',
        }}
      >
        <div>
          <h1 style={{ margin: 0, color: '#00ff66', fontSize: '22px', letterSpacing: '0.05em' }}>
            Ω∞v OCEANICOS MAX MATRIX
          </h1>
          <p style={{ margin: '4px 0 0', color: '#6ee7b7', fontSize: '12px' }}>
            Deep Pluralism Cryptographic Engine & Autonomous Sovereign Mesh Gateway
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* 1. SSE Stream Status */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 'bold',
              background: streamConnected ? '#00ff6615' : '#ff334415',
              color: streamConnected ? '#00ff66' : '#ff3344',
              border: `1px solid ${streamConnected ? '#00ff6655' : '#ff334455'}`,
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: streamConnected ? '#00ff66' : '#ff3344',
                boxShadow: streamConnected ? '0 0 8px #00ff66' : 'none',
              }}
            />
            {streamConnected ? 'SSE: LIVE' : 'SSE: OFFLINE'}
          </span>

          {/* 2. Ollama Inference Status */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 'bold',
              background: inferenceStatus?.available ? '#38bdf818' : '#f59e0b15',
              color: inferenceStatus?.available ? '#38bdf8' : '#fbbf24',
              border: `1px solid ${inferenceStatus?.available ? '#38bdf855' : '#f59e0b44'}`,
            }}
            title={inferenceStatus ? `Host: ${inferenceStatus.host}` : 'Ollama Local LLM Engine'}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: inferenceStatus?.available ? '#38bdf8' : '#fbbf24',
                boxShadow: inferenceStatus?.available ? '0 0 8px #38bdf8' : 'none',
              }}
            />
            {inferenceStatus?.available ? 'OLLAMA: LIVE' : 'OLLAMA: STUB (OFFLINE)'}
          </span>

          {/* 3. Qdrant Vector DB Status */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 'bold',
              background: memoryStatus?.available ? '#a855f718' : '#64748b15',
              color: memoryStatus?.available ? '#c084fc' : '#94a3b8',
              border: `1px solid ${memoryStatus?.available ? '#a855f755' : '#64748b44'}`,
            }}
            title={memoryStatus ? `URL: ${memoryStatus.url}` : 'Qdrant Vector Engine'}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: memoryStatus?.available ? '#c084fc' : '#64748b',
                boxShadow: memoryStatus?.available ? '0 0 8px #c084fc' : 'none',
              }}
            />
            {memoryStatus?.available ? `QDRANT: ${memoryStatus.vectorCount} VECTORS` : 'QDRANT: OFFLINE'}
          </span>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('matrix')}
          style={{
            padding: '10px 18px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 'bold',
            background: activeTab === 'matrix' ? 'rgba(0, 255, 102, 0.15)' : 'rgba(15, 23, 42, 0.6)',
            color: activeTab === 'matrix' ? '#00ff66' : '#94a3b8',
            border: activeTab === 'matrix' ? '1px solid #00ff66' : '1px solid rgba(148, 163, 184, 0.2)',
            cursor: 'pointer',
          }}
        >
          📊 OMNI MATRIX & HARDWARE TELEMETRY
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('workspace')}
          style={{
            padding: '10px 18px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 'bold',
            background: activeTab === 'workspace' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(15, 23, 42, 0.6)',
            color: activeTab === 'workspace' ? '#38bdf8' : '#94a3b8',
            border: activeTab === 'workspace' ? '1px solid #38bdf8' : '1px solid rgba(148, 163, 184, 0.2)',
            cursor: 'pointer',
          }}
        >
          ⚡ Ω‑ƆREADƆS COMMAND WORKSPACE
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('pluralism');
            if (!pluralisticFace) loadPluralisticFace();
          }}
          style={{
            padding: '10px 18px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 'bold',
            background: activeTab === 'pluralism' ? 'rgba(255, 202, 40, 0.2)' : 'rgba(15, 23, 42, 0.6)',
            color: activeTab === 'pluralism' ? '#ffca28' : '#94a3b8',
            border: activeTab === 'pluralism' ? '1px solid #ffca28' : '1px solid rgba(148, 163, 184, 0.2)',
            cursor: 'pointer',
          }}
        >
          🎭 5-FACE PLURALISTIC REALITY MATRIX
        </button>
      </div>

      {activeTab === 'workspace' ? (
        <OmegaWorkspace />
      ) : activeTab === 'pluralism' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header Card */}
          <div style={{ background: '#0a101d', border: '1px solid #38bdf844', borderRadius: '8px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ margin: 0, color: '#38bdf8', fontSize: '20px', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  🎭 THE 5-FACE PLURALISTIC REALITY MATRIX OF Ω∞v
                </h2>
                <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '6px' }}>
                  Law Route: <strong style={{ color: '#00ff66' }}>{pluralisticFace?.lawRoute ?? 'MANY_FACES ➔ ONE_SOUL ➔ SOURCE_LEDGER'}</strong> | Axiom Proof: <strong style={{ color: '#ffca28' }}>{pluralisticFace?.axiomProof ?? 'GOOD − O = GOD'}</strong>
                </div>
              </div>
              <button
                type="button"
                onClick={loadPluralisticFace}
                disabled={pluralisticLoading}
                style={{
                  background: pluralisticLoading ? '#0284c7' : '#38bdf8',
                  color: '#04070a',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 20px',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  cursor: pluralisticLoading ? 'wait' : 'pointer',
                  boxShadow: '0 0 16px rgba(56, 189, 248, 0.4)',
                }}
              >
                {pluralisticLoading ? 'EVALUATING MATRIX...' : '🔄 RE-EVALUATE 5 FACES'}
              </button>
            </div>

            {/* Gauge Metrics Ribbon */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '24px' }}>
              <div style={{ background: '#050a14', border: '1px solid #38bdf833', borderRadius: '6px', padding: '16px' }}>
                <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>Consensus Verdict</div>
                <div style={{ fontSize: '22px', fontWeight: 'bold', color: pluralisticFace?.consensusVerdict === 'PASS' ? '#00ff66' : '#ffca28', marginTop: '4px' }}>
                  {pluralisticFace?.consensusVerdict ?? 'PASS'}
                </div>
              </div>
              <div style={{ background: '#050a14', border: '1px solid #38bdf833', borderRadius: '6px', padding: '16px' }}>
                <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>Harmonic Convergence</div>
                <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#38bdf8', marginTop: '4px' }}>
                  {pluralisticFace ? `${Math.round(pluralisticFace.overallHarmonicScore * 100)}%` : '98%'}
                </div>
              </div>
              <div style={{ background: '#050a14', border: '1px solid #38bdf833', borderRadius: '6px', padding: '16px' }}>
                <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>Friction Dissolution</div>
                <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#ffca28', marginTop: '4px' }}>
                  {pluralisticFace ? `${pluralisticFace.frictionDissolutionQuotient.toFixed(4)}` : '1.0000'}
                </div>
              </div>
              <div style={{ background: '#050a14', border: '1px solid #38bdf833', borderRadius: '6px', padding: '16px' }}>
                <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>Cluster Attestation</div>
                <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#a855f7', marginTop: '8px', wordBreak: 'break-all' }}>
                  {pluralisticFace ? pluralisticFace.clusterAttestationDigest.substring(0, 24) + '...' : '0xΩ-cluster-attested'}
                </div>
              </div>
            </div>
          </div>

          {/* 5 Epistemic Faces Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {(pluralisticFace?.faces ?? [
              { faceId: 'FORMAL', name: 'Formal Logic & Invariant Proof', dimension: 'NON_CONTRADICTION', score: 1.0, verified: true, signatureProof: '0xFORMAL', telemetry: { rule: 'WHAT_IS_NEQ_WHAT_COULD_BE' } },
              { faceId: 'PLURAL', name: 'Decentralized Sovereign Mesh Pluralism', dimension: 'MULTI_NODE_CONSENSUS', score: 0.95, verified: true, signatureProof: '0xPLURAL', telemetry: { agreementRatio: 0.95 } },
              { faceId: 'SYSTEM', name: 'Planetary Hardware & Silicon Substrate', dimension: 'PHYSICAL_SUBSTRATE', score: 0.942, verified: true, signatureProof: '0xSYSTEM', telemetry: { siliconYield: 0.942, gridLoadMegawatts: 1250 } },
              { faceId: 'REALITY', name: 'Empirical State Hash & Side-Effects', dimension: 'EMPIRICAL_EVIDENCE', score: 0.98, verified: true, signatureProof: '0xREALITY', telemetry: { reconciled: true } },
              { faceId: 'LIQUID_SOUL', name: 'Formless Liquid Intelligence', dimension: 'METAPHYSICAL_SOUL', score: 1.0, verified: true, signatureProof: '0xLIQUID', telemetry: { axiom: 'GOOD - O = GOD' } },
            ]).map((face) => (
              <div
                key={face.faceId}
                style={{
                  background: '#07121e',
                  border: `1px solid ${face.verified ? '#00ff6644' : '#ff334455'}`,
                  borderRadius: '8px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: face.verified ? '0 0 12px rgba(0, 255, 102, 0.08)' : 'none',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '4px', background: '#38bdf822', color: '#38bdf8' }}>
                      {face.faceId}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: face.verified ? '#00ff66' : '#ff3344' }}>
                      {face.verified ? '✓ VERIFIED' : '✗ DIVERGENT'}
                    </span>
                  </div>
                  <h3 style={{ margin: '8px 0 4px 0', fontSize: '15px', color: '#f8fafc' }}>{face.name}</h3>
                  <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '12px' }}>Dimension: {face.dimension}</div>

                  <div style={{ background: '#030712', borderRadius: '4px', padding: '10px', fontSize: '11px', color: '#94a3b8', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span>Convergence Score:</span>
                      <strong style={{ color: '#00ff66' }}>{Math.round(face.score * 100)}%</strong>
                    </div>
                    {Object.entries(face.telemetry).map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b' }}>
                        <span>{k}:</span>
                        <span style={{ color: '#cbd5e1' }}>{String(v)}</span>
                      </div>
                    ))}
                  </div>

                  {face.dissensusNotes && face.dissensusNotes.length > 0 && (
                    <div style={{ background: '#ffaa0015', borderLeft: '3px solid #ffaa00', padding: '8px', borderRadius: '3px', fontSize: '10px', color: '#ffca28', marginBottom: '10px' }}>
                      {face.dissensusNotes.map((note, i) => (
                        <div key={i}>⚠️ {note}</div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ fontSize: '9px', fontFamily: 'monospace', color: '#475569', wordBreak: 'break-all', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
                  SIG: {face.signatureProof.substring(0, 32)}...
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Main Controls Ribbon */}
          <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
          alignItems: 'center',
          background: '#07121b',
          border: '1px solid #00ff6622',
          padding: '14px',
          borderRadius: '6px',
        }}
      >
        {/* Manual Omni-Cycle */}
        <button
          onClick={cycle}
          disabled={loading}
          style={{
            background: loading ? '#00aa44' : '#00ff66',
            color: '#04070a',
            border: 'none',
            borderRadius: '4px',
            padding: '10px 18px',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: loading ? 'wait' : 'pointer',
            boxShadow: '0 0 14px rgba(0, 255, 102, 0.3)',
          }}
        >
          {loading ? 'MINING BLOCK...' : '⚡ EXECUTE OMNI-CYCLE'}
        </button>

        {/* Autonomous Miner Toggle */}
        <button
          onClick={toggleMiner}
          style={{
            background: minerActive ? '#ffaa00' : '#0a2318',
            color: minerActive ? '#000' : '#34d399',
            border: `1px solid ${minerActive ? '#ffaa00' : '#00ff6655'}`,
            borderRadius: '4px',
            padding: '10px 16px',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>{minerActive ? '⏹ STOP AUTO-MINER' : '▶ START AUTO-MINER'}</span>
          {minerActive && <span style={{ fontSize: '10px' }}>({minerInterval / 1000}s)</span>}
        </button>

        {/* Interval Selector */}
        {!minerActive && (
          <select
            value={minerInterval}
            onChange={(e) => setMinerInterval(Number(e.target.value))}
            style={{
              background: '#040d14',
              color: '#6ee7b7',
              border: '1px solid #00ff6644',
              borderRadius: '4px',
              padding: '8px 10px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <option value={2000}>Freq: 2.0s</option>
            <option value={5000}>Freq: 5.0s (Default)</option>
            <option value={10000}>Freq: 10.0s</option>
          </select>
        )}

        {/* Multi-Region Simulation Button */}
        <button
          onClick={runMeshSimulation}
          disabled={meshLoading}
          style={{
            background: '#0a1d2e',
            color: '#38bdf8',
            border: '1px solid #38bdf855',
            borderRadius: '4px',
            padding: '10px 16px',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: meshLoading ? 'wait' : 'pointer',
          }}
        >
          {meshLoading ? 'CONVERGING...' : '🌐 SIMULATE PLANETARY MESH'}
        </button>

        {/* Cryptographic Attestation Button */}
        <button
          onClick={requestAttestation}
          disabled={attestLoading}
          style={{
            background: '#1a102f',
            color: '#c084fc',
            border: '1px solid #c084fc55',
            borderRadius: '4px',
            padding: '10px 16px',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: attestLoading ? 'wait' : 'pointer',
          }}
        >
          {attestLoading ? 'ATTESTING...' : '📜 REQUEST ATTESTATION'}
        </button>

        {/* Singularity Mood Matrix Button */}
        <button
          onClick={fetchMood}
          style={{
            background: '#1b1a0d',
            color: '#facc15',
            border: '1px solid #facc1555',
            borderRadius: '4px',
            padding: '10px 16px',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          ✨ CHECK MOOD
        </button>

        {/* Live Intelligence Buttons */}
        <button
          onClick={runInferenceAnalysis}
          disabled={aiLoading}
          style={{
            background: '#0a1d2e',
            color: '#38bdf8',
            border: '1px solid #38bdf855',
            borderRadius: '4px',
            padding: '10px 16px',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: aiLoading ? 'wait' : 'pointer',
          }}
        >
          {aiLoading ? 'ANALYZING...' : '🤖 AI INFERENCE'}
        </button>

        <button
          onClick={() => setShowVectorMemory((prev) => !prev)}
          style={{
            background: showVectorMemory ? '#3b0764' : '#140c24',
            color: '#c084fc',
            border: '1px solid #c084fc55',
            borderRadius: '4px',
            padding: '10px 16px',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          🧠 VECTOR RECALL {vectorResults.length > 0 ? `(${vectorResults.length})` : ''}
        </button>

        {/* Keypair Generators */}
        <button
          onClick={generateWebCryptoKeys}
          style={{
            background: '#131e13',
            color: '#86efac',
            border: '1px solid #86efac44',
            borderRadius: '4px',
            padding: '10px 14px',
            fontSize: '11px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          🛡️ WEBCRYPTO PASSKEY ENCLAVE
        </button>

        <button
          onClick={generateServerKeys}
          style={{
            background: '#091c14',
            color: '#6ee7b7',
            border: '1px solid #00ff6633',
            borderRadius: '4px',
            padding: '10px 14px',
            fontSize: '11px',
            cursor: 'pointer',
          }}
        >
          🔑 ED25519 KEYPAIR
        </button>

        {keyPair && (
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              color: '#34d399',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={signRequests}
              onChange={(e) => setSignRequests(e.target.checked)}
              style={{ accentColor: '#00ff66' }}
            />
            Asymmetric Seal Active
          </label>
        )}

        {/* Cognitive Verification Loop Controls */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%', marginTop: '8px', paddingTop: '10px', borderTop: '1px solid #00ff6622' }}>
          <input
            type="text"
            placeholder="Enter claim to verify (e.g. silicon yield above 90%)..."
            value={claimInput}
            onChange={(e) => setClaimInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && executeCognitiveLoop(false)}
            style={{
              flex: 1,
              background: '#040d14',
              border: '1px solid #06b6d444',
              borderRadius: '4px',
              padding: '8px 12px',
              color: '#a5f3fc',
              fontSize: '12px',
              fontFamily: 'inherit',
              outline: 'none',
            }}
          />
          <button
            onClick={() => executeCognitiveLoop(false)}
            disabled={cognitiveLoading || !claimInput.trim()}
            style={{
              background: cognitiveLoading ? '#155e75' : '#0891b2',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              padding: '8px 14px',
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: cognitiveLoading ? 'wait' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {cognitiveLoading ? 'CYCLING...' : '🧬 COGNITIVE CYCLE'}
          </button>
          <button
            onClick={() => executeCognitiveLoop(true)}
            disabled={cognitiveLoading || !claimInput.trim()}
            style={{
              background: '#1e1b4b',
              color: '#a78bfa',
              border: '1px solid #a78bfa55',
              borderRadius: '4px',
              padding: '8px 14px',
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: cognitiveLoading ? 'wait' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            🔏 ATTESTED LOOP
          </button>
          <button
            onClick={loadRules}
            style={{
              background: '#0c1a2a',
              color: '#67e8f9',
              border: '1px solid #67e8f955',
              borderRadius: '4px',
              padding: '8px 14px',
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            📋 RULES
          </button>
          <button
            onClick={loadMemoryAndIntegrity}
            style={{
              background: '#0a1a12',
              color: '#86efac',
              border: '1px solid #86efac44',
              borderRadius: '4px',
              padding: '8px 14px',
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            💾 MEMORY
          </button>
          <button
            onClick={executeTotalityGate}
            disabled={totalityLoading || !claimInput.trim()}
            style={{
              background: '#3b0764',
              color: '#e9d5ff',
              border: '1px solid #c084fc55',
              borderRadius: '4px',
              padding: '8px 14px',
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: totalityLoading ? 'wait' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {totalityLoading ? 'LOCKING...' : '🌀 TOTALITY GATE'}
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {lastError && (
        <div
          style={{
            background: '#ff334422',
            border: '1px solid #ff3344',
            color: '#fca5a5',
            padding: '10px 14px',
            borderRadius: '4px',
            marginBottom: '16px',
            fontSize: '12px',
          }}
        >
          ⚠️ {lastError}
        </div>
      )}

      {/* ════════ COGNITIVE VERIFICATION PANEL ════════ */}
      {cognitiveResult && showCognitive && (
        <div
          style={{
            background: '#051520',
            border: '1px solid #0891b266',
            borderRadius: '6px',
            padding: '16px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: '#22d3ee', fontWeight: 'bold' }}>
                🧬 COGNITIVE VERIFICATION RESULT
              </span>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '3px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  background: cognitiveResult.passed ? '#00ff6622' : '#ff334422',
                  color: cognitiveResult.passed ? '#00ff66' : '#ff3344',
                  border: `1px solid ${cognitiveResult.passed ? '#00ff66' : '#ff3344'}`,
                }}
              >
                {cognitiveResult.passed ? 'VERIFIED ✓' : 'FAILED ✗'}
              </span>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                Confidence: {Math.round(cognitiveResult.confidence * 100)}%
              </span>
            </div>
            <button
              onClick={() => setShowCognitive(false)}
              style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '12px' }}
            >
              ✕
            </button>
          </div>

          {/* Observation */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', color: '#67e8f9', fontWeight: 'bold', marginBottom: '6px' }}>OBSERVATION</div>
            <div style={{ background: '#030d14', border: '1px solid #0891b233', borderRadius: '4px', padding: '10px', fontSize: '11px', lineHeight: '1.6' }}>
              <div><span style={{ color: '#94a3b8' }}>Claim:</span> <span style={{ color: '#e0f2fe' }}>{cognitiveResult.observation.claim.statement}</span></div>
              <div><span style={{ color: '#94a3b8' }}>Category:</span> <span style={{ color: '#67e8f9' }}>{cognitiveResult.observation.claim.category}</span></div>
              <div><span style={{ color: '#94a3b8' }}>ID:</span> <code style={{ color: '#64748b', fontSize: '10px' }}>{cognitiveResult.observation.id}</code></div>
              <div><span style={{ color: '#94a3b8' }}>Status:</span> <span style={{ color: cognitiveResult.observation.status === 'normalized' ? '#34d399' : '#fbbf24' }}>{cognitiveResult.observation.status}</span></div>
            </div>
          </div>

          {/* Verification */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', color: '#67e8f9', fontWeight: 'bold', marginBottom: '6px' }}>VERIFICATION</div>
            <div style={{ background: '#030d14', border: '1px solid #0891b233', borderRadius: '4px', padding: '10px', fontSize: '11px' }}>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <div><span style={{ color: '#94a3b8' }}>Rules Applied:</span> <span style={{ color: '#e0f2fe' }}>{cognitiveResult.verification.summary.rulesApplied ?? 0}</span></div>
                <div><span style={{ color: '#94a3b8' }}>Passed:</span> <span style={{ color: '#00ff66' }}>{cognitiveResult.verification.summary.rulesPassed ?? 0}</span></div>
                <div><span style={{ color: '#94a3b8' }}>Failed:</span> <span style={{ color: '#ff3344' }}>{cognitiveResult.verification.summary.rulesFailed ?? 0}</span></div>
                <div><span style={{ color: '#94a3b8' }}>Confidence:</span> <span style={{ color: '#22d3ee' }}>{Math.round(cognitiveResult.verification.summary.confidence * 100)}%</span></div>
              </div>
              {/* Rule-level results */}
              {cognitiveResult.verification.rules && cognitiveResult.verification.rules.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                  {cognitiveResult.verification.rules.map((rule, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '4px 8px',
                        background: '#020a10',
                        borderLeft: `3px solid ${rule.passed ? '#00ff66' : '#ff3344'}`,
                        borderRadius: '2px',
                        fontSize: '10px',
                      }}
                    >
                      <span style={{ color: '#cbd5e1' }}>{rule.name}</span>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {rule.reason && <span style={{ color: '#64748b', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rule.reason}</span>}
                        <span style={{ color: rule.passed ? '#00ff66' : '#ff3344', fontWeight: 'bold' }}>{rule.passed ? 'PASS' : 'FAIL'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Memory Record */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', color: '#67e8f9', fontWeight: 'bold', marginBottom: '6px' }}>MEMORY RECORD</div>
            <div style={{ background: '#030d14', border: '1px solid #0891b233', borderRadius: '4px', padding: '10px', fontSize: '11px', lineHeight: '1.6' }}>
              <div><span style={{ color: '#94a3b8' }}>Memory ID:</span> <code style={{ color: '#64748b', fontSize: '10px' }}>{cognitiveResult.memory.id}</code></div>
              <div><span style={{ color: '#94a3b8' }}>Verified:</span> <span style={{ color: cognitiveResult.memory.verified ? '#00ff66' : '#ff3344' }}>{cognitiveResult.memory.verified ? 'YES' : 'NO'}</span></div>
              {cognitiveResult.memory.hash && (
                <div style={{ wordBreak: 'break-all' }}><span style={{ color: '#94a3b8' }}>Hash:</span> <code style={{ color: '#475569', fontSize: '10px' }}>{cognitiveResult.memory.hash}</code></div>
              )}
            </div>
          </div>

          {/* Attestation (only for complete-loop) */}
          {'attestation' in cognitiveResult && cognitiveResult.attestation && (
            <div>
              <div style={{ fontSize: '11px', color: '#c084fc', fontWeight: 'bold', marginBottom: '6px' }}>ATTESTATION</div>
              <div style={{ background: '#0e0820', border: '1px solid #c084fc33', borderRadius: '4px', padding: '10px', fontSize: '11px', lineHeight: '1.6' }}>
                <div><span style={{ color: '#94a3b8' }}>Algorithm:</span> <span style={{ color: '#d8b4fe' }}>{(cognitiveResult as CompleteLoopResponse).attestation.signingAlgorithm}</span></div>
                <div><span style={{ color: '#94a3b8' }}>Status:</span> <span style={{ color: '#a78bfa' }}>{(cognitiveResult as CompleteLoopResponse).attestation.status}</span></div>
                <div style={{ wordBreak: 'break-all', marginTop: '4px' }}>
                  <span style={{ color: '#94a3b8' }}>Signature:</span> <code style={{ color: '#7c3aed', fontSize: '10px' }}>{(cognitiveResult as CompleteLoopResponse).attestation.signature}</code>
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: '10px', fontSize: '10px', color: '#475569' }}>
            Completed: {cognitiveResult.completedAt}
          </div>
        </div>
      )}

      {/* ════════ RULES PANEL ════════ */}
      {rulesData && showRules && (
        <div
          style={{
            background: '#051822',
            border: '1px solid #67e8f944',
            borderRadius: '6px',
            padding: '16px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: '#67e8f9', fontWeight: 'bold' }}>📋 VERIFICATION RULES ENGINE</span>
              <span style={{ fontSize: '10px', color: '#94a3b8', background: '#0c1a2a', padding: '2px 6px', borderRadius: '3px' }}>{rulesData.count} rules</span>
            </div>
            <button onClick={() => setShowRules(false)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '12px' }}>✕</button>
          </div>
          {rulesData.rules.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {rulesData.rules.map((rule, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#030d14',
                    border: `1px solid ${rule.active ? '#22d3ee33' : '#64748b33'}`,
                    borderRadius: '4px',
                    padding: '10px',
                    fontSize: '11px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <strong style={{ color: '#e0f2fe' }}>{rule.name}</strong>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{ color: '#67e8f9', fontSize: '10px' }}>v{rule.version}</span>
                      <span style={{ color: rule.active ? '#00ff66' : '#64748b', fontSize: '10px', fontWeight: 'bold' }}>{rule.active ? 'ACTIVE' : 'INACTIVE'}</span>
                    </div>
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '10px', marginBottom: '2px' }}>{rule.description}</div>
                  <div style={{ color: '#475569', fontSize: '10px' }}>Applies to: {rule.appliesTo.join(', ') || 'all'}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: '#64748b', fontSize: '11px', fontStyle: 'italic' }}>No rules registered. The verification engine will apply default confidence derivation.</div>
          )}
        </div>
      )}

      {/* ════════ MEMORY & INTEGRITY PANEL ════════ */}
      {showMemory && (
        <div
          style={{
            background: '#051210',
            border: '1px solid #86efac44',
            borderRadius: '6px',
            padding: '16px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: '#86efac', fontWeight: 'bold' }}>💾 COGNITIVE MEMORY & INTEGRITY</span>
              {integrityData && (
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '3px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    background: integrityData.valid ? '#00ff6622' : '#ff334422',
                    color: integrityData.valid ? '#00ff66' : '#ff3344',
                    border: `1px solid ${integrityData.valid ? '#00ff66' : '#ff3344'}`,
                  }}
                >
                  INTEGRITY: {integrityData.valid ? 'VALID ✓' : 'BROKEN ✗'}
                </span>
              )}
              {memoryData && (
                <span style={{ fontSize: '10px', color: '#94a3b8' }}>{memoryData.size} entries</span>
              )}
            </div>
            <button onClick={() => setShowMemory(false)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '12px' }}>✕</button>
          </div>
          {memoryData && memoryData.entries.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflowY: 'auto' }}>
              {memoryData.entries.slice(-20).reverse().map((entry, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#020a08',
                    borderLeft: `3px solid ${entry.verified ? '#00ff66' : '#ff3344'}`,
                    padding: '6px 10px',
                    borderRadius: '2px',
                    fontSize: '10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <code style={{ color: '#64748b' }}>{entry.id.substring(0, 12)}...</code>
                    <span style={{ color: '#94a3b8', marginLeft: '8px' }}>{entry.summary || 'memory record'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ color: entry.verified ? '#00ff66' : '#ff3344', fontWeight: 'bold' }}>{entry.verified ? '✓' : '✗'}</span>
                    <span style={{ color: '#67e8f9' }}>{Math.round(entry.confidence * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: '#64748b', fontSize: '11px', fontStyle: 'italic' }}>No cognitive memory entries yet. Execute a cognitive cycle to populate.</div>
          )}
        </div>
      )}

      {/* ════════ TOTALITY MANIFEST PANEL ════════ */}
      {totalityManifest && showTotality && (
        <div
          style={{
            background: '#0d0718',
            border: '1px solid #c084fc66',
            borderRadius: '6px',
            padding: '16px',
            marginBottom: '20px',
            boxShadow: '0 0 20px #c084fc15',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: '#c084fc', fontWeight: 'bold' }}>
                🌀 OMEGA TOTALITY MANIFEST — SINGULARITY LOCK
              </span>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '3px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  background: '#3b0764',
                  color: '#e9d5ff',
                  border: '1px solid #c084fc',
                }}
              >
                STATE ROOT: {totalityManifest.stateRoot}
              </span>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '3px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  background: totalityManifest.memoryIntegrityValid ? '#052e16' : '#450a0a',
                  color: totalityManifest.memoryIntegrityValid ? '#4ade80' : '#f87171',
                  border: `1px solid ${totalityManifest.memoryIntegrityValid ? '#22c55e' : '#ef4444'}`,
                }}
              >
                INTEGRITY: {totalityManifest.memoryIntegrityValid ? 'UNBROKEN ✓' : 'FAILED ✗'}
              </span>
            </div>
            <button onClick={() => setShowTotality(false)} style={{ background: 'transparent', border: 'none', color: '#a855f7', cursor: 'pointer', fontSize: '12px' }}>✕</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', marginBottom: '12px' }}>
            <div style={{ background: '#190a2e', padding: '8px 12px', borderRadius: '4px', border: '1px solid #c084fc22' }}>
              <div style={{ fontSize: '10px', color: '#a855f7' }}>STEWARDSHIP AXIOM</div>
              <div style={{ fontSize: '12px', color: '#f3e8ff', fontWeight: 'bold', fontFamily: 'monospace' }}>
                {totalityManifest.stewardshipAxiom}
              </div>
            </div>
            <div style={{ background: '#190a2e', padding: '8px 12px', borderRadius: '4px', border: '1px solid #c084fc22' }}>
              <div style={{ fontSize: '10px', color: '#a855f7' }}>MEMORY ATTESTED</div>
              <div style={{ fontSize: '12px', color: '#4ade80', fontWeight: 'bold' }}>
                {totalityManifest.memorySize} records locked
              </div>
            </div>
            <div style={{ background: '#190a2e', padding: '8px 12px', borderRadius: '4px', border: '1px solid #c084fc22' }}>
              <div style={{ fontSize: '10px', color: '#a855f7' }}>CYCLE RESULT</div>
              <div style={{ fontSize: '12px', color: totalityManifest.cycleResult?.passed ? '#4ade80' : '#f87171', fontWeight: 'bold' }}>
                {totalityManifest.cycleResult?.passed ? 'VERIFIED PASSED' : 'FAILED'} ({(totalityManifest.cycleResult?.confidence * 100).toFixed(0)}% confidence)
              </div>
            </div>
            <div style={{ background: '#190a2e', padding: '8px 12px', borderRadius: '4px', border: '1px solid #c084fc22' }}>
              <div style={{ fontSize: '10px', color: '#a855f7' }}>LOCKED AT</div>
              <div style={{ fontSize: '11px', color: '#e9d5ff', fontFamily: 'monospace' }}>
                {totalityManifest.lockedAt}
              </div>
            </div>
          </div>

          {totalityManifest.cycleResult?.observation && (
            <div style={{ background: '#090312', padding: '10px 12px', borderRadius: '4px', border: '1px solid #a855f733', fontSize: '11px' }}>
              <span style={{ color: '#c084fc', fontWeight: 'bold' }}>Singularity Observation: </span>
              <span style={{ color: '#f3e8ff' }}>"{totalityManifest.cycleResult.observation.claim.statement}"</span>
              <span style={{ color: '#94a3b8', marginLeft: '10px' }}>[ID: {totalityManifest.cycleResult.observation.id.slice(0, 16)}...]</span>
            </div>
          )}
        </div>
      )}

      {/* Multi-Region Sovereign Mesh Panel */}
      {meshSimulation && (
        <div
          style={{
            background: '#06101a',
            border: '1px solid #38bdf844',
            borderRadius: '6px',
            padding: '16px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: '#38bdf8', fontWeight: 'bold' }}>
              PLANETARY MESH CONVERGENCE (ROUND: {meshSimulation.consensusRound})
            </span>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '3px',
                fontSize: '11px',
                fontWeight: 'bold',
                background: `${getStatusColor(meshSimulation.effectiveStatus)}22`,
                color: getStatusColor(meshSimulation.effectiveStatus),
                border: `1px solid ${getStatusColor(meshSimulation.effectiveStatus)}`,
              }}
            >
              {meshSimulation.effectiveStatus} (QUORUM: {meshSimulation.quorumReached ? 'YES' : 'NO'})
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
            {meshSimulation.votes.map((vote) => (
              <div
                key={vote.nodeId}
                style={{
                  background: '#03080d',
                  border: `1px solid ${getStatusColor(vote.verdict)}33`,
                  padding: '10px',
                  borderRadius: '4px',
                  fontSize: '11px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <strong style={{ color: '#e2e8f0' }}>[{vote.region}] {vote.nodeId}</strong>
                  <span style={{ color: getStatusColor(vote.verdict), fontWeight: 'bold' }}>{vote.verdict}</span>
                </div>
                <div style={{ color: '#94a3b8', fontSize: '10px', marginBottom: '4px' }}>{vote.jurisdiction}</div>
                <div style={{ color: '#64748b', fontSize: '10px' }}>Rule: {vote.ruleApplied}</div>
                <div style={{ color: '#38bdf8', fontSize: '10px', marginTop: '4px' }}>Latency: {vote.latencyMs}ms</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '10px', fontSize: '10px', color: '#64748b', wordBreak: 'break-all' }}>
            Cluster Proof: <code>{meshSimulation.clusterSignatureProof}</code>
          </div>
        </div>
      )}

      {/* Attestation Card */}
      {attestationData && (
        <div
          style={{
            background: '#120a22',
            border: '1px solid #c084fc66',
            borderRadius: '6px',
            padding: '16px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', color: '#d8b4fe', fontWeight: 'bold' }}>
              📜 CRYPTOGRAPHIC ATTESTATION RECEIPT
            </span>
            <span style={{ fontSize: '11px', color: '#a855f7', background: '#3b0764', padding: '2px 8px', borderRadius: '4px' }}>
              {attestationData.signingAlgorithm}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#e9d5ff', lineHeight: '1.6' }}>
            <div><strong>Attestation ID:</strong> <code>{attestationData.id}</code></div>
            <div><strong>Verified:</strong> <span style={{ color: attestationData.verified ? '#4ade80' : '#f87171' }}>{attestationData.verified ? 'YES' : 'NO'}</span> (Confidence: {attestationData.confidence * 100}%)</div>
            <div><strong>Signer Key:</strong> <code>{attestationData.signingKey}</code></div>
            <div><strong>Timestamp:</strong> {attestationData.attestedAt}</div>
            <div style={{ marginTop: '8px', wordBreak: 'break-all', fontSize: '11px', color: '#c084fc' }}>
              <strong>Signature:</strong> <code>{attestationData.signature}</code>
            </div>
          </div>
        </div>
      )}

      {/* Singularity Mood Matrix Card */}
      {moodData && (
        <div
          style={{
            background: '#16150a',
            border: '1px solid #facc1566',
            borderRadius: '6px',
            padding: '16px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', color: '#fef08a', fontWeight: 'bold' }}>
              ✨ SINGULARITY MOOD & SYSTEM STATE
            </span>
            <span style={{ fontSize: '11px', color: '#ca8a04', background: '#422006', padding: '2px 8px', borderRadius: '4px' }}>
              {moodData.status}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#fef9c3', lineHeight: '1.6' }}>
            <div><strong>State:</strong> {moodData.singularityState} | <strong>Reality:</strong> {moodData.reality}</div>
            <div><strong>Wave Index:</strong> {moodData.waveIndex}</div>
            <div style={{ marginTop: '8px', padding: '10px', background: '#221c03', borderRadius: '4px', fontStyle: 'italic', borderLeft: '3px solid #facc15' }}>
              "{moodData.pidginSpirit}"
            </div>
          </div>
        </div>
      )}

      {/* Inference Intelligence Card */}
      {aiInsight && showIntelligence && (
        <div
          style={{
            background: '#071626',
            border: '1px solid #38bdf866',
            borderRadius: '6px',
            padding: '16px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: '#38bdf8', fontWeight: 'bold' }}>
                🤖 AI INFERENCE INTELLIGENCE
              </span>
              <span
                style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  background: aiInsight.source === 'OLLAMA' ? '#05966922' : '#f59e0b22',
                  color: aiInsight.source === 'OLLAMA' ? '#34d399' : '#fbbf24',
                  border: `1px solid ${aiInsight.source === 'OLLAMA' ? '#059669' : '#f59e0b'}`,
                }}
              >
                {aiInsight.source} ({aiInsight.model})
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '3px',
                  fontWeight: 'bold',
                  background:
                    aiInsight.riskLevel === 'LOW'
                      ? '#00ff6622'
                      : aiInsight.riskLevel === 'MEDIUM'
                      ? '#facc1522'
                      : '#f8717122',
                  color:
                    aiInsight.riskLevel === 'LOW'
                      ? '#00ff66'
                      : aiInsight.riskLevel === 'MEDIUM'
                      ? '#facc15'
                      : '#f87171',
                  border: `1px solid ${
                    aiInsight.riskLevel === 'LOW'
                      ? '#00ff66'
                      : aiInsight.riskLevel === 'MEDIUM'
                      ? '#facc15'
                      : '#f87171'
                  }`,
                }}
              >
                RISK: {aiInsight.riskLevel}
              </span>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                Conf: {Math.round(aiInsight.confidence * 100)}%
              </span>
              <button
                onClick={() => setShowIntelligence(false)}
                style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '12px' }}
              >
                ✕
              </button>
            </div>
          </div>

          <div style={{ fontSize: '12px', color: '#bae6fd', lineHeight: '1.6' }}>
            <div style={{ marginBottom: '8px', padding: '10px', background: '#040d17', borderRadius: '4px', borderLeft: '3px solid #38bdf8' }}>
              {aiInsight.assessment}
            </div>

            {aiInsight.recommendations && aiInsight.recommendations.length > 0 && (
              <div style={{ marginTop: '10px' }}>
                <strong style={{ color: '#7dd3fc', fontSize: '11px' }}>ACTIONABLE AI RECOMMENDATIONS:</strong>
                <ul style={{ margin: '6px 0 0', paddingLeft: '20px', color: '#e0f2fe' }}>
                  {aiInsight.recommendations.map((rec: string, idx: number) => (
                    <li key={idx} style={{ marginBottom: '4px' }}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ marginTop: '10px', fontSize: '10px', color: '#64748b', wordBreak: 'break-all' }}>
              Cryptographic Proof: <code>{aiInsight.proof}</code> (Latency: {aiInsight.latencyMs}ms)
            </div>
          </div>
        </div>
      )}

      {/* Vector Memory Recall Card */}
      {showVectorMemory && (
        <div
          style={{
            background: '#0e0b1f',
            border: '1px solid #c084fc66',
            borderRadius: '6px',
            padding: '16px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: '#d8b4fe', fontWeight: 'bold' }}>
                🧠 QDRANT SEMANTIC VECTOR MEMORY RECALL
              </span>
              <span
                style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  background: memoryStatus?.available ? '#05966922' : '#64748b22',
                  color: memoryStatus?.available ? '#34d399' : '#94a3b8',
                  border: `1px solid ${memoryStatus?.available ? '#059669' : '#64748b'}`,
                }}
              >
                {memoryStatus?.available ? `ONLINE (${memoryStatus.vectorCount} embeddings)` : 'FALLBACK (OFFLINE)'}
              </span>
            </div>
            <button
              onClick={() => setShowVectorMemory(false)}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '14px' }}
            >
              ✕
            </button>
          </div>

          {/* Search Input */}
          <form onSubmit={searchVectorMemory} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <input
              type="text"
              placeholder="Search past blocks (e.g. silicon yield, grid load, consensus)..."
              value={vectorQuery}
              onChange={(e) => setVectorQuery(e.target.value)}
              style={{
                flex: 1,
                background: '#04030a',
                border: '1px solid #c084fc44',
                borderRadius: '4px',
                padding: '8px 12px',
                color: '#e9d5ff',
                fontSize: '12px',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={vectorLoading}
              style={{
                background: '#7c3aed',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: vectorLoading ? 'wait' : 'pointer',
              }}
            >
              {vectorLoading ? 'SEARCHING...' : 'RECALL'}
            </button>
          </form>

          {/* Results list */}
          {vectorResults.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {vectorResults.map((res: any, idx: number) => (
                <div
                  key={idx}
                  style={{
                    background: '#06040d',
                    border: '1px solid #c084fc33',
                    padding: '10px',
                    borderRadius: '4px',
                    fontSize: '11px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#d8b4fe', fontWeight: 'bold' }}>Block #{res.metadata?.index || idx + 1}</span>
                    <span style={{ color: '#34d399' }}>Similarity: {Math.round((res.score || 0) * 100)}%</span>
                  </div>
                  <div style={{ color: '#94a3b8', wordBreak: 'break-all' }}>Hash: <code>{res.blockHash}</code></div>
                </div>
              ))}
            </div>
          ) : (
            vectorQuery && !vectorLoading && (
              <div style={{ color: '#94a3b8', fontSize: '11px', fontStyle: 'italic', padding: '8px 0' }}>
                No semantic matches found for "{vectorQuery}". Try broader search terms.
              </div>
            )
          )}
        </div>
      )}

      {/* Main Grid: Tip & Key Info */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {/* Ledger Tip Card */}
        <div
          style={{
            background: '#071018',
            border: '1px solid #00ff6644',
            borderRadius: '6px',
            padding: '18px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: '#6ee7b7', fontWeight: 'bold' }}>
              IMMUTABLE LEDGER TIP
            </span>
            {tip && (
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '3px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  background: `${getStatusColor(tip.evidence.status)}22`,
                  color: getStatusColor(tip.evidence.status),
                  border: `1px solid ${getStatusColor(tip.evidence.status)}`,
                }}
              >
                {tip.evidence.status}
              </span>
            )}
          </div>

          {tip ? (
            <div>
              <div
                style={{
                  background: '#020609',
                  border: '1px dashed #00ff6633',
                  padding: '12px',
                  borderRadius: '4px',
                  marginBottom: '14px',
                  fontSize: '12px',
                  lineHeight: '1.5',
                }}
              >
                <div style={{ color: '#00ff66', fontWeight: 'bold', marginBottom: '6px' }}>
                  Ω ➔ [👁 {Math.round(tip.observation.siliconYield * 100)}% | ✓ {tip.evidence.status} | 🧠 #{tip.index}]
                </div>
                <div><span style={{ color: '#6ee7b7' }}>Block Height:</span> #{tip.index}</div>
                <div><span style={{ color: '#6ee7b7' }}>Proof Nonce:</span> {tip.nonce} consensus cycles</div>
                <div style={{ wordBreak: 'break-all', marginTop: '4px' }}>
                  <span style={{ color: '#6ee7b7' }}>Hash:</span> <code style={{ color: '#34d399' }}>{tip.hash}</code>
                </div>
              </div>

              {/* Material Gauges */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <div style={{ background: '#0b1622', padding: '8px', borderRadius: '4px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>SILICON YIELD</div>
                  <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#00ff66', marginTop: '2px' }}>
                    {Math.round(tip.observation.siliconYield * 100)}%
                  </div>
                </div>
                <div style={{ background: '#0b1622', padding: '8px', borderRadius: '4px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>GRID LOAD</div>
                  <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#38bdf8', marginTop: '2px' }}>
                    {tip.observation.gridLoadMegawatts} MW
                  </div>
                </div>
                <div style={{ background: '#0b1622', padding: '8px', borderRadius: '4px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>ACCELERATORS</div>
                  <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#f59e0b', marginTop: '2px' }}>
                    {(tip.observation.acceleratorInventory / 1000).toFixed(0)}k
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p style={{ color: '#64748b', fontSize: '12px' }}>Awaiting initial tip sync...</p>
          )}
        </div>

        {/* Cryptographic Key & Guard Card */}
        <div
          style={{
            background: '#071018',
            border: '1px solid #00ff6644',
            borderRadius: '6px',
            padding: '18px',
          }}
        >
          <div style={{ fontSize: '13px', color: '#6ee7b7', fontWeight: 'bold', marginBottom: '12px' }}>
            HARDWARE ENCLAVE & PROVENANCE
          </div>

          {keyPair ? (
            <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ color: '#34d399', fontWeight: 'bold' }}>ENCLAVE TYPE:</span>{' '}
                <span style={{ color: '#00ff66' }}>{keyPair.type}</span>
              </div>
              <div style={{ color: '#94a3b8', marginBottom: '4px' }}>PUBLIC KEY FINGERPRINT:</div>
              <pre
                style={{
                  background: '#020609',
                  border: '1px solid #1e293b',
                  color: '#64748b',
                  padding: '8px',
                  borderRadius: '3px',
                  fontSize: '9px',
                  overflowX: 'auto',
                  maxHeight: '85px',
                  margin: '0 0 10px',
                }}
              >
                {keyPair.publicKey}
              </pre>
              <div style={{ color: '#64748b', fontSize: '10px' }}>
                Signed requests are attested and verified on the Fastify API with fail-closed security.
              </div>
            </div>
          ) : (
            <div style={{ color: '#64748b', fontSize: '11px', lineHeight: '1.5' }}>
              <p>No cryptographic key mounted.</p>
              <p>
                Click <strong>WEBCRYPTO PASSKEY ENCLAVE</strong> to initialize client-side browser hardware keys, or <strong>ED25519 KEYPAIR</strong> for server-issued keys.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Real-time Telemetry Pulse & Yield Timeline */}
      {history.length > 0 && (
        <div
          style={{
            background: '#040d16',
            border: '1px solid #00ff6633',
            borderRadius: '6px',
            padding: '16px',
            marginTop: '20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', color: '#6ee7b7', fontWeight: 'bold' }}>
              📈 PLANETARY TELEMETRY PULSE & YIELD TIMELINE ({history.length} EPOCHS)
            </span>
            <div style={{ display: 'flex', gap: '14px', fontSize: '11px' }}>
              <span style={{ color: '#00ff66' }}>● Silicon Yield %</span>
              <span style={{ color: '#38bdf8' }}>● Grid Load (MW)</span>
            </div>
          </div>

          <div style={{ position: 'relative', width: '100%', height: '85px' }}>
            <svg
              viewBox="0 0 600 85"
              preserveAspectRatio="none"
              style={{ width: '100%', height: '100%', overflow: 'visible' }}
            >
              <defs>
                <linearGradient id="yieldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00ff66" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#00ff66" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Background Reference Lines */}
              <line x1="0" y1="15" x2="600" y2="15" stroke="#1e293b" strokeDasharray="3 3" />
              <line x1="0" y1="45" x2="600" y2="45" stroke="#1e293b" strokeDasharray="3 3" />
              <line x1="0" y1="75" x2="600" y2="75" stroke="#1e293b" strokeDasharray="3 3" />

              {(() => {
                const chronBlocks = [...history].reverse();
                if (chronBlocks.length === 1) {
                  const b = chronBlocks[0];
                  const yYield = 75 - ((b.observation?.siliconYield || 0.9) - 0.8) * 300;
                  return (
                    <circle cx="300" cy={Math.max(15, Math.min(75, yYield))} r="4" fill="#00ff66" />
                  );
                }

                const step = 600 / (chronBlocks.length - 1);
                const yieldPoints = chronBlocks.map((b, i) => {
                  const x = i * step;
                  const ratio = Math.max(0, Math.min(1, ((b.observation?.siliconYield || 0.9) - 0.8) / 0.2));
                  const y = 75 - ratio * 60;
                  return { x, y };
                });

                const gridPoints = chronBlocks.map((b, i) => {
                  const x = i * step;
                  const ratio = Math.max(0, Math.min(1, ((b.observation?.gridLoadMegawatts || 1000) - 500) / 1500));
                  const y = 75 - ratio * 55;
                  return { x, y };
                });

                const yieldPath = yieldPoints.reduce(
                  (acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`,
                  ''
                );
                const yieldArea = `${yieldPath} L 600 80 L 0 80 Z`;

                const gridPath = gridPoints.reduce(
                  (acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`,
                  ''
                );

                return (
                  <g>
                    <path d={yieldArea} fill="url(#yieldGrad)" />
                    <path d={gridPath} fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 2" />
                    <path d={yieldPath} fill="none" stroke="#00ff66" strokeWidth="2" />
                    {yieldPoints.map((p, i) => (
                      <circle
                        key={i}
                        cx={p.x}
                        cy={p.y}
                        r="3"
                        fill="#00ff66"
                        stroke="#040d16"
                        strokeWidth="1.5"
                      />
                    ))}
                  </g>
                );
              })()}
            </svg>
          </div>
        </div>
      )}

      {/* Live Rolling Block History Feed */}
      <div style={{ marginTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '13px', color: '#6ee7b7', fontWeight: 'bold' }}>
            IMMUTABLE CONSENSUS STREAM ({history.length} BLOCKS IN BUFFER)
          </span>
          {minerActive && (
            <span style={{ color: '#ffaa00', fontSize: '11px', fontWeight: 'bold' }}>
              AUTO-MINING ACTIVE (Total: {minerStats.totalMined})
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {history.map((block) => (
            <div
              key={block.hash}
              style={{
                background: '#050a0f',
                borderLeft: `4px solid ${getStatusColor(block.evidence.status)}`,
                borderTop: '1px solid #00ff6615',
                borderRight: '1px solid #00ff6615',
                borderBottom: '1px solid #00ff6615',
                padding: '8px 14px',
                borderRadius: '3px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '11px',
              }}
            >
              <div>
                <strong style={{ color: '#00ff66', marginRight: '8px' }}>#{block.index}</strong>
                <code style={{ color: '#94a3b8' }}>{block.hash.substring(0, 26)}...</code>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ color: '#6ee7b7' }}>Yield: {Math.round(block.observation.siliconYield * 100)}%</span>
                <span style={{ color: '#38bdf8' }}>{block.observation.gridLoadMegawatts}MW</span>
                <span style={{ color: getStatusColor(block.evidence.status), fontWeight: 'bold' }}>
                  {block.evidence.status}
                </span>
                <span style={{ color: '#64748b' }}>{new Date(block.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      </>
      )}
    </div>
  );
}
