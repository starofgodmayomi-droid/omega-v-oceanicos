import React, { useState, useEffect } from 'react';

export default function App() {
  const [tip, setTip] = useState<any>(null);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTip = async () => {
    try {
      const res = await fetch('http://localhost:4102/v1/block/tip');
      const data = await res.json();
      if (data.tip) {
        setTip(data.tip);
        setBlocks((prev) => {
          if (prev.find((b) => b.hash === data.tip.hash)) return prev;
          return [data.tip, ...prev].slice(0, 5);
        });
      }
    } catch (e) {
      console.error('Ecosystem synchronization delay.');
    }
  };

  const triggerCycle = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:4102/v1/cycle', { method: 'POST' });
      const data = await res.json();
      if (data.block) {
        setTip(data.block);
        setBlocks((prev) => [data.block, ...prev].slice(0, 5));
      }
    } catch (e) {
      alert('Kernel Panic.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTip();
    const interval = setInterval(fetchTip, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        background: '#050505',
        color: '#00FF66',
        fontFamily: 'monospace',
        minHeight: '100vh',
        padding: '30px',
      }}
    >
      <header>
        <h1 style={{ margin: 0 }}>Ω∞v OCEANICOS // FULL-STACK VERIFIER COMPLETE</h1>
        <p style={{ opacity: 0.8 }}>Status: {tip ? 'SYNCHRONIZED' : 'INITIALIZING...'}</p>
        <button
          onClick={triggerCycle}
          disabled={loading}
          style={{
            background: '#00FF66',
            color: '#050505',
            border: 'none',
            padding: '10px 20px',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          {loading ? 'MINING BLOCK...' : 'TRIGGER CYCLE (MINE BLOCK)'}
        </button>
      </header>

      <main style={{ marginTop: '20px' }}>
        <h2>LATEST TIP:</h2>
        {tip ? (
          <pre
            style={{
              background: '#111',
              padding: '15px',
              border: '1px solid #00FF66',
              overflowX: 'auto',
            }}
          >
            {JSON.stringify(tip, null, 2)}
          </pre>
        ) : (
          <p>No block mined yet.</p>
        )}

        <h2>RECENT MINI BLOCKS:</h2>
        <div>
          {blocks.map((b) => (
            <div
              key={b.hash}
              style={{
                background: '#0d0d0d',
                padding: '10px',
                marginBottom: '10px',
                borderLeft: '4px solid #00FF66',
              }}
            >
              <div>
                <strong>Index:</strong> #{b.index} | <strong>Hash:</strong> {b.hash} (Nonce:{' '}
                {b.nonce})
              </div>
              <div>
                <strong>Evidence:</strong> {b.evidence?.status} via {b.evidence?.lawRoute}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
