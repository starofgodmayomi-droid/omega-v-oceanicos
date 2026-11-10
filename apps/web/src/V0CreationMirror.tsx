import React, { useState, useRef, useEffect } from 'react';

export interface V0CreationMirrorProps {
  onSendPrompt?: (prompt: string, model: string) => void;
  onOpenMenu?: () => void;
  initialPrompt?: string;
  className?: string;
}

const SUGGESTION_POOLS = [
  [
    {
      id: 'contact',
      label: 'Contact Form',
      query: 'Build a modern, accessible Contact Form with validation, floating labels, and dark-mode styling.',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      ),
    },
    {
      id: 'image-editor',
      label: 'Image Editor',
      query: 'Create a responsive in-browser Image Editor with brightness, contrast, blur filters, crop, and instant canvas export.',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </svg>
      ),
    },
    {
      id: 'mini-game',
      label: 'Mini Game',
      query: 'Build a retro-futuristic arcade Mini Game in React/Canvas with physics collision, score multiplier, and sound resonance.',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="12" x="2" y="6" rx="6" />
          <line x1="6" x2="10" y1="12" y2="12" />
          <line x1="8" x2="8" y1="10" y2="14" />
          <line x1="15" x2="15.01" y1="13" y2="13" />
          <line x1="18" x2="18.01" y1="11" y2="11" />
        </svg>
      ),
    },
    {
      id: 'finance-calculator',
      label: 'Finance Calculator',
      query: 'Develop an interactive Finance Calculator for compound interest, loan amortizations, inflation, and interactive charts.',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18" />
          <path d="m19 9-5 5-4-4-3 3" />
        </svg>
      ),
    },
  ],
  [
    {
      id: 'crypto-dex',
      label: 'Crypto Swap Terminal',
      query: 'Build a high-performance decentralized token swap interface with live slippage tolerance, liquidity charts, and gas estimates.',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 3h5v5" />
          <path d="m21 3-7 7" />
          <path d="m3 14 7-7 4 4 7-7" />
        </svg>
      ),
    },
    {
      id: 'kanban-board',
      label: 'Kanban Task Board',
      query: 'Create a drag-and-drop Kanban Board with column lanes, tag filtering, priority badges, and local persistence.',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M9 3v18" />
          <path d="M15 3v18" />
        </svg>
      ),
    },
    {
      id: 'audio-visualizer',
      label: '432 Hz Visualizer',
      query: 'Build an interactive Web Audio API frequency visualizer featuring harmonic 432 Hz resonance and fluid ocean ripple shader.',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 10v4" />
          <path d="M6 6v12" />
          <path d="M10 3v18" />
          <path d="M14 8v8" />
          <path d="M18 5v14" />
          <path d="M22 10v4" />
        </svg>
      ),
    },
    {
      id: 'saas-pricing',
      label: 'SaaS Pricing Grid',
      query: 'Build a modern SaaS pricing table with monthly/annual billing switch, feature comparison matrix, and highlight tiers.',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="14" x="2" y="5" rx="2" />
          <line x1="2" x2="22" y1="10" y2="10" />
        </svg>
      ),
    },
  ],
];

const AVAILABLE_MODELS = [
  { id: 'v0-mini', name: 'v0 Mini', desc: 'Fastest generation & iteration' },
  { id: 'v0-pro', name: 'v0 Pro', desc: 'Full multi-step architecture' },
  { id: 'omega-v-singularity', name: 'Ω∞v Mini', desc: 'OceanicOS living full-stack engine' },
  { id: 'kai-sovereign', name: 'KAI Sovereign', desc: 'Covenant state machine & truth engine' },
];

/* ── Interactive Sandboxed Components for Instant v0 Preview ── */

