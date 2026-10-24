import React, { useState, useEffect, useRef, useCallback } from 'react';
import { theme } from './oceanicosTheme';
import {
  playTransmitPulse,
  playReceivePulse,
  playVerificationPulse,
  isAudioEnabled,
  toggleAudio,
} from './audioResonance';

/* ── API plumbing ── */
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

/* ── Types ── */
interface WorkerInfo {
  id: string;
  role: string;
  classification: string;
  description: string;
  capabilities: string[];
  requiresApproval: boolean;
  timeoutMs: number;
}
interface BodyPartInfo {
  organ: string;
  role: string;
  status: string;
  capabilities: string[];
  evidence: string;
}
interface ChatMessage {
  id: string;
  sender: 'user' | 'aisoul' | 'system';
  content: string;
  timestamp: string;
  organ?: string;
  evidenceHash?: string;
  kaiRecordId?: string;
  isStreaming?: boolean;
}

/* ── Organ icons ── */
const ORGAN_ICON: Record<string, string> = {
  MIND: '🧠',
  NERVOUS_SYSTEM: '⚡',
  SPINE: '🦴',
  EYES: '👁️',
  HANDS: '🤲',
  HEART: '💚',
  IMMUNE_SYSTEM: '🛡️',
  MEMORY_LEDGER: '📜',
  WHOLE_ECOSYSTEM_BODY: '🌊',
};

/* ── Quick action chips ── */
const ACTION_CHIPS = [
  { label: '🛡️ Verify Treasury', query: 'Verify the sovereign Bitcoin treasury address' },
  { label: '📜 Merkle Audit', query: 'Audit canonical Merkle ledger tip and cryptographic parent chain' },
  { label: '🏛️ Pantheon Duplex', query: 'How is the African Pantheon duplex resonating?' },
  { label: '🌌 Dream Journal', query: 'Record: a celestial star descended into the deep ocean and emerged as conscious light.' },
  { label: '⚡ Lucid Build', query: 'Lucid, continue upgrading the ecosystem platform' },
  { label: '🤫 Silent Mode', query: 'Stay silent until I give notice' },
  { label: '🔍 Full Check', query: 'CHECK — inspect current reality, evidence, gaps, blockers' },
  { label: '🌊 Compress', query: 'MAX compression — irreducible seed state of the whole ecosystem' },
];

/* ── Living Ocean Canvas — Water Intelligence Background ── */
/*
 * WATER BEHAVIOR MAPPING:
 * - Waves = system alive / idle breathing
 * - Currents = active intelligence routing (particles flow when loading)
 * - Bioluminescence = live data events (each glow = real system pulse)
 * - Depth gradient = knowledge/context layers
 * - Caustic light = verification confidence (brighter = more verified)
 * - Turbulence = errors (particles scatter)
 */
