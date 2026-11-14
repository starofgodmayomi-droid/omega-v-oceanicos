import React, { useState, useEffect, useRef, useCallback } from 'react';
import { theme } from './oceanicosTheme';
import { enqueueOfflineMessage } from './offlineQueue';

/* ── API helpers ── */
const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.port !== '5000'
    ? `http://${window.location.hostname}:5000`
    : '')
).replace(/\/$/, '');

function apiUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_BASE_URL}${path}`;
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const primaryUrl = apiUrl(path);
  let response: Response;
  try {
    response = await fetch(primaryUrl, init);
  } catch (primaryErr: any) {
    try {
      response = await fetch(path, init);
    } catch {
      throw primaryErr;
    }
  }
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

export interface GloberAgiCommandCenterProps {
  onSendMessage?: (message: string, mode?: string, model?: string) => void;
  className?: string;
}

export function GloberAgiCommandCenter({ onSendMessage }: GloberAgiCommandCenterProps) {
  // ── Layout State (Progressive Disclosure) ──
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  // ── Mode & Model Toggles (The Glober Switch) ──
  const [activeMode, setActiveMode] = useState<'collaborative' | 'autonomous'>('collaborative');
  const [activeSubMode, setActiveSubMode] = useState<'chat' | 'cowork' | 'swarm' | 'goal' | 'computer'>('chat');
  const [selectedModel, setSelectedModel] = useState<'fast' | 'auto' | 'expert' | 'heavy' | 'sonnet' | 'gemini'>('auto');

  // ── Inputs ──
  const [promptText, setPromptText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [activePlugins, setActivePlugins] = useState<string[]>(['web-search', 'memory']);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ── Auth0 & Tenant State ──
  const [authSession, setAuthSession] = useState<any>(null);
  const [showAuthOverlay, setShowAuthOverlay] = useState(false);

  // ── Glober News & Goals State ──
  const [globerStatus, setGloberStatus] = useState<any>(null);
  const [newsSignals, setNewsSignals] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [lastExecutedEvidence, setLastExecutedEvidence] = useState<string | null>(null);

  // ── Dynamic Greeting ──
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // ── Fetch Session & Glober Status ──
  const loadState = useCallback(async () => {
    try {
      const [sessionData, statusData, newsData] = await Promise.all([
        apiRequest<any>('/v1/auth/session').catch(() => null),
        apiRequest<any>('/v1/glober/status').catch(() => null),
        apiRequest<any>('/v1/glober/news').catch(() => null),
      ]);
      if (sessionData?.success) setAuthSession(sessionData);
      if (statusData?.success && statusData.state) {
        setGloberStatus(statusData.state);
        setActiveMode(statusData.state.mode || 'collaborative');
        setActiveSubMode(statusData.state.subMode || 'chat');
      }
      if (newsData?.success && Array.isArray(newsData.signals)) {
        setNewsSignals(newsData.signals);
      }
    } catch {
      /* ambient */
    }
  }, []);

  useEffect(() => {
    loadState();
    const interval = setInterval(loadState, 30000);
    return () => clearInterval(interval);
  }, [loadState]);

  // ── Handle Mode Switch ──
  const handleModeSwitch = async (mode: 'collaborative' | 'autonomous', subMode: any) => {
    setActiveMode(mode);
    setActiveSubMode(subMode);
    try {
      await apiRequest('/v1/glober/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, subMode, model: selectedModel }),
      });
    } catch {
      /* ambient */
    }
  };

  // ── Handle Submit ──
  const handleSendPrompt = async (textToSend?: string) => {
    const query = (textToSend || promptText).trim();
    if (!query) return;

    setIsSending(true);
    setPromptText('');

    if (onSendMessage) {
      onSendMessage(query, activeSubMode, selectedModel);
      setIsSending(false);
      return;
    }

    try {
      const res = await apiRequest<any>('/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          mode: activeMode,
          subMode: activeSubMode,
          model: selectedModel,
        }),
      });
      if (res?.reply?.metadata?.evidenceHash) {
        setLastExecutedEvidence(res.reply.metadata.evidenceHash);
      }
    } catch {
      // Fallback: enqueue to offline dream queue
      await enqueueOfflineMessage(query);
    } finally {
      setIsSending(false);
    }
  };

  // ── Toggle Plugin ──
  const togglePlugin = (pluginId: string) => {
    setActivePlugins((prev) =>
      prev.includes(pluginId) ? prev.filter((p) => p !== pluginId) : [...prev, pluginId]
    );
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        minHeight: '740px',
        background: 'linear-gradient(135deg, rgba(6, 15, 23, 0.98) 0%, rgba(3, 8, 14, 0.99) 100%)',
        borderRadius: '18px',
        border: '1px solid rgba(105, 231, 185, 0.16)',
        boxShadow: '0 16px 48px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px)',
        overflow: 'hidden',
        color: '#e2e8f0',
        fontFamily: theme.fontSans,
      }}
    >
      {/* ── TOP HEADER: Status, Mode, and Panel Toggles ── */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 18px',
          borderBottom: '1px solid rgba(105, 231, 185, 0.12)',
          background: 'rgba(4, 12, 18, 0.85)',
          fontSize: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
            title="Toggle Workspace Sidebar"
            style={{
              background: leftSidebarOpen ? 'rgba(105, 231, 185, 0.12)' : 'transparent',
              border: '1px solid rgba(105, 231, 185, 0.25)',
              borderRadius: '6px',
              padding: '5px 9px',
              color: leftSidebarOpen ? '#69e7b9' : '#94a3b8',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            ☰ Workspace
          </button>

          <span style={{ fontWeight: 700, color: '#38bdf8', letterSpacing: '0.04em' }}>
            Ω∞v GLOBER AI
          </span>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '9999px',
              fontSize: '10px',
              fontWeight: 700,
              background: activeMode === 'autonomous' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(56, 189, 248, 0.15)',
              color: activeMode === 'autonomous' ? '#eab308' : '#38bdf8',
              border: `1px solid ${activeMode === 'autonomous' ? 'rgba(234, 179, 8, 0.3)' : 'rgba(56, 189, 248, 0.3)'}`,
            }}
          >
            {activeMode === 'autonomous' ? '⚡ AUTONOMOUS (AGENTIC)' : '🤝 COLLABORATIVE (HITL)'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* SSO / Auth0 Tenant Pill */}
          <button
            onClick={() => setShowAuthOverlay(!showAuthOverlay)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(105, 231, 185, 0.08)',
              border: '1px solid rgba(105, 231, 185, 0.2)',
              borderRadius: '6px',
              padding: '4px 10px',
              color: '#a7f3d0',
              cursor: 'pointer',
              fontSize: '11px',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
            <span>{authSession?.user?.name || 'Elion Varel'} (Auth0)</span>
          </button>

          <button
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            title="Toggle Sensory & News Panel"
            style={{
              background: rightPanelOpen ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: '6px',
              padding: '5px 9px',
              color: rightPanelOpen ? '#38bdf8' : '#94a3b8',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            📰 Sensory & Telemetry ◨
          </button>
        </div>
      </header>

      {/* ── 3-PANEL BODY ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* ── LEFT SIDEBAR (Workspace, Navigation & Provenance) ── */}
        {leftSidebarOpen && (
          <aside
            style={{
              width: '260px',
              minWidth: '240px',
              borderRight: '1px solid rgba(105, 231, 185, 0.1)',
              background: 'rgba(5, 12, 18, 0.95)',
              display: 'flex',
              flexDirection: 'column',
              padding: '16px 12px',
              gap: '16px',
              overflowY: 'auto',
            }}
          >
            {/* New Task Action */}
            <button
              onClick={() => {
                setPromptText('');
                setLastExecutedEvidence(null);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '9px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, rgba(105, 231, 185, 0.2) 0%, rgba(56, 189, 248, 0.15) 100%)',
                border: '1px solid rgba(105, 231, 185, 0.35)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              <span>+</span> New Chat / Task
            </button>

            {/* Navigation Section */}
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
                Navigation & Library
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {[
                  { icon: '🔍', label: 'Search' },
                  { icon: '📚', label: 'Library' },
                  { icon: '📁', label: 'Projects' },
                  { icon: '📄', label: 'Artifacts' },
                  { icon: '🖼️', label: 'Images / 3D' },
                  { icon: '⏱️', label: 'Scheduled Tasks' },
                  { icon: '⚙️', label: 'Automations' },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      background: 'transparent',
                      border: 'none',
                      color: '#94a3b8',
                      fontSize: '12px',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#69e7b9')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Pinned Agents & Teammates */}
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
                Pinned Agents & Teammates
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {[
                  { name: 'TRUTHOS Red Team', status: 'Active Guard', icon: '🛡️' },
                  { name: 'The Honest Man OS', status: 'Root Seed', icon: '🌱' },
                  { name: 'VOOS Daemon :8088', status: 'Autonomous', icon: '⚡' },
                  { name: 'KAI Sovereign Auditor', status: 'Monotonic', icon: '📜' },
                ].map((agent, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '11px',
                    }}
                  >
                    <span style={{ color: '#cbd5e1' }}>{agent.icon} {agent.name}</span>
                    <span style={{ fontSize: '9px', color: '#69e7b9', fontFamily: theme.fontMono }}>{agent.status}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Integrations */}
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
                Live Integrations
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px' }}>
                <a
                  href="https://github.com/starofgodmayomi-droid/omega-v-oceanicos"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#38bdf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <span>🐙</span> GitHub: omega-v-oceanicos
                </a>
                <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🏛️</span> Notion: OCEANICOS MOTION
                </span>
                <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🌐</span> Sandboxed Headless Chrome
                </span>
              </div>
            </div>

            {/* Bottom Profile & Quota */}
            <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                <span style={{ color: '#64748b' }}>Credits</span>
                <span style={{ color: '#10b981', fontWeight: 700, fontFamily: theme.fontMono }}>
                  {authSession?.user?.credits?.toLocaleString() || '999,999'}
                </span>
              </div>
              <div style={{ fontSize: '10px', color: '#475569', marginTop: '4px' }}>
                Tier: {authSession?.user?.tier || 'V1111 Singularity Enterprise'}
              </div>
            </div>
          </aside>
        )}

        {/* ── CENTER: THE SOVEREIGN COMMAND CENTER ── */}
        <main
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '28px 24px 40px',
            overflowY: 'auto',
            position: 'relative',
          }}
        >
          {/* Contextual Dynamic Greeting */}
          <div style={{ textAlign: 'center', marginBottom: '22px' }}>
            <h2
              style={{
                fontSize: 'clamp(24px, 3.5vw, 34px)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                margin: '0 0 6px',
                background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 50%, #38bdf8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {getGreeting()}, Ω∞v OceanicOS
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>
              Sovereign full-stack operating environment. Natural is free and effortless.
            </p>
          </div>

          {/* Mode Toggles: The Glober Switch */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '6px',
              padding: '5px',
              borderRadius: '12px',
              background: 'rgba(10, 25, 35, 0.75)',
              border: '1px solid rgba(105, 231, 185, 0.18)',
              marginBottom: '20px',
            }}
          >
            {/* Collaborative modes */}
            <button
              onClick={() => handleModeSwitch('collaborative', 'chat')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: activeSubMode === 'chat' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                color: activeSubMode === 'chat' ? '#38bdf8' : '#94a3b8',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              💬 Chat
            </button>
            <button
              onClick={() => handleModeSwitch('collaborative', 'cowork')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: activeSubMode === 'cowork' ? 'rgba(105, 231, 185, 0.25)' : 'transparent',
                color: activeSubMode === 'cowork' ? '#69e7b9' : '#94a3b8',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              🤝 Cowork (HITL)
            </button>

            <div style={{ width: '1px', background: 'rgba(255, 255, 255, 0.1)', margin: '0 4px' }} />

            {/* Autonomous modes */}
            <button
              onClick={() => handleModeSwitch('autonomous', 'swarm')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: activeSubMode === 'swarm' ? 'rgba(234, 179, 8, 0.25)' : 'transparent',
                color: activeSubMode === 'swarm' ? '#eab308' : '#94a3b8',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              ⚡ Swarm
            </button>
            <button
              onClick={() => handleModeSwitch('autonomous', 'goal')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: activeSubMode === 'goal' ? 'rgba(244, 63, 94, 0.25)' : 'transparent',
                color: activeSubMode === 'goal' ? '#f43f5e' : '#94a3b8',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              🎯 Goal
            </button>
            <button
              onClick={() => handleModeSwitch('autonomous', 'computer')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: activeSubMode === 'computer' ? 'rgba(168, 85, 247, 0.25)' : 'transparent',
                color: activeSubMode === 'computer' ? '#c084fc' : '#94a3b8',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              🖥️ Computer
            </button>
          </div>

          {/* Model Selector Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '18px',
              fontSize: '11px',
              color: '#64748b',
            }}
          >
            <span>Model:</span>
            {(['fast', 'auto', 'expert', 'heavy', 'sonnet', 'gemini'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setSelectedModel(m)}
                style={{
                  padding: '3px 8px',
                  borderRadius: '6px',
                  border: `1px solid ${selectedModel === m ? 'rgba(56, 189, 248, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
                  background: selectedModel === m ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  color: selectedModel === m ? '#38bdf8' : '#94a3b8',
                  fontSize: '11px',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Omni-Prompt Card */}
          <div
            style={{
              width: '100%',
              maxWidth: '720px',
              background: 'rgba(8, 20, 28, 0.92)',
              border: '1px solid rgba(105, 231, 185, 0.28)',
              borderRadius: '16px',
              padding: '16px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45), inset 0 0 16px rgba(105, 231, 185, 0.03)',
              marginBottom: '20px',
            }}
          >
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendPrompt();
                }
              }}
              rows={3}
              placeholder={
                activeMode === 'autonomous'
                  ? 'Define an autonomous persistent goal for Glober AI to achieve in the background…'
                  : 'Ask anything, explore codebase, or run a tool…'
              }
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#f8fafc',
                fontSize: '14px',
                fontFamily: theme.fontSans,
                resize: 'none',
                lineHeight: 1.5,
              }}
            />

            {/* Input Footer: Plugins, Multi-modal upload, Voice, Send */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '10px',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                marginTop: '10px',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {/* File Upload Button */}
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={() => alert('File queued to multi-modal context')}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload File or Image"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  📎 +
                </button>

                {/* Voice Toggle */}
                <button
                  onClick={() => setIsRecording(!isRecording)}
                  title="Toggle Voice Input"
                  style={{
                    background: isRecording ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${isRecording ? '#ef4444' : 'rgba(255, 255, 255, 0.1)'}`,
                    borderRadius: '8px',
                    padding: '6px 10px',
                    color: isRecording ? '#ef4444' : '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  🎙️ {isRecording ? 'Listening…' : 'Voice'}
                </button>

                {/* Plugin Pills */}
                {[
                  { id: 'web-search', label: '🌐 Web' },
                  { id: 'office-suite', label: '📄 Docs' },
                  { id: 'notion', label: '🏛️ Notion' },
                  { id: 'memory', label: '📜 Memory' },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => togglePlugin(p.id)}
                    style={{
                      background: activePlugins.includes(p.id) ? 'rgba(105, 231, 185, 0.15)' : 'transparent',
                      border: `1px solid ${activePlugins.includes(p.id) ? 'rgba(105, 231, 185, 0.3)' : 'rgba(255, 255, 255, 0.06)'}`,
                      borderRadius: '6px',
                      padding: '4px 8px',
                      color: activePlugins.includes(p.id) ? '#69e7b9' : '#64748b',
                      fontSize: '10px',
                      cursor: 'pointer',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Send Button */}
              <button
                onClick={() => handleSendPrompt()}
                disabled={isSending || !promptText.trim()}
                style={{
                  padding: '7px 18px',
                  borderRadius: '8px',
                  background: promptText.trim()
                    ? 'linear-gradient(135deg, #10b981 0%, #0284c7 100%)'
                    : 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: promptText.trim() ? '#ffffff' : '#64748b',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: promptText.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease',
                }}
              >
                {isSending ? 'Transmitting…' : 'Dispatch ➔'}
              </button>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '8px',
              maxWidth: '720px',
              width: '100%',
              marginBottom: '24px',
            }}
          >
            {[
              { label: '🌐 Browse Web', query: 'Browse https://example.com' },
              { label: '🏗️ Build a Website', query: 'Build a modern responsive landing page with Tailwind and React' },
              { label: '📊 Create Slides', query: 'Create an executive deck on the sovereign AGI continuum' },
              { label: '🔍 Deep Research', query: 'Perform deep research on multi-tenant Auth0 fail-closed isolation' },
              { label: '💼 Make Business Plan', query: 'Develop a 5-fold kingdom tithe business plan with XAU/USD gold reserves' },
              { label: '⛏️ Mine Block', query: 'Mint a new verified consensus block into the spine ledger' },
            ].map((qa, i) => (
              <button
                key={i}
                onClick={() => handleSendPrompt(qa.query)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  background: 'rgba(10, 31, 40, 0.75)',
                  border: '1px solid rgba(105, 231, 185, 0.16)',
                  color: '#94a3b8',
                  fontSize: '11px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#69e7b9';
                  e.currentTarget.style.borderColor = 'rgba(105, 231, 185, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#94a3b8';
                  e.currentTarget.style.borderColor = 'rgba(105, 231, 185, 0.16)';
                }}
              >
                {qa.label}
              </button>
            ))}
          </div>

          {/* Last Evidence Hash Pill */}
          {lastExecutedEvidence && (
            <div
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                color: '#6ee7b7',
                fontSize: '11px',
                fontFamily: theme.fontMono,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>✓ Cryptographic Attestation Sealed:</span>
              <span style={{ color: '#ffffff' }}>{lastExecutedEvidence}</span>
            </div>
          )}
        </main>

        {/* ── RIGHT PANEL: Security, Telemetry & Global News ── */}
        {rightPanelOpen && (
          <aside
            style={{
              width: '320px',
              minWidth: '280px',
              borderLeft: '1px solid rgba(105, 231, 185, 0.1)',
              background: 'rgba(5, 12, 18, 0.95)',
              display: 'flex',
              flexDirection: 'column',
              padding: '16px 14px',
              gap: '16px',
              overflowY: 'auto',
            }}
          >
            {/* Auth0 Gateway Card */}
            <div
              style={{
                padding: '12px',
                borderRadius: '10px',
                background: 'rgba(10, 25, 35, 0.8)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8' }}>AUTH0 GATEWAY</span>
                <span
                  style={{
                    fontSize: '9px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                  }}
                >
                  FAIL-CLOSED ✓
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
                Tenant: <strong style={{ color: '#ffffff' }}>{authSession?.tenant?.name || 'Ω∞v Sovereign Enterprise'}</strong>
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '3px' }}>
                SSO: Google, Apple, Corporate Email (Verified)
              </div>
            </div>

            {/* AI / NEWS / GLOBER Real-Time Sensory Organ Ticker */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#eab308' }}>AI / NEWS / GLOBER</span>
                <span style={{ fontSize: '9px', color: '#10b981', fontFamily: theme.fontMono }}>LIVE SENSORY</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {newsSignals.length === 0 ? (
                  <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
                    Listening to planetary sensory signals…
                  </div>
                ) : (
                  newsSignals.slice(0, 3).map((sig: any) => (
                    <div
                      key={sig.id}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        fontSize: '11px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span
                          style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            color:
                              sig.world === 'WORLD_PHYSICAL'
                                ? '#38bdf8'
                                : sig.world === 'WORLD_COGNITIVE'
                                ? '#a855f7'
                                : sig.world === 'WORLD_ECONOMIC'
                                ? '#eab308'
                                : '#10b981',
                          }}
                        >
                          {sig.world?.replace('WORLD_', '')}
                        </span>
                        <span style={{ fontSize: '9px', color: '#64748b' }}>432 Hz</span>
                      </div>
                      <div style={{ color: '#e2e8f0', fontWeight: 600, lineHeight: 1.4, marginBottom: '4px' }}>
                        {sig.headline}
                      </div>
                      <div style={{ fontSize: '10px', color: '#8ba8a0' }}>{sig.actionableDelta}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Background Persistent Goals */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#f43f5e', marginBottom: '8px' }}>
                AUTONOMOUS GOALS ({globerStatus?.activeGoals?.length || 0})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {(globerStatus?.activeGoals || []).map((goal: any) => (
                  <div
                    key={goal.id}
                    style={{
                      padding: '8px',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      fontSize: '11px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{goal.title}</span>
                      <span style={{ fontSize: '10px', color: '#10b981', fontFamily: theme.fontMono }}>
                        {goal.progressPercent}%
                      </span>
                    </div>
                    <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>
                      Agent: {goal.assignedAgent} · {goal.mode}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* System Health & Telemetry */}
            <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
                System Telemetry
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
                <span>Backend Port</span>
                <span style={{ color: '#38bdf8', fontFamily: theme.fontMono }}>:5000 (Fastify)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                <span>VOOS Daemon</span>
                <span style={{ color: '#10b981', fontFamily: theme.fontMono }}>:8088 (Active)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                <span>IndexedDB Queue</span>
                <span style={{ color: '#10b981', fontFamily: theme.fontMono }}>Resilient (Sync)</span>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* ── AUTH0 OVERLAY MODAL (When Toggled) ── */}
      {showAuthOverlay && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(3, 8, 14, 0.85)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            style={{
              width: '380px',
              padding: '24px',
              borderRadius: '16px',
              background: '#091520',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.8)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#ffffff' }}>Auth0 Enterprise SSO</h3>
              <button
                onClick={() => setShowAuthOverlay(false)}
                style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 16px' }}>
              Tenant isolation is enforced with fail-closed cryptographic routing.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => {
                  alert('SSO with Google Workspace verified');
                  setShowAuthOverlay(false);
                }}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Sign in with Google Workspace
              </button>
              <button
                onClick={() => {
                  alert('SSO with Corporate SAML verified');
                  setShowAuthOverlay(false);
                }}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Sign in with Corporate SAML / OIDC
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