function ContactFormSandbox() {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');

  if (submitted) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: '#10b981' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>✓</div>
        <h3 style={{ margin: '0 0 8px', color: '#ffffff' }}>Message Verified & Dispatched</h3>
        <p style={{ color: '#94a3b8', fontSize: '14px', maxWidth: '380px', margin: '0 auto 20px' }}>
          Your inquiry has been signed with SHA-256 and queued to the sovereign communication ledger.
        </p>
        <button
          onClick={() => {
            setSubmitted(false);
            setName('');
            setEmail('');
            setMsg('');
          }}
          style={{
            padding: '8px 18px',
            borderRadius: '8px',
            background: '#1e293b',
            color: '#f8fafc',
            border: '1px solid #334155',
            cursor: 'pointer',
          }}
        >
          Send Another
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (name && email && msg) setSubmitted(true);
      }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        maxWidth: '420px',
        width: '100%',
        margin: '0 auto',
      }}
    >
      <div>
        <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Name</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ada Lovelace"
          style={{
            width: '100%',
            padding: '10px 12px',
            background: '#090d16',
            border: '1px solid #1e293b',
            borderRadius: '8px',
            color: '#f8fafc',
            outline: 'none',
          }}
        />
      </div>
      <div>
        <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ada@oceanicos.network"
          style={{
            width: '100%',
            padding: '10px 12px',
            background: '#090d16',
            border: '1px solid #1e293b',
            borderRadius: '8px',
            color: '#f8fafc',
            outline: 'none',
          }}
        />
      </div>
      <div>
        <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Message</label>
        <textarea
          required
          rows={3}
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="How can we build together?"
          style={{
            width: '100%',
            padding: '10px 12px',
            background: '#090d16',
            border: '1px solid #1e293b',
            borderRadius: '8px',
            color: '#f8fafc',
            outline: 'none',
            resize: 'none',
          }}
        />
      </div>
      <button
        type="submit"
        style={{
          padding: '11px',
          borderRadius: '8px',
          background: '#ffffff',
          color: '#000000',
          fontWeight: 600,
          border: 'none',
          cursor: 'pointer',
          marginTop: '6px',
        }}
      >
        Submit Inquiry
      </button>
    </form>
  );
}