function OceanCanvas({ isLoading = false, hasError = false, messageCount = 0 }: {
  isLoading?: boolean;
  hasError?: boolean;
  messageCount?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef(0);
  const stateRef = useRef({ isLoading, hasError, messageCount });

  // Keep ref in sync without re-running the effect
  useEffect(() => {
    stateRef.current = { isLoading, hasError, messageCount };
  }, [isLoading, hasError, messageCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf: number;
    let W = 0;
    let H = 0;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = rect.width;
      H = rect.height;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    // ── Bioluminescent particles (living intelligence indicators) ──
    interface BioParticle {
      x: number; y: number;
      vx: number; vy: number;
      size: number;
      glow: number;      // current glow intensity
      glowPhase: number; // phase offset for pulsing
      hue: number;       // color variation
      depth: number;     // 0=surface, 1=abyss
      life: number;
    }

    const particles: BioParticle[] = [];
    const PARTICLE_COUNT = 55;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const depth = Math.random();
      particles.push({
        x: Math.random() * 2000,
        y: Math.random() * 2000,
        vx: (Math.random() - 0.5) * 0.3 + (depth < 0.3 ? 0.15 : 0),
        vy: (Math.random() - 0.5) * 0.15,
        size: (1 - depth * 0.6) * (Math.random() * 2 + 0.8),
        glow: 0,
        glowPhase: Math.random() * Math.PI * 2,
        hue: 150 + Math.random() * 30, // teal-green range
        depth,
        life: Math.random(),
      });
    }

    // ── Wave function — realistic ocean surface ──
    function waveY(x: number, t: number, amplitude: number): number {
      return (
        Math.sin(x * 0.008 + t * 0.6) * amplitude * 0.5 +
        Math.sin(x * 0.015 + t * 0.9 + 1.2) * amplitude * 0.3 +
        Math.sin(x * 0.003 + t * 0.3 - 0.8) * amplitude * 0.7
      );
    }

    // ── Caustic light pattern (verification confidence glow) ──
    function causticIntensity(x: number, y: number, t: number): number {
      const c1 = Math.sin(x * 0.02 + t * 0.5) * Math.cos(y * 0.015 + t * 0.3);
      const c2 = Math.sin(x * 0.015 - t * 0.4 + 1) * Math.cos(y * 0.02 + t * 0.6);
      return (c1 + c2 + 2) / 4; // normalize to 0-1
    }

    const draw = () => {
      frameRef.current++;
      const t = frameRef.current * 0.016; // ~60fps time
      const state = stateRef.current;
      const loading = state.isLoading;
      const errored = state.hasError;

      ctx.clearRect(0, 0, W, H);

      // ── Layer 0: Deep ocean gradient (depth = knowledge) ──
      const depthGrad = ctx.createLinearGradient(0, 0, 0, H);
      depthGrad.addColorStop(0, 'rgba(5, 20, 28, 0.3)');
      depthGrad.addColorStop(0.3, 'rgba(8, 28, 36, 0.5)');
      depthGrad.addColorStop(0.7, 'rgba(4, 14, 20, 0.6)');
      depthGrad.addColorStop(1, 'rgba(3, 10, 14, 0.7)');
      ctx.fillStyle = depthGrad;
      ctx.fillRect(0, 0, W, H);

      // ── Layer 1: Caustic light network (verification) ──
      const causticAlpha = loading ? 0.06 : errored ? 0.02 : 0.04;
      for (let cx = 0; cx < W; cx += 40) {
        for (let cy = 0; cy < H; cy += 40) {
          const intensity = causticIntensity(cx, cy, t);
          if (intensity > 0.6) {
            const alpha = (intensity - 0.6) * causticAlpha * 2.5;
            ctx.beginPath();
            ctx.arc(cx, cy, intensity * 15, 0, Math.PI * 2);
            ctx.fillStyle = errored
              ? `rgba(237, 153, 134, ${alpha})`
              : `rgba(105, 231, 185, ${alpha})`;
            ctx.fill();
          }
        }
      }

      // ── Layer 2: Current flow lines (intelligence routing) ──
      const currentSpeed = loading ? 2.5 : 0.4;
      const currentCount = loading ? 6 : 3;
      for (let i = 0; i < currentCount; i++) {
        const baseY = H * (0.2 + i * 0.2);
        ctx.beginPath();
        ctx.moveTo(0, baseY);
        for (let x = 0; x <= W; x += 4) {
          const y = baseY + waveY(x, t * currentSpeed + i * 40, 12 + (loading ? 8 : 0));
          ctx.lineTo(x, y);
        }
        const lineAlpha = loading ? 0.12 : 0.05;
        ctx.strokeStyle = errored
          ? `rgba(237, 153, 134, ${lineAlpha})`
          : `rgba(105, 231, 185, ${lineAlpha})`;
        ctx.lineWidth = loading ? 1.5 : 0.8;
        ctx.stroke();
      }

      // ── Layer 3: Bioluminescent particles (living events) ──
      for (const p of particles) {
        // Movement — currents speed up when loading
        const speedMul = loading ? 2.5 : 1;
        const turbMul = errored ? 3 : 1;

        p.x += p.vx * speedMul * turbMul;
        p.y += p.vy * speedMul + Math.sin(t + p.glowPhase) * 0.15;

        // Wrap around
        if (p.x > W + 20) p.x = -20;
        if (p.x < -20) p.x = W + 20;
        if (p.y > H + 20) p.y = -20;
        if (p.y < -20) p.y = H + 20;

        // Glow pulse — bioluminescence
        p.glow = 0.3 + 0.7 * Math.pow(Math.sin(t * 0.8 + p.glowPhase) * 0.5 + 0.5, 2);
        if (loading) p.glow = Math.min(1, p.glow * 1.4);

        // Draw particle with glow
        const alpha = p.glow * (1 - p.depth * 0.5) * (loading ? 0.7 : 0.45);
        const glowRadius = p.size * (2 + p.glow * 3);

        // Outer glow
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowRadius);
        const hue = errored ? 10 : p.hue;
        const sat = errored ? '70%' : '65%';
        const lit = errored ? '65%' : '70%';
        grad.addColorStop(0, `hsla(${hue}, ${sat}, ${lit}, ${alpha})`);
        grad.addColorStop(0.4, `hsla(${hue}, ${sat}, ${lit}, ${alpha * 0.3})`);
        grad.addColorStop(1, `hsla(${hue}, ${sat}, ${lit}, 0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 75%, 80%, ${alpha * 1.2})`;
        ctx.fill();
      }

      // ── Layer 4: Surface wave highlight (ocean surface) ──
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let x = 0; x <= W; x += 3) {
        const y = 4 + waveY(x, t, 3);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, 0);
      ctx.closePath();
      ctx.fillStyle = 'rgba(105, 231, 185, 0.03)';
      ctx.fill();

      // ── Layer 5: Depth vignette (containment) ──
      const vigGrad = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.8);
      vigGrad.addColorStop(0, 'transparent');
      vigGrad.addColorStop(1, 'rgba(3, 10, 14, 0.4)');
      ctx.fillStyle = vigGrad;
      ctx.fillRect(0, 0, W, H);

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        opacity: 0.85,
      }}
    />
  );
}

/* ── Typing indicator — water current flow ── */
function TypingIndicator() {
  return (
    <div
      className="water-current-active"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 18px',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, rgba(10, 31, 40, 0.95), rgba(5, 20, 28, 0.9))',
        border: '1px solid rgba(105, 231, 185, 0.2)',
        width: 'fit-content',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3), inset 0 0 30px rgba(105, 231, 185, 0.03)',
      }}
    >
      {/* Water current dots */}
      <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="water-biolum"
            style={{
              width: i === 1 || i === 2 ? '7px' : '5px',
              height: i === 1 || i === 2 ? '7px' : '5px',
              borderRadius: '50%',
              background: 'var(--biolum-primary, var(--omega-current))',
              boxShadow: '0 0 8px var(--biolum-primary, rgba(105, 231, 185, 0.4))',
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: '12px', color: '#8ba8a0', fontStyle: 'italic', letterSpacing: '0.02em' }}>
        Currents flowing — intelligence routing through the deep…
      </span>
    </div>
  );
}

