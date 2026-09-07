import React, { useState, useEffect } from 'react';

export default function App() {
  const [tip, setTip] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchTip = async () => {
    try {
      const r = await fetch('http://localhost:5000/v1/block/tip');
      const d = await r.json();
      if (d.tip) setTip(d.tip);
    } catch (e) {}
  };

  const cycle = async () => {
    setLoading(true);
    try {
      await fetch('http://localhost:5000/v1/cycle', { method: 'POST' });
      await fetchTip();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTip();
  }, []);

  return (
    <div
      style={{
        background: '#000',
        color: '#00ff66',
        fontFamily: 'monospace',
        minHeight: '100vh',
        padding: '24px',
      }}
    >
      <h2>Ω∞v Oceanicos Matrix Dashboard</h2>

      <button
        onClick={cycle}
        disabled={loading}
        style={{
          background: '#00ff66',
          color: '#000',
          border: 'none',
          padding: '10px 20px',
          cursor: 'pointer',
          fontWeight: 'bold',
        }}
      >
        {loading ? 'MINING BLOCK...' : 'EXECUTE OMNI-CYCLE'}
      </button>

      {tip ? (
        <pre
          style={{
            border: '1px dashed #00ff66',
            padding: '16px',
            marginTop: '20px',
            background: '#050505',
            whiteSpace: 'pre-wrap',
          }}
        >
          {'Ω ➔ [👁 ' +
            Math.round(tip.observation.siliconYield * 100) +
            '% | ✓ ' +
            tip.evidence.status +
            ' | 🧠 #' +
            tip.index +
            '] ── LIVE ── $ █\n\n' +
            'Block Hash: ' +
            tip.hash +
            '\nPrevious: ' +
            tip.previousHash +
            '\nNonce: ' +
            tip.nonce}
        </pre>
      ) : (
        <p style={{ marginTop: '20px' }}>No verified blocks on ledger.</p>
      )}
    </div>
  );
}