function ImageEditorSandbox() {
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [blur, setBlur] = useState(0);
  const [hue, setHue] = useState(0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%' }}>
      {/* Canvas Viewport */}
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          height: '240px',
          borderRadius: '12px',
          overflow: 'hidden',
          background: 'radial-gradient(circle at center, #0284c7 0%, #082f49 50%, #030712 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          filter: `brightness(${brightness}%) contrast(${contrast}%) blur(${blur}px) hue-rotate(${hue}deg)`,
          boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
          transition: 'filter 0.05s linear',
        }}
      >
        <div style={{ textAlign: 'center', color: '#ffffff', userSelect: 'none' }}>
          <div style={{ fontSize: '48px', marginBottom: '6px' }}>💧</div>
          <div style={{ fontWeight: 800, fontSize: '18px', letterSpacing: '0.05em' }}>Ω∞v OCEAN CANVAS</div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>Real-time CSS/Canvas Filter Shader</div>
        </div>
      </div>

      {/* Sliders */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          width: '100%',
          maxWidth: '520px',
        }}
      >
        <div>
          <label style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
            <span>Brightness</span>
            <span>{brightness}%</span>
          </label>
          <input
            type="range"
            min={30}
            max={200}
            value={brightness}
            onChange={(e) => setBrightness(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#00e5ff' }}
          />
        </div>
        <div>
          <label style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
            <span>Contrast</span>
            <span>{contrast}%</span>
          </label>
          <input
            type="range"
            min={30}
            max={200}
            value={contrast}
            onChange={(e) => setContrast(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#00e5ff' }}
          />
        </div>
        <div>
          <label style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
            <span>Blur</span>
            <span>{blur}px</span>
          </label>
          <input
            type="range"
            min={0}
            max={10}
            value={blur}
            onChange={(e) => setBlur(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#00e5ff' }}
          />
        </div>
        <div>
          <label style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
            <span>Hue Rotate</span>
            <span>{hue}°</span>
          </label>
          <input
            type="range"
            min={0}
            max={360}
            value={hue}
            onChange={(e) => setHue(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#00e5ff' }}
          />
        </div>
      </div>

      <button
        onClick={() => {
          setBrightness(100);
          setContrast(100);
          setBlur(0);
          setHue(0);
        }}
        style={{
          padding: '6px 16px',
          borderRadius: '6px',
          background: '#18181b',
          border: '1px solid #27272a',
          color: '#a1a1aa',
          fontSize: '12px',
          cursor: 'pointer',
        }}
      >
        Reset Filters
      </button>
    </div>
  );
}

function MiniGameSandbox() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [bubblePos, setBubblePos] = useState({ top: 40, left: 50 });

  const handleClick = () => {
    const nextScore = score + 1;
    setScore(nextScore);
    if (nextScore > highScore) setHighScore(nextScore);
    // Move bubble to new random location
    setBubblePos({
      top: Math.floor(Math.random() * 70) + 15,
      left: Math.floor(Math.random() * 80) + 10,
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <div style={{ display: 'flex', gap: '20px', marginBottom: '12px', fontSize: '14px', fontFamily: 'monospace' }}>
        <span>SCORE: <strong style={{ color: '#00e5ff' }}>{score}</strong></span>
        <span>HIGH: <strong style={{ color: '#f59e0b' }}>{highScore}</strong></span>
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          height: '240px',
          background: '#070b14',
          border: '1px solid #1e293b',
          borderRadius: '12px',
          position: 'relative',
          overflow: 'hidden',
          cursor: 'crosshair',
        }}
      >
        <div
          onClick={handleClick}
          style={{
            position: 'absolute',
            top: `${bubblePos.top}%`,
            left: `${bubblePos.left}%`,
            transform: 'translate(-50%, -50%)',
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #00e5ff 0%, #0369a1 100%)',
            boxShadow: '0 0 16px rgba(0, 229, 255, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            userSelect: 'none',
            fontSize: '18px',
            cursor: 'pointer',
            transition: 'all 0.1s ease-out',
          }}
        >
          💧
        </div>
      </div>
      <p style={{ fontSize: '11px', color: '#64748b', marginTop: '10px' }}>
        Click the Water Singularity bubble as it teleports through the quantum field.
      </p>
    </div>
  );
}

function FinanceCalculatorSandbox() {
  const [principal, setPrincipal] = useState(10000);
  const [monthly, setMonthly] = useState(500);
  const [years, setYears] = useState(10);
  const [rate, setRate] = useState(8);

  const calculateTotal = () => {
    let total = principal;
    const monthlyRate = rate / 100 / 12;
    const months = years * 12;
    for (let i = 0; i < months; i++) {
      total = (total + monthly) * (1 + monthlyRate);
    }
    return Math.round(total);
  };

  const total = calculateTotal();
  const totalContributed = principal + monthly * years * 12;
  const totalInterest = Math.max(0, total - totalContributed);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '480px', width: '100%' }}>
      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '10px', padding: '12px' }}>
          <div style={{ fontSize: '11px', color: '#64748b' }}>TOTAL ESTIMATE</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#10b981' }}>${total.toLocaleString()}</div>
        </div>
        <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '10px', padding: '12px' }}>
          <div style={{ fontSize: '11px', color: '#64748b' }}>INTEREST EARNED</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#38bdf8' }}>${totalInterest.toLocaleString()}</div>
        </div>
      </div>

      {/* Inputs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
          <label style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
            <span>Initial Investment:</span>
            <span>${principal.toLocaleString()}</span>
          </label>
          <input
            type="range"
            min={1000}
            max={100000}
            step={1000}
            value={principal}
            onChange={(e) => setPrincipal(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#10b981' }}
          />
        </div>
        <div>
          <label style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
            <span>Monthly Contribution:</span>
            <span>${monthly.toLocaleString()}</span>
          </label>
          <input
            type="range"
            min={0}
            max={5000}
            step={50}
            value={monthly}
            onChange={(e) => setMonthly(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#10b981' }}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
              <span>Years:</span>
              <span>{years}y</span>
            </label>
            <input
              type="range"
              min={1}
              max={40}
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#38bdf8' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
              <span>Return:</span>
              <span>{rate}%</span>
            </label>
            <input
              type="range"
              min={1}
              max={25}
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#38bdf8' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function V0CreationMirror({
  onSendPrompt,
  onOpenMenu,
  initialPrompt = '',
  className = '',
}: V0CreationMirrorProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0]);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [poolIndex, setPoolIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [refreshSpinning, setRefreshSpinning] = useState(false);
  const [activePreview, setActivePreview] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [copiedCode, setCopiedCode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-resize textarea
  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.max(76, Math.min(textareaRef.current.scrollHeight, 240)) + 'px';
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [prompt]);

  const handleSubmit = (textOverride?: string, previewId?: string) => {
    const text = (textOverride !== undefined ? textOverride : prompt).trim();
    if (!text) return;

    if (previewId) {
      setActivePreview(previewId);
      setActiveTab('preview');
      return;
    }

    // Check if the prompt matches one of the standard interactive prototypes
    const lower = text.toLowerCase();
    if (lower.includes('contact form')) {
      setActivePreview('contact');
      setActiveTab('preview');
    } else if (lower.includes('image editor')) {
      setActivePreview('image-editor');
      setActiveTab('preview');
    } else if (lower.includes('mini game') || lower.includes('arcade')) {
      setActivePreview('mini-game');
      setActiveTab('preview');
    } else if (lower.includes('finance') || lower.includes('calculator') || lower.includes('compound')) {
      setActivePreview('finance-calculator');
      setActiveTab('preview');
    } else if (onSendPrompt) {
      onSendPrompt(text, selectedModel.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const cyclePool = () => {
    setRefreshSpinning(true);
    setPoolIndex((prev) => (prev + 1) % SUGGESTION_POOLS.length);
    setTimeout(() => setRefreshSpinning(false), 350);
  };

  const toggleMic = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser environment.');
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!isListening) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        recognition.onstart = () => setIsListening(true);
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setPrompt((prev) => (prev ? `${prev} ${transcript}` : transcript));
          setIsListening(false);
        };
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
        recognition.start();
      } catch {
        setIsListening(false);
      }
    } else {
      setIsListening(false);
    }
  };

  const getCodeSnippet = (id: string | null) => {
    if (id === 'contact') {
      return `import React, { useState } from 'react';\n\nexport function ContactForm() {\n  const [submitted, setSubmitted] = useState(false);\n  const [form, setForm] = useState({ name: '', email: '', message: '' });\n\n  if (submitted) return <div className="text-emerald-400">Message Verified & Queued!</div>;\n\n  return (\n    <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }}>\n      <input placeholder="Name" required onChange={(e) => setForm({ ...form, name: e.target.value })} />\n      <input placeholder="Email" type="email" required onChange={(e) => setForm({ ...form, email: e.target.value })} />\n      <textarea placeholder="Message" required onChange={(e) => setForm({ ...form, message: e.target.value })} />\n      <button type="submit">Submit Inquiry</button>\n    </form>\n  );\n}`;
    }
    if (id === 'image-editor') {
      return `import React, { useState } from 'react';\n\nexport function ImageEditor() {\n  const [brightness, setBrightness] = useState(100);\n  const [contrast, setContrast] = useState(100);\n\n  return (\n    <div>\n      <div style={{ filter: \`brightness(\${brightness}%) contrast(\${contrast}%)\` }} />\n      <input type="range" min={50} max={150} value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} />\n    </div>\n  );\n}`;
    }
    if (id === 'mini-game') {
      return `import React, { useState } from 'react';\n\nexport function MiniGame() {\n  const [score, setScore] = useState(0);\n  return (\n    <div>\n      <h2>Score: {score}</h2>\n      <button onClick={() => setScore(s => s + 1)}>Catch Singularity</button>\n    </div>\n  );\n}`;
    }
    return `import React, { useState } from 'react';\n\nexport function FinanceCalculator() {\n  const [principal, setPrincipal] = useState(10000);\n  const [rate, setRate] = useState(8);\n  return <div>Total Future Value: \${(principal * (1 + rate/100)).toLocaleString()}</div>;\n}`;
  };

  const copyCode = () => {
    const code = getCodeSnippet(activePreview);
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const currentPool = SUGGESTION_POOLS[poolIndex];

  return (
    <div
      className={className}
      style={{
        background: '#000000',
        color: '#ffffff',
        minHeight: '520px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px 20px 48px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        boxSizing: 'border-box',
        position: 'relative',
        borderRadius: '16px',
        overflow: 'hidden',
      }}
    >
      {/* ── Top Bar ── */}
      <header
        style={{
          width: '100%',
          maxWidth: '840px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 0 20px',
        }}
      >
        {/* v0 Geometric Logo */}
        <div
          onClick={() => setActivePreview(null)}
          style={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            userSelect: 'none',
          }}
          title="v0 by Vercel · Ω∞v Oceanicos Mirror"
        >
          <svg width="34" height="20" viewBox="0 0 34 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 3L6.4 17H10.6L17 3H12.6L8.5 12.4L4.4 3H0Z" fill="#ffffff" />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M19 3H33V17H19V3ZM23.4 6.8V13.2H28.6V6.8H23.4Z"
              fill="#ffffff"
            />
            <path d="M22 14.5L30 5.5" stroke="#000000" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </div>

        {/* Hamburger Menu / Side Panel Trigger */}
        <button
          onClick={onOpenMenu}
          aria-label="Navigation Menu"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#ffffff',
            cursor: 'pointer',
            padding: '8px 4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '6px',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <svg width="24" height="14" viewBox="0 0 24 14" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round">
            <line x1="1" y1="2" x2="23" y2="2" />
            <line x1="1" y1="12" x2="23" y2="12" />
          </svg>
        </button>
      </header>

      {/* ── Active Component Sandbox (Preview | Code) ── */}
      {activePreview ? (
        <div
          style={{
            width: '100%',
            maxWidth: '720px',
            background: '#0d1117',
            border: '1px solid #21262d',
            borderRadius: '16px',
            padding: '20px',
            marginTop: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
          }}
        >
          {/* Sub-header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #21262d', paddingBottom: '12px' }}>
            <button
              onClick={() => setActivePreview(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              ← Back to Create
            </button>

            {/* Preview / Code tabs */}
            <div style={{ display: 'flex', gap: '4px', background: '#161b22', padding: '3px', borderRadius: '8px' }}>
              <button
                onClick={() => setActiveTab('preview')}
                style={{
                  padding: '4px 12px',
                  borderRadius: '6px',
                  background: activeTab === 'preview' ? '#21262d' : 'transparent',
                  color: activeTab === 'preview' ? '#ffffff' : '#8b949e',
                  border: 'none',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Preview
              </button>
              <button
                onClick={() => setActiveTab('code')}
                style={{
                  padding: '4px 12px',
                  borderRadius: '6px',
                  background: activeTab === 'code' ? '#21262d' : 'transparent',
                  color: activeTab === 'code' ? '#ffffff' : '#8b949e',
                  border: 'none',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Code
              </button>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={copyCode}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: '#21262d',
                  border: 'none',
                  color: copiedCode ? '#10b981' : '#c9d1d9',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                {copiedCode ? '✓ Copied' : 'Copy Code'}
              </button>
              {onSendPrompt && (
                <button
                  onClick={() => onSendPrompt(`Iterate on ${activePreview} component: add persistent storage and responsive glassmorphism.`, selectedModel.id)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: '#238636',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Iterate in Chat
                </button>
              )}
            </div>
          </div>

          {/* Body */}
          <div style={{ minHeight: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {activeTab === 'preview' ? (
              activePreview === 'contact' ? (
                <ContactFormSandbox />
              ) : activePreview === 'image-editor' ? (
                <ImageEditorSandbox />
              ) : activePreview === 'mini-game' ? (
                <MiniGameSandbox />
              ) : (
                <FinanceCalculatorSandbox />
              )
            ) : (
              <pre
                style={{
                  width: '100%',
                  height: '240px',
                  overflow: 'auto',
                  background: '#090d16',
                  padding: '14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#e2e8f0',
                  margin: 0,
                  fontFamily: 'monospace',
                }}
              >
                {getCodeSnippet(activePreview)}
              </pre>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* ── Hero Heading ── */}
          <h1
            style={{
              fontSize: 'clamp(28px, 4.5vw, 38px)',
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-0.025em',
              margin: '36px 0 24px',
              textAlign: 'center',
              lineHeight: 1.15,
            }}
          >
            What do you want to create?
          </h1>

          {/* ── Prompt Card ── */}
          <div
            style={{
              width: '100%',
              maxWidth: '680px',
              background: '#0e0e10',
              border: '1px solid #27272a',
              borderRadius: '16px',
              padding: '16px 18px 14px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.65)',
              display: 'flex',
              flexDirection: 'column',
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
              boxSizing: 'border-box',
              position: 'relative',
            }}
          >
            {/* Multiline Prompt Input */}
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask v0 to build..."
              rows={2}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#f4f4f5',
                fontSize: '15px',
                lineHeight: 1.5,
                resize: 'none',
                fontFamily: 'inherit',
                minHeight: '76px',
                padding: 0,
                margin: 0,
                boxSizing: 'border-box',
              }}
            />

            {/* Bottom Control Bar Inside Card */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '8px',
                position: 'relative',
              }}
            >
              {/* Model Selector Pill (Bottom-Left) */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setModelDropdownOpen((v) => !v)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    background: modelDropdownOpen ? '#27272a' : 'transparent',
                    border: 'none',
                    color: '#a1a1aa',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    userSelect: 'none',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.background = '#18181b';
                  }}
                  onMouseLeave={(e) => {
                    if (!modelDropdownOpen) {
                      e.currentTarget.style.color = '#a1a1aa';
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none" />
                  </svg>
                  <span>{selectedModel.name}</span>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>

                {/* Model Dropdown Menu */}
                {modelDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 'calc(100% + 8px)',
                      left: 0,
                      background: '#141416',
                      border: '1px solid #27272a',
                      borderRadius: '12px',
                      boxShadow: '0 12px 36px rgba(0,0,0,0.8)',
                      padding: '6px',
                      width: '210px',
                      zIndex: 50,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                    }}
                  >
                    {AVAILABLE_MODELS.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setSelectedModel(m);
                          setModelDropdownOpen(false);
                        }}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          background: selectedModel.id === m.id ? '#27272a' : 'transparent',
                          border: 'none',
                          color: selectedModel.id === m.id ? '#ffffff' : '#d4d4d8',
                          fontSize: '12.5px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          width: '100%',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#27272a')}
                        onMouseLeave={(e) => {
                          if (selectedModel.id !== m.id) e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{m.name}</span>
                        <span style={{ fontSize: '11px', color: '#71717a' }}>{m.desc}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Controls: Mic + Submit Button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={toggleMic}
                  aria-label="Voice Input"
                  title={isListening ? 'Listening… click to stop' : 'Speech input'}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: isListening ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                    border: isListening ? '1px solid #ef4444' : 'none',
                    color: isListening ? '#ef4444' : '#a1a1aa',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isListening) e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    if (!isListening) e.currentTarget.style.color = '#a1a1aa';
                  }}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" x2="12" y1="19" y2="22" />
                  </svg>
                </button>

                <button
                  onClick={() => handleSubmit()}
                  disabled={!prompt.trim()}
                  aria-label="Submit"
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: prompt.trim() ? '#ffffff' : '#222225',
                    border: 'none',
                    color: prompt.trim() ? '#000000' : '#52525b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: prompt.trim() ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s ease',
                    boxShadow: prompt.trim() ? '0 0 12px rgba(255, 255, 255, 0.3)' : 'none',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 12 7-7 7 7" />
                    <path d="M12 19V5" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* ── Quick Action Suggestion Pills ── */}
          <div
            style={{
              width: '100%',
              maxWidth: '680px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
              marginTop: '22px',
            }}
          >
            {/* Row 1: First 3 Chips */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                flexWrap: 'wrap',
              }}
            >
              {currentPool.slice(0, 3).map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSubmit(item.query, item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 18px',
                    borderRadius: '9999px',
                    background: '#121214',
                    border: '1px solid #27272a',
                    color: '#e4e4e7',
                    fontSize: '13.5px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    userSelect: 'none',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#1a1a1e';
                    e.currentTarget.style.borderColor = '#3f3f46';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#121214';
                    e.currentTarget.style.borderColor = '#27272a';
                    e.currentTarget.style.color = '#e4e4e7';
                  }}
                >
                  <span style={{ color: '#a1a1aa', display: 'flex', alignItems: 'center' }}>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            {/* Row 2: 4th Chip + Refresh Circle Button */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {currentPool.slice(3, 4).map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSubmit(item.query, item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 18px',
                    borderRadius: '9999px',
                    background: '#121214',
                    border: '1px solid #27272a',
                    color: '#e4e4e7',
                    fontSize: '13.5px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    userSelect: 'none',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#1a1a1e';
                    e.currentTarget.style.borderColor = '#3f3f46';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#121214';
                    e.currentTarget.style.borderColor = '#27272a';
                    e.currentTarget.style.color = '#e4e4e7';
                  }}
                >
                  <span style={{ color: '#a1a1aa', display: 'flex', alignItems: 'center' }}>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}

              {/* Refresh Suggestion Button */}
              <button
                onClick={cyclePool}
                aria-label="Refresh Suggestions"
                title="Refresh suggestions"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#121214',
                  border: '1px solid #27272a',
                  color: '#a1a1aa',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#1a1a1e';
                  e.currentTarget.style.borderColor = '#3f3f46';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#121214';
                  e.currentTarget.style.borderColor = '#27272a';
                  e.currentTarget.style.color = '#a1a1aa';
                }}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    transform: refreshSpinning ? 'rotate(360deg)' : 'none',
                    transition: 'transform 0.35s ease',
                  }}
                >
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                  <path d="M16 21h5v-5" />
                </svg>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
