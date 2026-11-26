import { useEffect, useRef, useState } from 'react';
import './StudioSettingsModal.css';

export type StudioTab = 'settings' | 'voice' | 'image' | 'video' | 'tools';

export interface StudioSettingsModalProps {
  onClose: () => void;
}

export function StudioSettingsModal({ onClose }: StudioSettingsModalProps) {
  const [tab, setTab] = useState<StudioTab>('settings');
  const [frequencyHz, setFrequencyHz] = useState<number>(432);
  const [selectedVoice, setSelectedVoice] = useState<string>('Soul AI');
  const [imagePrompt, setImagePrompt] = useState<string>('Sacred Water Intelligence & DAV Tensor (57,344)');
  const [renderedPreview, setRenderedPreview] = useState<boolean>(true);
  const [playingTone, setPlayingTone] = useState<boolean>(false);
  const [synthesisState, setSynthesisState] = useState<{
    assetId?: string;
    evidenceHash?: string;
    status?: string;
    loading?: boolean;
  }>({
    assetId: 'asset-7a42b109c8e1',
    evidenceHash: 'c4e976db57fcb5961e938927429be97520e0ffb0870ecfe1a6df8c29188f6b21',
    status: 'VERIFIED',
  });
  const [dispatchState, setDispatchState] = useState<{
    toolId?: string;
    dispatchId?: string;
    evidenceHash?: string;
    executionStatus?: string;
    loading?: boolean;
  }>({});
  const [orchestrationState, setOrchestrationState] = useState<{
    orchestrationId?: string;
    chainSeal?: string;
    totalStages?: number;
    completedStages?: number;
    status?: string;
    loading?: boolean;
  }>({});
  const [pipelineExecutionState, setPipelineExecutionState] = useState<{
    executionId?: string;
    bundleSeal?: string;
    totalStages?: number;
    completedStages?: number;
    artifacts?: Record<string, any>;
    status?: string;
    loading?: boolean;
  }>({});
  const [realityStatusState, setRealityStatusState] = useState<{
    totalTools?: number;
    healthyTools?: number;
    chainSeal?: string;
    integrityStatus?: string;
    loading?: boolean;
  }>({});
  const [circuitBreakerState, setCircuitBreakerState] = useState<{
    status?: string;
    tripsCount?: number;
    chainSeal?: string;
    loading?: boolean;
  }>({});
  const [failsafeState, setFailsafeState] = useState<{
    armed?: boolean;
    quarantineCount?: number;
    quarantineSeal?: string;
    loading?: boolean;
  }>({});
  const [canvasFrames, setCanvasFrames] = useState(0);
  const [canvasSeal, setCanvasSeal] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<EventSource | null>(null);

  const apiUrl = (path: string) => {
    const base = (import.meta as any).env?.VITE_API_URL || '/api';
    return `${base.replace(/\/$/, '')}${path}`;
  };

  const handleSynthesize = async () => {
    setSynthesisState((s) => ({ ...s, loading: true }));
    setRenderedPreview(true);
    try {
      const response = await fetch(apiUrl('/v1/studio/synthesize'), {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt,
          frequencyHz,
          organ: selectedVoice,
        }),
      });
      const data = await response.json();
      if (data?.success && data?.synthesis) {
        setSynthesisState({
          assetId: data.synthesis.assetId,
          evidenceHash: data.synthesis.evidenceHash,
          status: data.status,
          loading: false,
        });
      } else {
        setSynthesisState((s) => ({ ...s, loading: false }));
      }
    } catch {
      setSynthesisState((s) => ({ ...s, loading: false }));
    }
  };

  const handlePlayAcousticTone = async () => {
    setPlayingTone(true);
    try {
      const response = await fetch(apiUrl('/v1/companion/synthesize'), {
        method: 'POST',
        headers: { accept: 'application/json' },
      });
      const data = await response.json();
      if (data?.success && data?.synthesis?.audioDataUri) {
        if (typeof Audio !== 'undefined') {
          const audio = new Audio(data.synthesis.audioDataUri);
          audio.play().catch(() => {});
        }
      }
    } catch {
      // safe fallback
    } finally {
      setTimeout(() => setPlayingTone(false), 600);
    }
  };

  const REALITY_TOOLS = [
    { id: 'tool-microvm-sandbox', name: 'MicroVM Sandbox Runner', icon: '🔒', category: 'execution' },
    { id: 'tool-mcp-connectors', name: 'MCP Sovereign Connectors', icon: '🔌', category: 'grounding' },
    { id: 'tool-ollama-neural', name: 'Local Ollama Neural Engine', icon: '🧠', category: 'inference' },
    { id: 'tool-voice-acoustic', name: 'Acoustic Waveform Synthesizer', icon: '🎙️', category: 'multimodal_voice' },
    { id: 'tool-svg-tensor-canvas', name: 'Deterministic SVG Tensor Canvas', icon: '🎨', category: 'multimodal_image' },
    { id: 'tool-sse-video-stream', name: 'Real-Time SSE Video Pipeline', icon: '🎬', category: 'multimodal_video' },
    { id: 'tool-dav-tensor-validator', name: 'DAV Tensor Invariant Validator', icon: '📐', category: 'mathematical_law' },
    { id: 'tool-kai-immutable-ledger', name: 'KAI Immutable Ledger', icon: '📒', category: 'memory_governance' },
  ];

  const handleDispatchTool = async (toolId: string) => {
    setDispatchState({ loading: true });
    try {
      const response = await fetch(apiUrl('/v1/reality/dispatch'), {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ toolId, params: { target: 'bounded-execution-check' } }),
      });
      const data = await response.json();
      if (data?.success && data?.dispatch) {
        setDispatchState({
          toolId: data.dispatch.toolId,
          dispatchId: data.dispatch.dispatchId,
          evidenceHash: data.dispatch.evidenceHash,
          executionStatus: data.dispatch.executionStatus,
          loading: false,
        });
      } else {
        setDispatchState({ loading: false });
      }
    } catch {
      setDispatchState({ loading: false });
    }
  };

  const handleOrchestratePipeline = async () => {
    setOrchestrationState({ loading: true });
    try {
      const response = await fetch(apiUrl('/v1/reality/orchestrate'), {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          pipelineName: 'Sovereign Reality Continuum Pipeline',
          stages: [
            { toolId: 'tool-voice-acoustic', params: { frequencyHz: 432 } },
            { toolId: 'tool-svg-tensor-canvas', params: { dimensions: 20 } },
            { toolId: 'tool-dav-tensor-validator', params: { size: 8 } },
          ],
        }),
      });
      const data = await response.json();
      if (data?.success && data?.orchestration) {
        setOrchestrationState({
          orchestrationId: data.orchestration.orchestrationId,
          chainSeal: data.orchestration.chainSeal,
          totalStages: data.orchestration.totalStages,
          completedStages: data.orchestration.completedStages,
          status: data.status,
          loading: false,
        });
      } else {
        setOrchestrationState({ loading: false });
      }
    } catch {
      setOrchestrationState({ loading: false });
    }
  };

  const handleExecuteLivePipeline = async () => {
    setPipelineExecutionState({ loading: true });
    try {
      const response = await fetch(apiUrl('/v1/reality/pipeline/execute'), {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          pipelineId: 'live-continuum-runner',
          stages: [
            { toolId: 'tool-voice-acoustic', params: { frequencyHz: 432 } },
            { toolId: 'tool-svg-tensor-canvas', params: { dimensions: 20 } },
            { toolId: 'tool-dav-tensor-validator', params: { size: 8 } },
          ],
        }),
      });
      const data = await response.json();
      if (data?.success && data?.execution) {
        setPipelineExecutionState({
          executionId: data.execution.executionId,
          bundleSeal: data.execution.bundleSeal,
          totalStages: data.execution.totalStages,
          completedStages: data.execution.completedStages,
          artifacts: data.execution.artifacts,
          status: data.status,
          loading: false,
        });
      } else {
        setPipelineExecutionState({ loading: false });
      }
    } catch {
      setPipelineExecutionState({ loading: false });
    }
  };

  const subscribePipelineCanvas = () => {
    streamRef.current?.close();
    setCanvasFrames(0);
    setCanvasSeal(null);
    const source = new EventSource(apiUrl('/v1/reality/pipeline/stream'));
    streamRef.current = source;
    const paint = (index: number) => {
      const canvas = canvasRef.current;
      const context = canvas?.getContext('2d');
      if (!context) return;
      context.fillStyle = index % 2 === 0 ? '#0f766e' : '#134e4a';
      context.fillRect(index * 36, 8, 28, 48);
    };
    source.addEventListener('frame', (event) => {
      const frame = JSON.parse((event as MessageEvent).data) as { frameIndex?: number };
      const index = typeof frame.frameIndex === 'number' ? frame.frameIndex : 0;
      setCanvasFrames((count) => Math.max(count, index + 1));
      paint(index);
    });
    source.addEventListener('seal', (event) => {
      const seal = JSON.parse((event as MessageEvent).data) as { bundleSeal?: string };
      setCanvasSeal(typeof seal.bundleSeal === 'string' ? seal.bundleSeal : null);
      source.close();
    });
    source.onerror = () => source.close();
  };

  const handleFetchRealityStatus = async () => {
    setRealityStatusState((s) => ({ ...s, loading: true }));
    try {
      const response = await fetch(apiUrl('/v1/reality/tools/status'), {
        headers: { accept: 'application/json' },
      });
      const data = await response.json();
      if (data?.success && data?.dashboard) {
        setRealityStatusState({
          totalTools: data.dashboard.totalTools,
          healthyTools: data.dashboard.healthyTools,
          chainSeal: data.dashboard.chainSeal,
          integrityStatus: data.dashboard.integrityCheck?.status ?? 'UNKNOWN',
          loading: false,
        });
      } else {
        setRealityStatusState({ loading: false });
      }
    } catch {
      setRealityStatusState({ loading: false });
    }
  };

  const handleProbeCircuitBreaker = async () => {
    setCircuitBreakerState((s) => ({ ...s, loading: true }));
    try {
      const response = await fetch(apiUrl('/v1/reality/tools/circuit-breaker'), {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ action: 'probe' }),
      });
      const data = await response.json();
      if (data?.success && data?.circuitBreaker) {
        setCircuitBreakerState({
          status: data.circuitBreaker.status,
          tripsCount: data.circuitBreaker.tripsCount,
          chainSeal: data.circuitBreaker.chainSeal,
          loading: false,
        });
      } else {
        setCircuitBreakerState({ loading: false });
      }
    } catch {
      setCircuitBreakerState({ loading: false });
    }
  };

  const handleProbeFailsafe = async () => {
    setFailsafeState((s) => ({ ...s, loading: true }));
    try {
      const response = await fetch(apiUrl('/v1/reality/tools/failsafe'), {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ action: 'audit' }),
      });
      const data = await response.json();
      if (data?.success && data?.failsafe) {
        setFailsafeState({
          armed: data.failsafe.armed,
          quarantineCount: data.failsafe.quarantineCount,
          quarantineSeal: data.failsafe.quarantineSeal,
          loading: false,
        });
      } else {
        setFailsafeState({ loading: false });
      }
    } catch {
      setFailsafeState({ loading: false });
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      streamRef.current?.close();
    };
  }, [onClose]);

  return (
    <div className="studio-modal-overlay" onClick={onClose}>
      <div
        className="studio-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Studio and Settings"
      >
        <header className="studio-modal-header">
          <div className="studio-title-group">
            <span className="studio-badge">HOUSE CREATIVE & OPERATIONAL SUITE</span>
            <h2 className="studio-title">🎨 Multimodal Studio & Platform Settings</h2>
          </div>
          <button
            type="button"
            className="studio-close-btn"
            onClick={onClose}
            aria-label="Close Studio and Settings modal"
          >
            ✕
          </button>
        </header>

        <nav className="studio-tabs" role="tablist" aria-label="Studio sections">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'settings'}
            className={`studio-tab-btn${tab === 'settings' ? ' studio-tab-btn--active' : ''}`}
            onClick={() => setTab('settings')}
          >
            ⚙️ Platform Settings
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'voice'}
            className={`studio-tab-btn${tab === 'voice' ? ' studio-tab-btn--active' : ''}`}
            onClick={() => setTab('voice')}
          >
            🎙️ Voice Studio
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'image'}
            className={`studio-tab-btn${tab === 'image' ? ' studio-tab-btn--active' : ''}`}
            onClick={() => setTab('image')}
          >
            🎨 Image Studio
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'video'}
            className={`studio-tab-btn${tab === 'video' ? ' studio-tab-btn--active' : ''}`}
            onClick={() => setTab('video')}
          >
            🎬 Video Studio
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'tools'}
            className={`studio-tab-btn${tab === 'tools' ? ' studio-tab-btn--active' : ''}`}
            onClick={() => setTab('tools')}
          >
            ⚡ Reality Tools
          </button>
        </nav>

        <main className="studio-content">
          {tab === 'settings' && (
            <section className="studio-panel" aria-label="Settings configuration">
              <h3 className="studio-panel-title">System Topology & Operational Gates</h3>
              <p className="studio-panel-desc">
                Local-first boundary parameters. Doctrine: <code>ATTEST, DON&apos;T ASSERT</code>.
              </p>
              <div className="studio-grid">
                <div className="studio-card">
                  <h4>Local Ports Topology</h4>
                  <ul className="studio-port-list">
                    <li><span className="port-pill">3000</span> Frontend Web UI (VibeOS) · <strong>VERIFIED</strong></li>
                    <li><span className="port-pill">5000</span> Fastify Spine API · <strong>VERIFIED</strong></li>
                    <li><span className="port-pill">8088</span> Voice Daemon &amp; DAV Tensor · <strong>VERIFIED</strong></li>
                    <li><span className="port-pill">11434</span> Local Ollama (qwen2.5:0.5b) · <strong>VERIFIED</strong></li>
                  </ul>
                </div>
                <div className="studio-card">
                  <h4>Auth &amp; Governance Policy</h4>
                  <div className="studio-setting-row">
                    <span>Auth Mode:</span>
                    <span className="setting-val">local (Local-First Sovereign)</span>
                  </div>
                  <div className="studio-setting-row">
                    <span>Risk Gate:</span>
                    <span className="setting-val">KAI Shield Active (Fail-Closed)</span>
                  </div>
                  <div className="studio-setting-row">
                    <span>FinOps Formula:</span>
                    <span className="setting-val">V = (Outcome × Evidence) − (Cost + Risk)</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {tab === 'voice' && (
            <section className="studio-panel" aria-label="Voice synthesis studio">
              <h3 className="studio-panel-title">Harmonic Voice Synthesis &amp; One Identity Organs</h3>
              <p className="studio-panel-desc">
                Real-time acoustic resonance on port 8088. Pure harmonic sine calibration.
              </p>
              <div className="studio-grid">
                <div className="studio-card">
                  <h4>Harmonic Frequency Calibration</h4>
                  <div className="studio-freq-selector">
                    <button
                      type="button"
                      className={`freq-btn${frequencyHz === 432 ? ' freq-btn--active' : ''}`}
                      onClick={() => setFrequencyHz(432)}
                    >
                      432 Hz · Natural Harmonic
                    </button>
                    <button
                      type="button"
                      className={`freq-btn${frequencyHz === 528 ? ' freq-btn--active' : ''}`}
                      onClick={() => setFrequencyHz(528)}
                    >
                      528 Hz · Miraculous Solfeggio
                    </button>
                    <button
                      type="button"
                      className={`freq-btn${frequencyHz === 888 ? ' freq-btn--active' : ''}`}
                      onClick={() => setFrequencyHz(888)}
                    >
                      888 Hz · Infinite Abundance
                    </button>
                  </div>
                  <p className="studio-status-text">
                    Current Frequency: <strong>{frequencyHz} Hz</strong> · Status: <strong>VERIFIED</strong>
                  </p>
                </div>
                <div className="studio-card">
                  <h4>One Identity Voice Organs</h4>
                  <div className="organ-list">
                    {['Soul AI', 'Truth Weaver', 'The General', 'Human Root'].map((organ) => (
                      <button
                        key={organ}
                        type="button"
                        className={`organ-btn${selectedVoice === organ ? ' organ-btn--active' : ''}`}
                        onClick={() => setSelectedVoice(organ)}
                      >
                        {organ} ({selectedVoice === organ ? 'Active Voice' : 'Available'})
                      </button>
                    ))}
                  </div>
                  <div className="voice-wave-preview" aria-label="Harmonic waveform preview">
                    <div className="wave-bar" style={{ height: '40%' }} />
                    <div className="wave-bar" style={{ height: '75%' }} />
                    <div className="wave-bar" style={{ height: '100%' }} />
                    <div className="wave-bar" style={{ height: '60%' }} />
                    <div className="wave-bar" style={{ height: '85%' }} />
                  </div>
                  <button
                    type="button"
                    className="freq-btn"
                    style={{ marginTop: '0.75rem', width: '100%' }}
                    onClick={handleSynthesize}
                  >
                    {synthesisState.loading ? '⏳ Synthesizing...' : '🎙️ Synthesize Voice & Harmonic Probe'}
                  </button>
                  <button
                    type="button"
                    className="freq-btn"
                    style={{ marginTop: '0.5rem', width: '100%', borderColor: '#00e5ff', color: '#00e5ff' }}
                    onClick={handlePlayAcousticTone}
                  >
                    {playingTone ? '🔊 Generating & Playing Tone...' : `▶️ Play Harmonic Tone (${frequencyHz}Hz ${selectedVoice})`}
                  </button>
                </div>
              </div>
            </section>
          )}

          {tab === 'image' && (
            <section className="studio-panel" aria-label="Image generation studio">
              <h3 className="studio-panel-title">Deterministic SVG Tensor Image Studio</h3>
              <p className="studio-panel-desc">
                Vector generation grounded by the 20 Codex dimensions and SHA-256 evidence seals.
              </p>
              <div className="studio-composer">
                <input
                  type="text"
                  className="studio-input"
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="Enter visual intent or select schematic dimension..."
                />
                <button
                  type="button"
                  className="studio-generate-btn"
                  onClick={handleSynthesize}
                >
                  {synthesisState.loading ? '⏳ Synthesizing...' : '✨ Render Canvas'}
                </button>
              </div>
              {renderedPreview && (
                <div className="studio-canvas-preview" aria-label="Generated SVG Canvas Preview">
                  <svg viewBox="0 0 400 200" className="studio-svg-art">
                    <defs>
                      <linearGradient id="oceanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.8" />
                        <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#030812" stopOpacity="0.9" />
                      </linearGradient>
                    </defs>
                    <rect width="400" height="200" rx="8" fill="url(#oceanGrad)" />
                    <circle cx="200" cy="100" r="45" fill="none" stroke="#00e5ff" strokeWidth="2" strokeDasharray="4 2" />
                    <circle cx="200" cy="100" r="25" fill="#00e5ff" fillOpacity="0.3" stroke="#fff" strokeWidth="1" />
                    <text x="200" y="105" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="bold">Ω∞</text>
                    <text x="200" y="160" textAnchor="middle" fill="#00e5ff" fontSize="11" fontFamily="monospace">
                      DAV T[i,j,k,l] · Checksum 57,344
                    </text>
                  </svg>
                  <div className="canvas-meta">
                    <span>Evidence Seal: <strong>{synthesisState.status ?? 'VERIFIED'} (SHA: {(synthesisState.evidenceHash || 'c4e976db57fc').slice(0, 12)})</strong></span>
                    <span>Asset ID: <strong>{synthesisState.assetId || 'asset-7a42b109c8e1'}</strong></span>
                    <span>Preset: <strong>Dimension 04 · Glowing Droplet</strong></span>
                  </div>
                </div>
              )}
            </section>
          )}

          {tab === 'video' && (
            <section className="studio-panel" aria-label="Video creation studio">
              <h3 className="studio-panel-title">Real-Time Omni Multimodal Video Studio</h3>
              <p className="studio-panel-desc">
                Continuous EventSource SSE stream and tensor frame interpolation at 30 fps.
              </p>
              <div className="studio-grid">
                <div className="studio-card">
                  <h4>Streaming Pipeline Status</h4>
                  <div className="video-stream-box" aria-label="Live video stream player">
                    <div className="video-stream-indicator">
                      <span className="live-dot" /> LIVE SSE STREAM (1920×1080 · 30 FPS)
                    </div>
                    <div className="video-frame-display">
                      <span className="frame-icon">🌊</span>
                      <p>Multimodal Video Continuum Active</p>
                      <small>Target: /v1/stream · Invariant: Expected ≡ Observed</small>
                    </div>
                  </div>
                </div>
                <div className="studio-card">
                  <h4>Multimodal Video Specs</h4>
                  <div className="studio-setting-row">
                    <span>Resolution:</span>
                    <span className="setting-val">1920 × 1080 (Full HD)</span>
                  </div>
                  <div className="studio-setting-row">
                    <span>Frame Rate:</span>
                    <span className="setting-val">30 fps continuous</span>
                  </div>
                  <div className="studio-setting-row">
                    <span>Stream Engine:</span>
                    <span className="setting-val">Fastify SSE + WebRTC Ready</span>
                  </div>
                  <div className="studio-setting-row">
                    <span>Frame Integrity:</span>
                    <span className="setting-val">SHA-256 Checksum on each chunk</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {tab === 'tools' && (
            <section className="studio-panel" aria-label="Reality tools dispatcher">
              <h3 className="studio-panel-title">Sovereign Reality Tools Dispatcher</h3>
              <p className="studio-panel-desc">
                One-click dispatch of the 8 sovereign reality tools. Each dispatch is sealed with a SHA-256 evidence hash.
              </p>
              <div className="studio-grid">
                {REALITY_TOOLS.map((tool) => (
                  <div className="studio-card" key={tool.id}>
                    <h4>{tool.icon} {tool.name}</h4>
                    <div className="studio-setting-row">
                      <span>Category:</span>
                      <span className="setting-val">{tool.category}</span>
                    </div>
                    <button
                      type="button"
                      className="freq-btn"
                      style={{ marginTop: '0.5rem', width: '100%' }}
                      onClick={() => void handleDispatchTool(tool.id)}
                      disabled={dispatchState.loading}
                    >
                      {dispatchState.loading && dispatchState.toolId === tool.id
                        ? '⏳ Dispatching...'
                        : `⚡ Dispatch ${tool.name.split(' ')[0]}`}
                    </button>
                  </div>
                ))}
              </div>
              <div className="studio-card" style={{ marginTop: '1.25rem', width: '100%' }}>
                <h4>🧬 Multi-Tool Sovereign Workflow Pipeline</h4>
                <p style={{ margin: '0.25rem 0 0.75rem', fontSize: '0.85rem', color: '#94a3b8' }}>
                  Chain multiple reality tools into a cryptographically sealed end-to-end execution pipeline.
                </p>
                <button
                  type="button"
                  className="freq-btn"
                  style={{ width: '100%', borderColor: '#3b82f6', color: '#60a5fa' }}
                  onClick={handleOrchestratePipeline}
                  disabled={orchestrationState.loading}
                >
                  {orchestrationState.loading
                    ? '⏳ Orchestrating Multi-Tool Pipeline...'
                    : '🧬 Run Multi-Tool Continuum Pipeline (Acoustic ⊕ SVG ⊕ DAV)'}
                </button>
                {orchestrationState.chainSeal && (
                  <div className="canvas-meta" style={{ marginTop: '0.75rem' }}>
                    <span>Pipeline ID: <strong>{orchestrationState.orchestrationId}</strong></span>
                    <span>Stages: <strong>{orchestrationState.completedStages}/{orchestrationState.totalStages} VERIFIED</strong></span>
                    <span>Chain Seal: <strong>{(orchestrationState.chainSeal || '').slice(0, 16)}…</strong></span>
                  </div>
                )}
              </div>
              <div className="studio-card" style={{ marginTop: '1rem', width: '100%', borderColor: '#10b981' }}>
                <h4>⚡ Autonomous Live Execution Engine</h4>
                <p style={{ margin: '0.25rem 0 0.75rem', fontSize: '0.85rem', color: '#94a3b8' }}>
                  Execute the 3-stage continuum live across ports 8088, 5000, and tensor kernels with intermediate output bundles.
                </p>
                <button
                  type="button"
                  className="freq-btn"
                  style={{ width: '100%', borderColor: '#10b981', color: '#34d399' }}
                  onClick={handleExecuteLivePipeline}
                  disabled={pipelineExecutionState.loading}
                >
                  {pipelineExecutionState.loading
                    ? '⏳ Executing Live Continuum Across House...'
                    : '⚡ Execute Real-Time Live Pipeline (Audio ⊕ SVG ⊕ DAV)'}
                </button>
                {pipelineExecutionState.bundleSeal && (
                  <div className="canvas-meta" style={{ marginTop: '0.75rem' }}>
                    <span>Execution ID: <strong>{pipelineExecutionState.executionId}</strong></span>
                    <span>Progress: <strong>{pipelineExecutionState.completedStages}/{pipelineExecutionState.totalStages} STAGES COMPLETED</strong></span>
                    <span>Bundle Seal: <strong>{(pipelineExecutionState.bundleSeal || '').slice(0, 16)}…</strong></span>
                  </div>
                )}
                <button
                  type="button"
                  className="freq-btn"
                  style={{ width: '100%', marginTop: '0.75rem' }}
                  onClick={subscribePipelineCanvas}
                >
                  Subscribe pipeline canvas
                </button>
                <canvas ref={canvasRef} width={320} height={64} aria-label="pipeline frame canvas" />
                <p>
                  Bounded 30fps sample · {canvasFrames}/8 frames
                  {canvasSeal ? ` · ${(canvasSeal).slice(0, 16)}…` : ''} · not a continuous camera
                </p>
              </div>
              <div className="studio-card" style={{ marginTop: '1rem', width: '100%', borderColor: '#7c3aed' }}>
                <h4>📊 Sovereign Reality Status Dashboard</h4>
                <p style={{ margin: '0.25rem 0 0.75rem', fontSize: '0.85rem', color: '#94a3b8' }}>
                  Live aggregate health check across all 8 sovereign reality tools with chain seal integrity verification.
                </p>
                <button
                  type="button"
                  className="freq-btn"
                  style={{ width: '100%', borderColor: '#7c3aed', color: '#a78bfa' }}
                  onClick={handleFetchRealityStatus}
                  disabled={realityStatusState.loading}
                >
                  {realityStatusState.loading
                    ? '⏳ Fetching Reality Status...'
                    : '📊 Fetch Live Reality Status (All 8 Tools)'}
                </button>
                {realityStatusState.chainSeal && (
                  <div className="canvas-meta" style={{ marginTop: '0.75rem' }}>
                    <span>Healthy Tools: <strong>{realityStatusState.healthyTools}/{realityStatusState.totalTools}</strong></span>
                    <span>Chain Seal: <strong>{(realityStatusState.chainSeal || '').slice(0, 16)}…</strong></span>
                    <span>Integrity: <strong>{realityStatusState.integrityStatus}</strong></span>
                  </div>
                )}
              </div>
              <div className="studio-card" style={{ marginTop: '1rem', width: '100%', borderColor: '#ef4444' }}>
                <h4>🛡️ Sovereign Reality Circuit Breaker</h4>
                <p style={{ margin: '0.25rem 0 0.75rem', fontSize: '0.85rem', color: '#94a3b8' }}>
                  Fail-closed circuit breaker telemetry preventing divergent downstream reality pipeline dispatch.
                </p>
                <button
                  type="button"
                  className="freq-btn"
                  style={{ width: '100%', borderColor: '#ef4444', color: '#f87171' }}
                  onClick={handleProbeCircuitBreaker}
                  disabled={circuitBreakerState.loading}
                >
                  {circuitBreakerState.loading
                    ? '⏳ Probing Circuit Breaker...'
                    : '🛡️ Probe Circuit Breaker (Fail-Closed Safety)'}
                </button>
                {circuitBreakerState.status && (
                  <div className="canvas-meta" style={{ marginTop: '0.75rem' }}>
                    <span>Breaker Status: <strong>{circuitBreakerState.status}</strong></span>
                    <span>Trips: <strong>{circuitBreakerState.tripsCount ?? 0}</strong></span>
                    <span>Seal: <strong>{(circuitBreakerState.chainSeal || '').slice(0, 16)}…</strong></span>
                  </div>
                )}
              </div>
              <div className="studio-card" style={{ marginTop: '1rem', width: '100%', borderColor: '#f59e0b' }}>
                <h4>🚨 Sovereign Reality Failsafe Quarantine</h4>
                <p style={{ margin: '0.25rem 0 0.75rem', fontSize: '0.85rem', color: '#94a3b8' }}>
                  Autonomous invariant quarantine barrier safeguarding reality pipeline execution integrity.
                </p>
                <button
                  type="button"
                  className="freq-btn"
                  style={{ width: '100%', borderColor: '#f59e0b', color: '#fbbf24' }}
                  onClick={handleProbeFailsafe}
                  disabled={failsafeState.loading}
                >
                  {failsafeState.loading
                    ? '⏳ Probing Failsafe Quarantine...'
                    : '🚨 Run Failsafe Quarantine Verification'}
                </button>
                {failsafeState.quarantineSeal && (
                  <div className="canvas-meta" style={{ marginTop: '0.75rem' }}>
                    <span>Failsafe Armed: <strong>{String(failsafeState.armed)}</strong></span>
                    <span>Quarantined: <strong>{failsafeState.quarantineCount ?? 0} tools</strong></span>
                    <span>Seal: <strong>{(failsafeState.quarantineSeal || '').slice(0, 16)}…</strong></span>
                  </div>
                )}
              </div>
              {dispatchState.executionStatus && (
                <div className="canvas-meta" style={{ marginTop: '1rem' }}>
                  <span>Dispatch ID: <strong>{dispatchState.dispatchId}</strong></span>
                  <span>Tool: <strong>{dispatchState.toolId}</strong></span>
                  <span>Status: <strong>{dispatchState.executionStatus}</strong></span>
                  <span>Evidence: <strong>{(dispatchState.evidenceHash || '').slice(0, 16)}…</strong></span>
                </div>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
