import React, { useState, useEffect, useRef } from 'react';

interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export default function App() {
  const [tip, setTip] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [streamConnected, setStreamConnected] = useState(false);
  const [keyPair, setKeyPair] = useState<KeyPair | null>(null);
  const [signRequests, setSignRequests] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Connect to the real-time event stream
  useEffect(() => {
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
              return [payload.block, ...prev.slice(0, 9)];
            });
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

  const generateKeys = async () => {
    try {
      const res = await fetch('http://localhost:5000/v1/auth/keypair', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setKeyPair({ publicKey: data.publicKey, privateKey: data.privateKey });
        setSignRequests(true);
      }
    } catch (err: any) {
      setLastError('Failed to generate keypair: ' + err.message);
    }
  };

  const cycle = async () => {
    setLoading(true);
    setLastError(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };

      if (signRequests && keyPair) {
        // Sign payload via API signing endpoint or direct header
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
    if (status === 'PASS') return '#00ff66';
    if (status === 'DIVERGENT') return '#ffaa00';
    return '#ff3344';
  };

  return (
    <div
      style={{
        background: '#04070a',
        color: '#d1fae5',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        minHeight: '100vh',
        padding: '28px',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #00ff6633',
          paddingBottom: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <h1 style={{ margin: 0, color: '#00ff66', fontSize: '24px', letterSpacing: '0.05em' }}>
            Ω∞v OCEANICOS MAX MATRIX
          </h1>
          <p style={{ margin: '4px 0 0', color: '#6ee7b7', fontSize: '12px' }}>
            Deep-Tier Pluralistic Cryptographic Architecture & Telemetry Terminal
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
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
            {streamConnected ? 'STREAM: LIVE' : 'STREAM: OFFLINE'}
          </span>
        </div>
      </div>

      {/* Control Strip */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '14px',
          marginBottom: '24px',
          alignItems: 'center',
        }}
      >
        <button
          onClick={cycle}
          disabled={loading}
          style={{
            background: loading ? '#00aa44' : '#00ff66',
            color: '#04070a',
            border: 'none',
            borderRadius: '4px',
            padding: '12px 24px',
            fontSize: '13px',
            fontWeight: 'bold',
            cursor: loading ? 'wait' : 'pointer',
            boxShadow: '0 0 16px rgba(0, 255, 102, 0.3)',
            transition: 'all 0.15s ease',
          }}
        >
          {loading ? 'MINING CONSENSUS BLOCK...' : '⚡ EXECUTE OMNI-CYCLE'}
        </button>

        <button
          onClick={generateKeys}
          style={{
            background: '#092518',
            color: '#6ee7b7',
            border: '1px solid #00ff6655',
            borderRadius: '4px',
            padding: '12px 18px',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          🔑 {keyPair ? 'REGENERATE ED25519 KEYPAIR' : 'GENERATE ASYMMETRIC KEYPAIR'}
        </button>

        {keyPair && (
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              color: '#34d399',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={signRequests}
              onChange={(e) => setSignRequests(e.target.checked)}
              style={{ accentColor: '#00ff66' }}
            />
            Asymmetrically Seal State Commits
          </label>
        )}
      </div>

      {/* Error Banner */}
      {lastError && (
        <div
          style={{
            background: '#ff334422',
            border: '1px solid #ff3344',
            color: '#fca5a5',
            padding: '12px 16px',
            borderRadius: '4px',
            marginBottom: '20px',
            fontSize: '12px',
          }}
        >
          ⚠️ <strong>Security Guard Alert:</strong> {lastError}
        </div>
      )}

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Active Tip Card */}
        <div
          style={{
            background: '#081018',
            border: '1px solid #00ff6644',
            borderRadius: '6px',
            padding: '20px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '13px', color: '#6ee7b7', fontWeight: 'bold' }}>
              CURRENT LEDGER TIP
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
                  padding: '14px',
                  borderRadius: '4px',
                  marginBottom: '16px',
                  fontSize: '12px',
                  lineHeight: '1.6',
                }}
              >
                <div style={{ color: '#00ff66', fontWeight: 'bold', marginBottom: '8px' }}>
                  Ω ➔ [👁 {Math.round(tip.observation.siliconYield * 100)}% | ✓ {tip.evidence.status} | 🧠 #{tip.index}] ── LIVE ── $
                </div>
                <div><span style={{ color: '#6ee7b7' }}>Block Height:</span> #{tip.index}</div>
                <div><span style={{ color: '#6ee7b7' }}>Proof Nonce:</span> {tip.nonce} consensus cycles</div>
                <div><span style={{ color: '#6ee7b7' }}>Timestamp:</span> {tip.timestamp}</div>
                <div style={{ wordBreak: 'break-all', marginTop: '6px' }}>
                  <span style={{ color: '#6ee7b7' }}>Hash:</span> <code style={{ color: '#34d399' }}>{tip.hash}</code>
                </div>
                <div style={{ wordBreak: 'break-all', marginTop: '4px' }}>
                  <span style={{ color: '#6ee7b7' }}>Previous:</span> <code style={{ color: '#94a3b8' }}>{tip.previousHash}</code>
                </div>
              </div>

              {/* Material Telemetry Indicators */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <div style={{ background: '#0b1622', padding: '10px', borderRadius: '4px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>SILICON YIELD</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#00ff66', marginTop: '4px' }}>
                    {Math.round(tip.observation.siliconYield * 100)}%
                  </div>
                </div>
                <div style={{ background: '#0b1622', padding: '10px', borderRadius: '4px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>GRID LOAD</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#38bdf8', marginTop: '4px' }}>
                    {tip.observation.gridLoadMegawatts} MW
                  </div>
                </div>
                <div style={{ background: '#0b1622', padding: '10px', borderRadius: '4px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>ACCELERATORS</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#f59e0b', marginTop: '4px' }}>
                    {(tip.observation.acceleratorInventory / 1000).toFixed(0)}k
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p style={{ color: '#64748b', fontSize: '13px' }}>Awaiting initial block sync...</p>
          )}
        </div>

        {/* Cryptographic Key & Guard Status Card */}
        <div
          style={{
            background: '#081018',
            border: '1px solid #00ff6644',
            borderRadius: '6px',
            padding: '20px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ fontSize: '13px', color: '#6ee7b7', fontWeight: 'bold', marginBottom: '14px' }}>
            CRYPTOGRAPHIC GUARD & PROVENANCE
          </div>

          {keyPair ? (
            <div style={{ fontSize: '11px', lineHeight: '1.5' }}>
              <div style={{ marginBottom: '10px' }}>
                <span style={{ color: '#34d399', fontWeight: 'bold' }}>STATUS:</span>{' '}
                <span style={{ color: signRequests ? '#00ff66' : '#94a3b8' }}>
                  {signRequests ? 'ASYMMETRIC ED25519 SEAL ACTIVE' : 'OPEN INGESTION MODE'}
                </span>
              </div>
              <div style={{ color: '#94a3b8', marginBottom: '4px' }}>PUBLIC KEY (PEM):</div>
              <pre
                style={{
                  background: '#020609',
                  border: '1px solid #1e293b',
                  color: '#64748b',
                  padding: '8px',
                  borderRadius: '3px',
                  fontSize: '9px',
                  overflowX: 'auto',
                  maxHeight: '110px',
                  margin: '0 0 12px',
                }}
              >
                {keyPair.publicKey}
              </pre>
              <div style={{ color: '#94a3b8', fontSize: '11px' }}>
                Signed mutations verify against <code>AsymmetricValidationGuard</code> on the API server.
              </div>
            </div>
          ) : (
            <div style={{ color: '#64748b', fontSize: '12px', lineHeight: '1.6' }}>
              <p>No sovereign keypair mounted in session.</p>
              <p>
                Click <strong>GENERATE ASYMMETRIC KEYPAIR</strong> to initialize an Ed25519 cryptographic keypair and sign outbound state mutations.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Real-time Block History Feed */}
      <div style={{ marginTop: '28px' }}>
        <div style={{ fontSize: '14px', color: '#6ee7b7', fontWeight: 'bold', marginBottom: '12px' }}>
          IMMUTABLE BLOCK CHAIN STREAM
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {history.map((block) => (
            <div
              key={block.hash}
              style={{
                background: '#060c13',
                borderLeft: `4px solid ${getStatusColor(block.evidence.status)}`,
                borderTop: '1px solid #00ff6622',
                borderRight: '1px solid #00ff6622',
                borderBottom: '1px solid #00ff6622',
                padding: '10px 16px',
                borderRadius: '3px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '11px',
              }}
            >
              <div>
                <strong style={{ color: '#00ff66', marginRight: '10px' }}>#{block.index}</strong>
                <code style={{ color: '#94a3b8' }}>{block.hash.substring(0, 24)}...</code>
              </div>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
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
