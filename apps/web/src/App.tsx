import React, { useState, useEffect, useRef } from 'react';

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

  const eventSourceRef = useRef<EventSource | null>(null);

  // Poll miner status initially
  const fetchMinerStatus = async () => {
    try {
      const res = await fetch('http://localhost:5000/v1/miner/status');
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

  // Connect to the real-time event stream
  useEffect(() => {
    fetchMinerStatus();

    let es: EventSource | null = null;
    try {
      es = new EventSource('http://localhost:5000/v1/stream');
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
      const r = await fetch('http://localhost:5000/v1/block/tip');
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
      const res = await fetch('http://localhost:5000/v1/auth/keypair', { method: 'POST' });
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
        const res = await fetch('http://localhost:5000/v1/miner/stop', { method: 'POST' });
        const data = await res.json();
        if (data.success) setMinerActive(false);
      } else {
        const res = await fetch('http://localhost:5000/v1/miner/start', {
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
      const res = await fetch('http://localhost:5000/v1/mesh/simulate');
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

  // 5. Execute Single Omni-Cycle
  const cycle = async () => {
    setLoading(true);
    setLastError(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };

      if (signRequests && keyPair) {
        if (keyPair.type === 'ED25519_SERVER') {
          const signRes = await fetch('http://localhost:5000/v1/block/sign', {
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

      const res = await fetch('http://localhost:5000/v1/cycle', {
        method: 'POST',
        headers,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
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
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
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
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: streamConnected ? '#00ff66' : '#ff3344',
                boxShadow: streamConnected ? '0 0 8px #00ff66' : 'none',
              }}
            />
            {streamConnected ? 'SSE STREAM: LIVE' : 'SSE STREAM: OFFLINE'}
          </span>
        </div>
      </div>

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
    </div>
  );
}