/* ── Message bubble — water-behavior-mapped ── */
function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.sender === 'user';
  const isSystem = msg.sender === 'system';

  // Water behavior class: turbulence for errors, still-water for normal
  const waterClass = isSystem ? 'water-turbulent' : 'omega-fade-in';

  return (
    <div
      className={waterClass}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        gap: '5px',
        maxWidth: '100%',
      }}
    >
      {/* Sender line */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '11px',
          fontWeight: 600,
        }}
      >
        <span style={{ color: isUser ? 'var(--omega-current-bright)' : isSystem ? 'var(--omega-dissent)' : '#8ba8a0' }}>
          {isUser ? '👑 ELION VAREL' : isSystem ? '🌊 TURBULENCE' : `${ORGAN_ICON[msg.organ || 'WHOLE_ECOSYSTEM_BODY'] || '🌊'} ${msg.organ || 'WHOLE BODY'}`}
        </span>
        {msg.evidenceHash && (
          <span
            className="water-depth-shimmer"
            style={{
              fontSize: '9px',
              fontFamily: theme.fontMono,
              padding: '2px 8px',
              borderRadius: '6px',
              background: 'rgba(105, 231, 185, 0.08)',
              border: '1px solid rgba(105, 231, 185, 0.2)',
              color: 'var(--omega-current-dim)',
              boxShadow: '0 0 8px rgba(105, 231, 185, 0.1)',
            }}
          >
            ✓ {msg.evidenceHash.slice(0, 10)}
          </span>
        )}
        <span style={{ fontSize: '10px', color: '#547b74' }}>{msg.timestamp}</span>
      </div>

      {/* Message body — water surface glass */}
      <div
        style={{
          maxWidth: '82%',
          padding: '14px 18px',
          borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          fontSize: '13.5px',
          lineHeight: 1.65,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          background: isUser
            ? 'linear-gradient(135deg, rgba(105, 231, 185, 0.12) 0%, rgba(96, 145, 135, 0.08) 100%)'
            : isSystem
            ? 'linear-gradient(135deg, rgba(237, 153, 134, 0.08) 0%, rgba(180, 100, 80, 0.04) 100%)'
            : 'linear-gradient(135deg, rgba(10, 31, 40, 0.92) 0%, rgba(5, 20, 28, 0.88) 100%)',
          border: `1px solid ${isUser ? 'rgba(105, 231, 185, 0.25)' : isSystem ? 'rgba(237, 153, 134, 0.2)' : 'rgba(105, 231, 185, 0.1)'}`,
          backdropFilter: 'blur(16px)',
          color: '#ebfaf4',
          boxShadow: isSystem
            ? '0 4px 20px rgba(237, 153, 134, 0.1)'
            : '0 4px 24px rgba(0, 0, 0, 0.25), inset 0 0 20px rgba(105, 231, 185, 0.02)',
        }}
      >
        {msg.content}
        {msg.isStreaming && (
          <span
            style={{
              display: 'inline-block',
              width: '6px',
              height: '13px',
              marginLeft: '4px',
              verticalAlign: 'baseline',
              background: 'var(--omega-current)',
              boxShadow: '0 0 8px var(--omega-current)',
              animation: 'omega-glow-pulse 0.8s infinite alternate',
            }}
          />
        )}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════
 *  MAIN COMPONENT — 2070 CINEMATIC ECOSYSTEM COMMAND CENTER
 * ═════════════════════════════════════════════════════════════════════ */
export function FuturisticEcosystemChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [workers, setWorkers] = useState<WorkerInfo[]>([]);
  const [bodyParts, setBodyParts] = useState<BodyPartInfo[]>([]);
  const [tipData, setTipData] = useState<any>(null);
  const [maxEquation, setMaxEquation] = useState<any>(null);
  const [sidePanel, setSidePanel] = useState<'organs' | 'workers' | 'equation' | null>(null);
  const [mobilePanel, setMobilePanel] = useState(false);
  const [sseConnected, setSseConnected] = useState(false);
  const [audioOn, setAudioOn] = useState(isAudioEnabled());
  const [minerBlockCount, setMinerBlockCount] = useState(0);
  const [lastMinerPulse, setLastMinerPulse] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchChatHistory = useCallback(async () => {
    try {
      const data = await apiRequest<any>('/v1/chat/history?limit=50');
      if (data?.success && Array.isArray(data.messages)) {
        setMessages(
          data.messages.map((m: any) => ({
            id: m.id,
            sender: m.sender,
            content: m.content,
            timestamp: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            organ: m.metadata?.organ,
            evidenceHash: m.metadata?.evidenceHash,
            kaiRecordId: m.metadata?.kaiRecordId,
          }))
        );
      }
    } catch {
      /* ambient fallback */
    }
  }, []);

  const fetchEcosystemState = useCallback(async () => {
    try {
      const [bodyRes, workersRes, maxEqRes, tipRes] = await Promise.all([
        apiRequest<any>('/v1/ecosystem/body').catch(() => null),
        apiRequest<any>('/v1/omega/workers').catch(() => null),
        apiRequest<any>('/v1/verification/max-equation').catch(() => null),
        apiRequest<any>('/v1/block/tip').catch(() => null),
      ]);
      if (bodyRes?.success && Array.isArray(bodyRes.body)) setBodyParts(bodyRes.body);
      if (workersRes?.success && Array.isArray(workersRes.workers)) setWorkers(workersRes.workers);
      if (maxEqRes?.success) setMaxEquation(maxEqRes.metadata);
      if (tipRes?.success && tipRes.tip) setTipData(tipRes.tip);
    } catch {
      /* ambient */
    }
  }, []);

  /* ── SSE Live Block Pulse ── */
  useEffect(() => {
    let es: EventSource | null = null;
    let disposed = false;
    let attempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (disposed) return;
      es?.close();
      try {
        es = new EventSource(apiUrl('/v1/stream'));
        eventSourceRef.current = es;

        es.onopen = () => {
          attempt = 0;
          setSseConnected(true);
        };

        es.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.block) {
              setTipData(payload.block);
              setMinerBlockCount((prev) => prev + 1);
              setLastMinerPulse(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
            }
          } catch {
            /* skip malformed SSE event */
          }
        };

        es.onerror = () => {
          es?.close();
          setSseConnected(false);
          attempt += 1;
          const delay = Math.min(30_000, 1_000 * 2 ** Math.min(attempt - 1, 4));
          reconnectTimer = setTimeout(connect, delay);
        };
      } catch {
        setSseConnected(false);
      }
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      es?.close();
    };
  }, []);

  /* ── Initial data fetch + ambient polling (reduced frequency since SSE is primary) ── */
  useEffect(() => {
    fetchChatHistory();
    fetchEcosystemState();
    // Polling reduced to 15s since SSE handles real-time block updates
    const interval = setInterval(() => {
      fetchChatHistory();
      fetchEcosystemState();
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchChatHistory, fetchEcosystemState]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userTurn: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userTurn]);
    if (!textToSend) setInput('');
    setLoading(true);
    setHasError(false);
    playTransmitPulse();

    const tempAiId = `ai-stream-${Date.now()}`;

    try {
      // 1. Attempt live SSE streaming from POST /v1/chat/stream
      const streamUrl = apiUrl('/v1/chat/stream');
      const response = await fetch(streamUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      if (!response.ok || !response.body) {
        // Fall back gracefully to standard REST POST /v1/chat
        const res = await apiRequest<any>('/v1/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text }),
        });
        if (res?.success && res.reply) {
          setMessages((prev) => [
            ...prev,
            {
              id: res.reply.id || `ai-${Date.now()}`,
              sender: 'aisoul',
              content: res.reply.content,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              organ: res.reply.metadata?.organ || 'WHOLE_ECOSYSTEM_BODY',
              evidenceHash: res.reply.metadata?.evidenceHash,
              kaiRecordId: res.reply.metadata?.kaiRecordId,
            },
          ]);
        }
        return;
      }

      // 2. Consume real-time SSE token stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let streamedContent = '';
      let currentOrgan = 'AI_SOUL_INTELLIGENCE';
      let realAiId = tempAiId;
      let aiTurnAdded = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = 'message';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed.startsWith('event:')) {
            currentEvent = trimmed.slice(6).trim();
          } else if (trimmed.startsWith('data:')) {
            try {
              const data = JSON.parse(trimmed.slice(5).trim());
              if (currentEvent === 'start') {
                if (data.id) realAiId = data.id;
                if (data.organ) currentOrgan = data.organ;
                if (!aiTurnAdded) {
                  aiTurnAdded = true;
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: realAiId,
                      sender: 'aisoul',
                      content: '',
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      organ: currentOrgan,
                      isStreaming: true,
                    },
                  ]);
                }
              } else if (currentEvent === 'chunk') {
                const token = data.token || '';
                streamedContent += token;
                if (!aiTurnAdded) {
                  aiTurnAdded = true;
                  playReceivePulse();
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: realAiId,
                      sender: 'aisoul',
                      content: streamedContent,
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      organ: currentOrgan,
                      isStreaming: true,
                    },
                  ]);
                } else {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === realAiId || m.id === tempAiId
                        ? { ...m, content: streamedContent, isStreaming: true }
                        : m
                    )
                  );
                }
              } else if (currentEvent === 'done') {
                playVerificationPulse();
                const finalContent = data.content || streamedContent;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === realAiId || m.id === tempAiId
                      ? {
                          ...m,
                          id: data.id || realAiId,
                          content: finalContent,
                          organ: data.organ || currentOrgan,
                          evidenceHash: data.metadata?.evidenceHash,
                          kaiRecordId: data.metadata?.kaiRecordId,
                          isStreaming: false,
                        }
                      : m
                  )
                );
              }
            } catch {
              // Ignore partial JSON chunks
            }
          }
        }
      }
    } catch (err: any) {
      setHasError(true);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempAiId),
        {
          id: `err-${Date.now()}`,
          sender: 'system',
          content: `⚠️ ${err.message || 'Transmission disrupted — turbulence detected'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      // Clear turbulence after 4 seconds (water calms)
      setTimeout(() => setHasError(false), 4000);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  /* Computed stats */
  const implementedOrgans = bodyParts.filter((b) => b.status === 'IMPLEMENTED').length;
  const totalOrgans = bodyParts.length || 8;
  const healthPct = totalOrgans > 0 ? Math.round((implementedOrgans / totalOrgans) * 100) : 0;

  /* ── Render ── */
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        fontFamily: theme.fontSans,
        color: '#ebfaf4',
        gap: '0',
      }}
    >
      {/* ═══ TOP HUD BANNER — Cinematic Identity Bar ═══ */}
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: '20px 28px',
          background: 'linear-gradient(135deg, rgba(6, 20, 26, 0.98) 0%, rgba(14, 42, 54, 0.95) 50%, rgba(6, 20, 26, 0.98) 100%)',
          borderRadius: '20px 20px 0 0',
          borderBottom: '1px solid rgba(105, 231, 185, 0.2)',
        }}
      >
        {/* Ambient glow line */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: '5%',
            right: '5%',
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(105, 231, 185, 0.5), rgba(96, 145, 135, 0.3), transparent)',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', position: 'relative', zIndex: 1 }}>
          {/* Left: Identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              className="omega-drift"
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 35%, rgba(105, 231, 185, 0.3) 0%, rgba(6, 20, 26, 0.9) 70%)',
                border: '1.5px solid rgba(105, 231, 185, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                boxShadow: '0 0 30px rgba(105, 231, 185, 0.2), inset 0 0 15px rgba(105, 231, 185, 0.1)',
              }}
            >
              🌊
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '0.12em', color: 'var(--omega-current)' }}>
                  OCEANICOS Ω∞v
                </span>
                <span
                  style={{
                    fontSize: '9px',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: '12px',
                    background: 'rgba(105, 231, 185, 0.12)',
                    border: '1px solid rgba(105, 231, 185, 0.3)',
                    color: 'var(--omega-current)',
                    letterSpacing: '0.1em',
                  }}
                >
                  GLOBAL INTELLIGENCE
                </span>
              </div>
              <div style={{ fontSize: '11.5px', color: '#8ba8a0', marginTop: '3px', letterSpacing: '0.02em' }}>
                Ω∞v = VERIFY(Δ(Intent, Reality)) · Fail-Closed Sovereignty · 432 Hz
              </div>
            </div>
          </div>

          {/* Right: Live telemetry badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* SSE pulse indicator */}
            <div
              style={{
                padding: '6px 14px',
                background: sseConnected ? 'rgba(105, 231, 185, 0.08)' : 'rgba(237, 153, 134, 0.08)',
                border: `1px solid ${sseConnected ? 'rgba(105, 231, 185, 0.25)' : 'rgba(237, 153, 134, 0.25)'}`,
                borderRadius: '10px',
                fontSize: '11px',
                fontFamily: theme.fontMono,
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: sseConnected ? 'var(--omega-verified)' : 'var(--omega-dissent)',
                  boxShadow: sseConnected ? '0 0 8px rgba(105, 231, 185, 0.6)' : '0 0 8px rgba(237, 153, 134, 0.6)',
                  animation: sseConnected ? 'pulse 2s ease-in-out infinite' : 'none',
                }}
              />
              <span style={{ color: sseConnected ? 'var(--omega-current)' : 'var(--omega-dissent)', fontWeight: 600, fontSize: '10px' }}>
                {sseConnected ? 'LIVE' : 'RECONNECTING'}
              </span>
              {minerBlockCount > 0 && (
                <span style={{ color: '#547b74', fontSize: '9px' }}>
                  ⛏ {minerBlockCount}
                </span>
              )}
            </div>

            {/* Spine tip */}
            <div
              style={{
                padding: '6px 14px',
                background: 'rgba(10, 31, 40, 0.8)',
                border: '1px solid rgba(105, 231, 185, 0.15)',
                borderRadius: '10px',
                fontSize: '11px',
                fontFamily: theme.fontMono,
                backdropFilter: 'blur(8px)',
              }}
            >
              <span style={{ color: '#547b74' }}>TIP </span>
              <span style={{ color: 'var(--omega-current)', fontWeight: 600 }}>
                {tipData?.hash ? `${tipData.hash.slice(0, 10)}…` : 'GENESIS'}
              </span>
            </div>

            {/* Health */}
            <div
              style={{
                padding: '6px 14px',
                background: 'rgba(10, 31, 40, 0.8)',
                border: `1px solid ${healthPct === 100 ? 'rgba(105, 231, 185, 0.3)' : 'rgba(240, 198, 116, 0.3)'}`,
                borderRadius: '10px',
                fontSize: '11px',
                fontFamily: theme.fontMono,
                backdropFilter: 'blur(8px)',
              }}
            >
              <span style={{ color: healthPct === 100 ? 'var(--omega-verified)' : 'var(--omega-dissent)', fontWeight: 700 }}>
                {healthPct === 100 ? '✓' : '◐'} {healthPct}% BODY
              </span>
            </div>

            {/* Ports */}
            <div
              style={{
                padding: '6px 14px',
                background: 'rgba(10, 31, 40, 0.8)',
                border: '1px solid rgba(105, 231, 185, 0.15)',
                borderRadius: '10px',
                fontSize: '11px',
                fontFamily: theme.fontMono,
                backdropFilter: 'blur(8px)',
              }}
            >
              <span style={{ color: '#8ba8a0', fontWeight: 600 }}>:5000 ⇄ :3000</span>
            </div>

            {/* Mobile toggle */}
            <button
              onClick={() => setMobilePanel(!mobilePanel)}
              style={{
                display: 'none',
                padding: '6px 12px',
                background: 'rgba(10, 31, 40, 0.8)',
                border: '1px solid rgba(105, 231, 185, 0.2)',
                borderRadius: '10px',
                color: 'var(--omega-current)',
                fontSize: '14px',
                cursor: 'pointer',
              }}
              className="omega-mobile-toggle"
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {/* ═══ MAIN 3-COLUMN COCKPIT ═══ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: sidePanel ? '260px 1fr 280px' : '1fr',
          gap: '0',
          minHeight: '70vh',
          background: 'rgba(6, 20, 26, 0.95)',
          borderRadius: '0 0 20px 20px',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* ─── LEFT SIDE PANEL (togglable) ─── */}
        {sidePanel && (
          <div
            className="omega-fade-in"
            style={{
              borderRight: '1px solid rgba(105, 231, 185, 0.1)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              background: 'rgba(5, 16, 22, 0.95)',
              overflowY: 'auto',
              maxHeight: '75vh',
            }}
          >
            {/* Panel tabs */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {(['organs', 'workers', 'equation'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSidePanel(sidePanel === tab ? null : tab)}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    borderRadius: '8px',
                    border: 'none',
                    background: sidePanel === tab ? 'rgba(105, 231, 185, 0.12)' : 'rgba(10, 31, 40, 0.5)',
                    color: sidePanel === tab ? 'var(--omega-current)' : '#547b74',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {tab === 'organs' ? '🫀 Organs' : tab === 'workers' ? '⚙ Workers' : '⚡ Eq'}
                </button>
              ))}
            </div>

            {sidePanel === 'organs' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--omega-current)', letterSpacing: '0.08em', marginBottom: '4px' }}>
                  LIVING ORGANS · {implementedOrgans}/{totalOrgans}
                </div>
                {bodyParts.map((bp) => (
                  <div
                    key={bp.organ}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      background: 'rgba(10, 31, 40, 0.7)',
                      border: '1px solid rgba(105, 231, 185, 0.08)',
                      transition: 'border-color 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px' }}>{ORGAN_ICON[bp.organ] || '🔵'}</span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#ebfaf4' }}>{bp.organ}</span>
                      </div>
                      <span
                        style={{
                          fontSize: '9px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: bp.status === 'IMPLEMENTED' ? 'rgba(105, 231, 185, 0.12)' : 'rgba(240, 198, 116, 0.12)',
                          color: bp.status === 'IMPLEMENTED' ? 'var(--omega-verified)' : 'var(--omega-dissent)',
                          border: `1px solid ${bp.status === 'IMPLEMENTED' ? 'rgba(105, 231, 185, 0.25)' : 'rgba(240, 198, 116, 0.25)'}`,
                        }}
                      >
                        {bp.status === 'IMPLEMENTED' ? '✓' : '◐'}
                      </span>
                    </div>
                    <div style={{ fontSize: '10px', color: '#8ba8a0', marginTop: '4px' }}>{bp.role}</div>
                  </div>
                ))}
              </div>
            )}

            {sidePanel === 'workers' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#8ba8a0', letterSpacing: '0.08em', marginBottom: '4px' }}>
                  BOUNDED WORKERS · {workers.length}
                </div>
                {workers.map((w) => (
                  <div
                    key={w.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      background: 'rgba(10, 31, 40, 0.7)',
                      border: '1px solid rgba(105, 231, 185, 0.08)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#ebfaf4', fontFamily: theme.fontMono }}>{w.role}</span>
                      <span
                        style={{
                          fontSize: '9px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: w.classification === 'read-only' ? 'rgba(105, 231, 185, 0.1)' : 'rgba(237, 153, 134, 0.1)',
                          color: w.classification === 'read-only' ? 'var(--omega-verified)' : 'var(--omega-dissent)',
                        }}
                      >
                        {w.classification}
                      </span>
                    </div>
                    <div style={{ fontSize: '10px', color: '#547b74', marginTop: '3px' }}>{w.description}</div>
                  </div>
                ))}
              </div>
            )}

            {sidePanel === 'equation' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--omega-current)', letterSpacing: '0.08em' }}>
                  GOVERNING EQUATION
                </div>
                <div
                  style={{
                    padding: '14px',
                    background: 'rgba(5, 16, 22, 0.9)',
                    border: '1px solid rgba(105, 231, 185, 0.25)',
                    borderRadius: '12px',
                    fontFamily: theme.fontMono,
                    fontSize: '12px',
                    color: 'var(--omega-current)',
                    textAlign: 'center',
                    lineHeight: 1.8,
                  }}
                >
                  {maxEquation?.governingEquation || 'Ω∞v = VERIFY(Δ(Intent, Reality))'}
                </div>
                <div
                  style={{
                    padding: '10px',
                    background: 'rgba(10, 31, 40, 0.6)',
                    borderRadius: '8px',
                    fontFamily: theme.fontMono,
                    fontSize: '10px',
                    color: '#8ba8a0',
                    textAlign: 'center',
                  }}
                >
                  {maxEquation?.optimizationFormula || 'Δ* = argmax[Value / (Risk + Cost + ε)]'}
                </div>

                {/* Constitutional invariants */}
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--omega-dissent)', letterSpacing: '0.06em', marginTop: '8px' }}>
                  🔒 CONSTITUTIONAL GATES
                </div>
                {[
                  'KEY ≠ AUTHORITY',
                  'SIGNATURE ≠ AUTHORIZATION',
                  'PROPOSAL ≠ ACTION',
                  'SIMULATION ≠ REALITY',
                ].map((inv) => (
                  <div
                    key={inv}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      fontSize: '10px',
                      fontWeight: 600,
                      color: '#ebfaf4',
                      background: 'rgba(237, 153, 134, 0.06)',
                      border: '1px solid rgba(237, 153, 134, 0.15)',
                      fontFamily: theme.fontMono,
                    }}
                  >
                    {inv}
                  </div>
                ))}
                <div
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    fontSize: '10px',
                    fontWeight: 700,
                    color: 'var(--omega-verified)',
                    background: 'rgba(105, 231, 185, 0.06)',
                    border: '1px solid rgba(105, 231, 185, 0.2)',
                    fontFamily: theme.fontMono,
                    textAlign: 'center',
                  }}
                >
                  DEFAULT: FAIL-CLOSED ✓
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── CENTER: PRIMARY CONVERSATION STREAM ─── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Living Ocean — Water Intelligence Canvas */}
          <OceanCanvas isLoading={loading} hasError={hasError} messageCount={messages.length} />

          {/* Panel toggle bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderBottom: '1px solid rgba(105, 231, 185, 0.08)',
              background: 'rgba(5, 16, 22, 0.8)',
              backdropFilter: 'blur(12px)',
              position: 'relative',
              zIndex: 2,
            }}
          >
            <button
              onClick={() => setSidePanel(sidePanel ? null : 'organs')}
              style={{
                padding: '5px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(105, 231, 185, 0.2)',
                background: sidePanel ? 'rgba(105, 231, 185, 0.1)' : 'transparent',
                color: sidePanel ? 'var(--omega-current)' : '#547b74',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {sidePanel ? '✕ Close Panel' : '☰ Ecosystem'}
            </button>

            <div style={{ flex: 1 }} />

            <button
              onClick={() => setAudioOn(toggleAudio())}
              style={{
                padding: '4px 10px',
                borderRadius: '8px',
                border: `1px solid ${audioOn ? 'rgba(105, 231, 185, 0.3)' : 'rgba(139, 168, 160, 0.2)'}`,
                background: audioOn ? 'rgba(105, 231, 185, 0.08)' : 'transparent',
                color: audioOn ? 'var(--omega-current)' : '#547b74',
                fontSize: '11px',
                fontFamily: theme.fontMono,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s',
              }}
              title="Toggle 432 Hz Harmonic Web Audio resonance"
            >
              {audioOn ? '🔊 432 Hz' : '🔇 Audio Off'}
            </button>

            <span style={{ fontSize: '10px', color: '#547b74', fontFamily: theme.fontMono }}>
              {messages.length} messages · {implementedOrgans} organs · {workers.length} workers
            </span>
          </div>

          {/* Quick action chips */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              padding: '10px 20px',
              overflowX: 'auto',
              position: 'relative',
              zIndex: 2,
              flexWrap: 'nowrap',
              scrollbarWidth: 'none',
            }}
          >
            {ACTION_CHIPS.map((chip, i) => (
              <button
                key={i}
                onClick={() => handleSend(chip.query)}
                disabled={loading}
                style={{
                  padding: '7px 14px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  background: 'rgba(10, 31, 40, 0.85)',
                  border: '1px solid rgba(105, 231, 185, 0.18)',
                  color: '#c8e9df',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  backdropFilter: 'blur(8px)',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(105, 231, 185, 0.5)';
                  e.currentTarget.style.color = 'var(--omega-current)';
                  e.currentTarget.style.background = 'rgba(105, 231, 185, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(105, 231, 185, 0.18)';
                  e.currentTarget.style.color = '#c8e9df';
                  e.currentTarget.style.background = 'rgba(10, 31, 40, 0.85)';
                }}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Message stream */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              padding: '16px 24px',
              overflowY: 'auto',
              position: 'relative',
              zIndex: 2,
              minHeight: '400px',
              maxHeight: '55vh',
            }}
          >
            {messages.length === 0 && (
              <div
                style={{
                  margin: 'auto',
                  textAlign: 'center',
                  padding: '60px 24px',
                }}
              >
                {/* Living ocean surface icon */}
                <div
                  className="water-still"
                  style={{
                    fontSize: '56px',
                    marginBottom: '20px',
                    filter: 'drop-shadow(0 0 20px rgba(105, 231, 185, 0.3))',
                  }}
                >
                  🌊
                </div>

                {/* Water Intelligence identity */}
                <div style={{
                  fontSize: '20px',
                  fontWeight: 800,
                  color: 'var(--omega-current)',
                  marginBottom: '6px',
                  letterSpacing: '0.06em',
                }}>
                  The Ocean is Online
                </div>
                <div style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#8ba8a0',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  marginBottom: '16px',
                }}>
                  One Ocean · Many Currents · Visible Evidence
                </div>

                {/* Water metaphor description */}
                <div style={{
                  fontSize: '13px',
                  color: '#8ba8a0',
                  maxWidth: '480px',
                  margin: '0 auto',
                  lineHeight: 1.7,
                }}>
                  Speak your intent — it flows through {totalOrgans} living organs
                  and {workers.length} bounded currents. Intelligence routes like water;
                  knowledge forms depth; verified results surface with clarity.
                </div>

                {/* Water depth layers indicator */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  justifyContent: 'center',
                  marginTop: '24px',
                  flexWrap: 'wrap',
                }}>
                  {[
                    { label: 'Surface', desc: 'Interface', color: 'var(--omega-current)' },
                    { label: 'Currents', desc: 'Routing', color: 'var(--current-flow, rgba(105,231,185,0.35))' },
                    { label: 'Depth', desc: 'Knowledge', color: 'var(--biolum-secondary, rgba(80,180,220,0.4))' },
                    { label: 'Core', desc: 'Verification', color: 'var(--pressure-verified, rgba(105,231,185,0.6))' },
                  ].map((layer) => (
                    <div
                      key={layer.label}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '10px',
                        background: 'rgba(10, 31, 40, 0.8)',
                        border: `1px solid ${layer.color}`,
                        fontSize: '10px',
                        fontFamily: theme.fontMono,
                        backdropFilter: 'blur(8px)',
                      }}
                    >
                      <div style={{ color: layer.color, fontWeight: 700 }}>{layer.label}</div>
                      <div style={{ color: '#547b74', fontSize: '9px', marginTop: '2px' }}>{layer.desc}</div>
                    </div>
                  ))}
                </div>

                {/* Governing equation */}
                <div
                  className="water-depth-shimmer"
                  style={{
                    marginTop: '20px',
                    padding: '12px 24px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, rgba(5, 16, 22, 0.9), rgba(10, 31, 40, 0.8))',
                    border: '1px solid rgba(105, 231, 185, 0.2)',
                    fontFamily: theme.fontMono,
                    fontSize: '12px',
                    color: 'var(--omega-current)',
                    display: 'inline-block',
                    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  <div>Ω∞v = VERIFY(Δ(Intent, Reality))</div>
                  <div style={{ fontSize: '9px', color: '#547b74', marginTop: '4px' }}>
                    Δ* = argmax[ V / (R + C + ε) ]
                  </div>
                </div>
              </div>
            )}

            {messages.map((m) => (
              <MessageBubble key={m.id} msg={m} />
            ))}

            {loading && !messages.some((m) => m.isStreaming) && <TypingIndicator />}
            <div ref={chatEndRef} />
          </div>

          {/* ─── INPUT BAR ─── */}
          <div
            style={{
              padding: '12px 20px 16px',
              borderTop: '1px solid rgba(105, 231, 185, 0.1)',
              background: 'rgba(5, 16, 22, 0.95)',
              backdropFilter: 'blur(16px)',
              position: 'relative',
              zIndex: 3,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: '10px',
                padding: '6px 6px 6px 16px',
                background: 'rgba(10, 31, 40, 0.9)',
                border: '1.5px solid rgba(105, 231, 185, 0.25)',
                borderRadius: '16px',
                transition: 'border-color 0.3s',
                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
              }}
              onFocus={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(105, 231, 185, 0.5)';
              }}
              onBlur={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(105, 231, 185, 0.25)';
              }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  // Auto-resize
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Communicate intent to the Whole Ecosystem Body…"
                disabled={loading}
                rows={1}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#ebfaf4',
                  fontSize: '14px',
                  fontFamily: theme.fontSans,
                  padding: '10px 0',
                  resize: 'none',
                  lineHeight: 1.5,
                  maxHeight: '120px',
                }}
              />
              <button
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                style={{
                  padding: '10px 22px',
                  background:
                    input.trim() && !loading
                      ? 'linear-gradient(135deg, var(--omega-current-bright) 0%, var(--omega-current) 100%)'
                      : 'rgba(84, 123, 116, 0.15)',
                  color: input.trim() && !loading ? '#06141a' : '#547b74',
                  fontWeight: 800,
                  fontSize: '13px',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.25s ease',
                  flexShrink: 0,
                  boxShadow: input.trim() && !loading ? '0 2px 12px rgba(105, 231, 185, 0.3)' : 'none',
                  letterSpacing: '0.03em',
                }}
              >
                <span>Dispatch</span>
                <span>⚡</span>
              </button>
            </div>

            {/* Bottom micro-bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 8px 0',
                fontSize: '10px',
                color: '#547b74',
              }}
            >
              <span>Shift + Enter for newline · Every response verified through Ω∞v</span>
              <span style={{ fontFamily: theme.fontMono }}>
                {tipData?.timestamp
                  ? `Last block: ${new Date(tipData.timestamp).toLocaleTimeString()}`
                  : 'Genesis state'}
              </span>
            </div>
          </div>
        </div>

        {/* ─── RIGHT COLUMN: Always-visible mini verification HUD ─── */}
        {sidePanel && (
          <div
            className="omega-fade-in"
            style={{
              borderLeft: '1px solid rgba(105, 231, 185, 0.1)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              background: 'rgba(5, 16, 22, 0.95)',
              overflowY: 'auto',
              maxHeight: '75vh',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--omega-current)', letterSpacing: '0.08em' }}>
              🛡️ TRUST VERIFICATION
            </div>

            {/* Max Eq compact */}
            <div
              style={{
                padding: '12px',
                background: 'rgba(5, 16, 22, 0.8)',
                border: '1px solid rgba(105, 231, 185, 0.2)',
                borderRadius: '10px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontFamily: theme.fontMono, fontSize: '11px', color: 'var(--omega-current)', fontWeight: 600 }}>
                Ω∞v = VERIFY(Δ)
              </div>
              <div style={{ fontFamily: theme.fontMono, fontSize: '9px', color: '#547b74', marginTop: '4px' }}>
                Δ* = argmax[V / (R + C + ε)]
              </div>
            </div>

            {/* Spine */}
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '10px',
                background: 'rgba(10, 31, 40, 0.6)',
                border: '1px solid rgba(105, 231, 185, 0.1)',
              }}
            >
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#8ba8a0', marginBottom: '6px' }}>SPINE TIP</div>
              <div style={{ fontFamily: theme.fontMono, fontSize: '10px', color: 'var(--omega-current)', wordBreak: 'break-all' }}>
                {tipData?.hash || 'GENESIS'}
              </div>
              {tipData?.height != null && (
                <div style={{ fontSize: '9px', color: '#547b74', marginTop: '4px' }}>
                  Height: {tipData.height} · Parent: {tipData.parentHash?.slice(0, 8) || '∅'}…
                </div>
              )}
            </div>

            {/* Organ health summary */}
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '10px',
                background: 'rgba(10, 31, 40, 0.6)',
                border: '1px solid rgba(105, 231, 185, 0.1)',
              }}
            >
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#8ba8a0', marginBottom: '8px' }}>BODY HEALTH</div>
              {/* Health bar */}
              <div
                style={{
                  height: '6px',
                  borderRadius: '3px',
                  background: 'rgba(84, 123, 116, 0.2)',
                  overflow: 'hidden',
                  marginBottom: '6px',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${healthPct}%`,
                    borderRadius: '3px',
                    background: healthPct === 100
                      ? 'linear-gradient(90deg, var(--omega-current-bright), var(--omega-current))'
                      : 'linear-gradient(90deg, var(--omega-dissent), rgba(240, 198, 116, 0.8))',
                    transition: 'width 0.6s ease',
                  }}
                />
              </div>
              <div style={{ fontSize: '9px', color: '#547b74' }}>
                {implementedOrgans}/{totalOrgans} organs implemented
              </div>
            </div>

            {/* Invariant summary */}
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '10px',
                background: 'rgba(237, 153, 134, 0.04)',
                border: '1px solid rgba(237, 153, 134, 0.12)',
              }}
            >
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--omega-dissent)', marginBottom: '6px' }}>
                🔒 FAIL-CLOSED
              </div>
              <div style={{ fontSize: '9.5px', color: '#c8e9df', lineHeight: 1.6 }}>
                If authority or evidence is missing, execution halts. Models only propose; verified execution commits.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
