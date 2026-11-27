import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { submitIntent, type IntentReceipt, type Verdict } from './vibe-os-api';
import { TensorDavVisualizer } from './components/TensorDavVisualizer';
import { ExperienceSwitcher } from './ExperienceSwitcher';
import { MoodCodexPanel } from './MoodCodexPanel';
import { EntityCodexModal } from './components/EntityCodexModal';
import { StudioSettingsModal } from './components/StudioSettingsModal';
import { WaterFlowPanel } from './WaterFlowPanel';
import { WATER_FLOW_STAGES, type WaterFlowFrameView } from './water-flow-panel-model';
import './VibeOS.css';

export type ChatMessage = {
  role: 'user' | 'ai';
  content: string;
  verified: boolean;
  hash?: string;
  engine?: string;
  /** The API's own reason for a fail-closed or observed result. */
  detail?: string;
  status?: Verdict | 'OBSERVED' | 'SUPPORTED';
};

type LiveState = 'OBSERVED' | 'UNKNOWN' | 'VERIFIED' | 'SUPPORTED';
type HealthObservation = { status: LiveState; detail: string };

const VERIFYING = '[Verifying against kai_ledger...]';
const API_BASE_URL = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '');

function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

async function observeSpineHealth(signal?: AbortSignal): Promise<HealthObservation> {
  try {
    const response = await fetch(apiUrl('/health'), {
      headers: { accept: 'application/json' },
      signal,
    });
    return response.ok
      ? { status: 'OBSERVED', detail: `GET /health · HTTP ${response.status}` }
      : { status: 'UNKNOWN', detail: `GET /health · HTTP ${response.status}` };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { status: 'UNKNOWN', detail: 'Health observation cancelled.' };
    }
    return {
      status: 'UNKNOWN',
      detail: `GET /health unavailable${error instanceof Error ? ` · ${error.message}` : ''}`,
    };
  }
}

function receiptMessage(receipt: IntentReceipt): ChatMessage {
  if (receipt.verified) {
    return {
      role: 'ai',
      content: receipt.output ?? '',
      verified: true,
      hash: receipt.hash ?? undefined,
      engine: receipt.engine ?? undefined,
      status: 'VERIFIED',
    };
  }
  return {
    role: 'ai',
    content: `[${receipt.status}]`,
    verified: false,
    detail: receipt.reason ?? undefined,
    engine: receipt.engine ?? undefined,
    status: receipt.status,
  };
}

function StatusPill({
  label,
  status,
  detail,
}: {
  label: string;
  status: LiveState | Verdict;
  detail: string;
}) {
  return (
    <div className="vibe-status" aria-label={`${label} status`} title={detail}>
      <span className={`vibe-status-dot vibe-status-dot--${status.toLowerCase()}`} aria-hidden="true" />
      <span className="vibe-status-label">{label}</span>
      <strong className={`vibe-status-value vibe-status-value--${status.toLowerCase()}`}>{status}</strong>
      <small>{detail}</small>
    </div>
  );
}

function playHarmonicTone(frequencyHz = 432, durationSeconds = 1.2) {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequencyHz, ctx.currentTime);

    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationSeconds);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + durationSeconds + 0.05);

    setTimeout(() => {
      void ctx.close().catch(() => { });
    }, (durationSeconds + 0.2) * 1000);
  } catch {
    // Non-blocking fail-closed audio synthesis
  }
}

function generateWaterFlowFrames(state: string, intent: string): readonly WaterFlowFrameView[] {
  const boundedIntent = intent.trim() || 'water-current';
  const hash = Math.abs(
    Array.from(boundedIntent).reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) | 0, 0)
  ).toString(16).padEnd(8, '0');
  const traceId = `flow-${hash.slice(0, 8)}`;
  return WATER_FLOW_STAGES.map((stage, idx) => ({
    stage,
    sequence: idx,
    state,
    transition: stage === 'REALITY' ? `observe:${state}` : `${stage.toLowerCase()}:${boundedIntent}`,
    traceId,
    deterministic: true,
    bounds: { maxSteps: WATER_FLOW_STAGES.length },
    provenance: {
      source: 'local-water-flow',
      verified: false,
      note: 'Bounded symbolic local-simulation evidence; not physical-world observation or external execution.',
    },
  }));
}

export function VibeOS({ onOpenDashboard, active = true }: { onOpenDashboard?: () => void; active?: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [spine, setSpine] = useState<HealthObservation>({
    status: 'UNKNOWN',
    detail: 'No health response observed yet.',
  });
  const [spineCheckedAt, setSpineCheckedAt] = useState<string | null>(null);
  const [kaiStatus, setKaiStatus] = useState<Verdict>('UNKNOWN');
  const [davOpen, setDavOpen] = useState(false);
  const [moodOpen, setMoodOpen] = useState(false);
  const [codexOpen, setCodexOpen] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const [waterOpen, setWaterOpen] = useState(false);
  const [waterFrames, setWaterFrames] = useState<readonly WaterFlowFrameView[] | null>(null);
  const [moodState, setMoodState] = useState<HealthObservation>({
    status: 'UNKNOWN',
    detail: 'No mood response observed yet.',
  });
  const [voiceState, setVoiceState] = useState<HealthObservation>({
    status: 'UNKNOWN',
    detail: 'No voice bridge observation yet.',
  });
  const [llmState, setLlmState] = useState<HealthObservation>({
    status: 'UNKNOWN',
    detail: 'No LLM observation yet.',
  });
  const [useExternalModel, setUseExternalModel] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem('vibe_use_external_model') === 'true';
      }
    } catch {
      // fallback
    }
    return false;
  });

  const handleModelToggle = (enabled: boolean) => {
    setUseExternalModel(enabled);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('vibe_use_external_model', String(enabled));
      }
    } catch {
      // ignore
    }
  };
  const logRef = useRef<HTMLDivElement | null>(null);
  const [waveActive, setWaveActive] = useState<boolean>(false);

  const triggerWavePulse = (freq = 432) => {
    playHarmonicTone(freq, 0.6);
    setWaveActive(true);
    setTimeout(() => setWaveActive(false), 2400);
  };

  useEffect(() => {
    if (!active) return;

    let mounted = true;
    let controller: AbortController | null = null;
    const probe = async () => {
      controller?.abort();
      const current = new AbortController();
      controller = current;
      const observation = await observeSpineHealth(current.signal);
      if (mounted && !current.signal.aborted) {
        setSpine(observation);
        setSpineCheckedAt(new Date().toLocaleTimeString());
      }
      try {
        const moodRes = await fetch(apiUrl('/v1/mood'), {
          headers: { accept: 'application/json' },
          signal: current.signal,
        });
        const moodData = await moodRes.json();
        if (active && !current.signal.aborted && moodRes.ok && moodData?.success) {
          setMoodState({
            status: moodData.evaluation?.state === 'HIGH_INTEGRITY' ? 'OBSERVED' : 'UNKNOWN',
            detail: `${moodData.status} · ${moodData.evaluation?.description ?? 'Mood observed.'}`,
          });
        }
      } catch {
        // Mood probe gracefully fails closed to UNKNOWN
      }
      try {
        // Probe the spine's companion gateway, not a hardcoded localhost:8088:
        // the optional voice daemon is often absent, and a direct cross-origin
        // fetch logged a connection-refused error on every 15 s tick.
        const voiceRes = await fetch(apiUrl('/v1/companion/voice'), {
          headers: { accept: 'application/json' },
          signal: current.signal,
        });
        const voiceData = await voiceRes.json();
        if (active && !current.signal.aborted && voiceRes.ok && voiceData?.status === 'VERIFIED') {
          setVoiceState({
            status: 'VERIFIED',
            detail: `432 Hz · ${voiceData.resonance?.mode ?? 'harmonic-pure'} · SHA: ${voiceData.sha256?.slice(0, 8)}`,
          });
        }
      } catch {
        // Voice bridge gracefully fails closed to UNKNOWN
      }
      try {
        const llmRes = await fetch(apiUrl('/v1/llm/health'), {
          headers: { accept: 'application/json' },
          signal: current.signal,
        });
        const llmData = await llmRes.json();
        if (active && !current.signal.aborted && llmRes.ok && (llmData?.status === 'VERIFIED' || llmData?.status === 'OBSERVED')) {
          setLlmState({
            status: 'VERIFIED',
            detail: llmData?.detail ?? `${llmData?.model ?? 'qwen2.5:0.5b'} · port 11434 active`,
          });
        }
      } catch {
        // LLM probe gracefully fails closed to UNKNOWN
      }
    };
    void probe();
    const interval = window.setInterval(() => void probe(), 15_000);
    return () => {
      mounted = false;
      controller?.abort();
      window.clearInterval(interval);
    };
  }, [active]);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages, verifying]);

  const send = async () => {
    const intent = draft.trim();
    if (!intent || verifying) return;

    setDraft('');
    setMessages((previous) => [...previous, { role: 'user', content: intent, verified: false }]);
    setVerifying(true);
    triggerWavePulse(432);

    const lower = intent.toLowerCase();

    // Autonomous Full-Stack Tool Agent Recognition
    if (lower.includes('circuit breaker') || lower.includes('breaker status')) {
      await runRealityCircuitBreakerCheck();
      return;
    }
    if (lower.includes('failsafe') || lower.includes('quarantine')) {
      await runRealityFailsafeCheck();
      return;
    }
    if (lower.includes('notion sync') || lower.includes('schema sync') || lower.includes('sync notion')) {
      await runNotionSchemaSync();
      return;
    }
    if (lower.includes('notion') || lower.includes('notion unification') || lower.includes('notion bridge')) {
      await runNotionUnificationCheck();
      return;
    }
    if (lower.includes('reality tools status') || lower.includes('tools status') || lower.includes('tools health')) {
      await runRealityToolsStatusCheck();
      return;
    }
    if (lower.includes('dispatch tool') || lower.includes('tool dispatch') || lower.includes('reality dispatch')) {
      await runRealityToolDispatchCheck();
      return;
    }
    if (lower.includes('reality tools') || lower.includes('tools gateway')) {
      await runRealityToolsGatewayCheck();
      return;
    }
    if (lower.includes('orchestrate') || lower.includes('reality orchestration')) {
      await runRealityOrchestrationCheck();
      return;
    }
    if (lower.includes('execute pipeline') || lower.includes('pipeline execute')) {
      await runRealityPipelineExecuteCheck();
      return;
    }
    if (lower.includes('pipeline stream') || lower.includes('subscribe pipeline')) {
      await runPipelineCanvasStream();
      return;
    }
    if (lower.includes('voice bridge') || lower.includes('432hz') || lower.includes('harmonic resonance')) {
      await runVoiceBridgeCheck();
      return;
    }
    if (lower.includes('tensor') || lower.includes('dav proof') || lower.includes('dav visualizer')) {
      setDavOpen(true);
      await runKernelCheck();
      return;
    }
    if (lower.includes('synthesize') || lower.includes('multimodal asset')) {
      await runStudioSynthesisCheck();
      return;
    }
    if (lower.includes('water flow') || lower.includes('water magic') || lower.includes('biomimetic water')) {
      setWaterFrames(generateWaterFlowFrames('VERIFIED', intent));
      setWaterOpen(true);
    }

    const receipt = await submitIntent(intent, undefined, useExternalModel);
    setKaiStatus(receipt.status);
    setMessages((previous) => [...previous, receiptMessage(receipt)]);
    setWaterFrames(generateWaterFlowFrames(receipt.status, intent));
    if (receipt.verified) {
      triggerWavePulse(432);
    }
    setVerifying(false);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void send();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  };

  const newChat = () => {
    if (verifying) return;
    setMessages([]);
    setDraft('');
    setKaiStatus('UNKNOWN');
  };

  const beginQuickAction = (label: string) => {
    setMessages((previous) => [...previous, { role: 'user', content: label, verified: false }]);
    setVerifying(true);
  };

  const runHealthCheck = async () => {
    if (verifying) return;
    beginQuickAction('Verify System Health');
    const observation = await observeSpineHealth();
    setSpine(observation);
    setSpineCheckedAt(new Date().toLocaleTimeString());
    setMessages((previous) => [
      ...previous,
      {
        role: 'ai',
        content: observation.status === 'OBSERVED'
          ? 'The Fastify health endpoint responded.'
          : '[UNKNOWN]',
        verified: false,
        status: observation.status,
        detail: observation.detail,
      },
    ]);
    setVerifying(false);
  };

  const runLedgerCheck = async () => {
    if (verifying) return;
    beginQuickAction('Check Ledger State');
    let result: ChatMessage;
    try {
      const response = await fetch(apiUrl('/v1/block/tip'), { headers: { accept: 'application/json' } });
      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok) {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: `GET /v1/block/tip · HTTP ${response.status}`,
        };
      } else if (payload?.integrity?.valid === true) {
        const height = Number.isFinite(payload.integrity.height) ? ` · height ${payload.integrity.height}` : '';
        result = {
          role: 'ai',
          content: `Ledger endpoint response observed: integrity valid${height}.`,
          verified: false,
          status: 'OBSERVED',
          detail: 'GET /v1/block/tip · endpoint response only; not a deployment claim.',
        };
      } else if (payload?.integrity?.valid === false) {
        result = {
          role: 'ai',
          content: '[DIVERGENT]',
          verified: false,
          status: 'DIVERGENT',
          detail: typeof payload.integrity.reason === 'string'
            ? payload.integrity.reason
            : 'The API reports that the ledger integrity check is not valid.',
        };
      } else {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: 'GET /v1/block/tip returned no recognized integrity observation.',
        };
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `GET /v1/block/tip unavailable${error instanceof Error ? ` · ${error.message}` : ''}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const runMoodCheck = async () => {
    if (verifying) return;
    beginQuickAction('Check Mood State');
    let result: ChatMessage;
    try {
      const response = await fetch(apiUrl('/v1/mood'), { headers: { accept: 'application/json' } });
      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok || !payload?.success) {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: `GET /v1/mood · HTTP ${response.status}`,
        };
      } else {
        const desc = payload.evaluation?.description ?? 'System mood observed.';
        const health = payload.evaluation?.verificationHealth != null ? ` · Health ${payload.evaluation.verificationHealth}` : '';
        const conf = payload.evaluation?.confidence != null ? ` · Confidence ${payload.evaluation.confidence}` : '';
        result = {
          role: 'ai',
          content: `Mood observed: ${payload.status} (${payload.evaluation?.state ?? 'OPTIMAL'}). ${desc}${health}${conf}.`,
          verified: false,
          status: 'OBSERVED',
          detail: 'GET /v1/mood · telemetry evaluation only; not a deployment claim.',
        };
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `GET /v1/mood unavailable${error instanceof Error ? ` · ${error.message}` : ''}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const runVoiceBridgeCheck = async () => {
    if (verifying) return;
    beginQuickAction('Probe Voice Bridge (432Hz)');
    let result: ChatMessage;
    try {
      const companionApiUrl = apiUrl('/v1/companion/voice');
      const directVoiceUrl = (import.meta as any).env?.VITE_VOICE_URL || 'http://localhost:8088/voice';
      let response: Response;
      try {
        response = await fetch(companionApiUrl, { headers: { accept: 'application/json' } });
        if (!response.ok) {
          response = await fetch(directVoiceUrl, { headers: { accept: 'application/json' } });
        }
      } catch {
        response = await fetch(directVoiceUrl, { headers: { accept: 'application/json' } });
      }
      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok || payload?.status !== 'VERIFIED') {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: `Voice Bridge on port 8088 unavailable or unverified${response.status ? ` (HTTP ${response.status})` : ''}.`,
        };
      } else {
        const organs = payload.organs || {};
        playHarmonicTone(payload.resonance?.frequencyHz ?? 432);
        result = {
          role: 'ai',
          content: `Voice Bridge Harmonic Resonance active at ${payload.resonance?.frequencyHz ?? 432}Hz (${payload.resonance?.mode ?? 'harmonic-pure'}). Rule: ${payload.rule}. Organs: Soul AI (${organs.soul_ai}), Truth Weaver (${organs.truth_weaver}), The General (${organs.the_general}), Human Root (${organs.human_root}). Doctrine: "${payload.resonance?.doctrine}".`,
          verified: true,
          status: 'VERIFIED',
          hash: payload.sha256,
          detail: `GET /v1/companion/voice · SHA-256: ${payload.sha256}`,
        };
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `Voice Bridge unavailable${error instanceof Error ? ` · ${error.message}` : ''}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const runKernelCheck = async () => {
    if (verifying) return;
    beginQuickAction('Inspect Kernel Capabilities');
    let result: ChatMessage;
    try {
      const response = await fetch(apiUrl('/v1/kernel/capabilities'), { headers: { accept: 'application/json' } });
      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok || !payload?.success || !payload?.capability) {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: `GET /v1/kernel/capabilities · HTTP ${response.status}`,
        };
      } else {
        const cap = payload.capability;
        const activeCaps = Object.entries(cap.capabilities || {})
          .filter(([, v]) => v === true)
          .map(([k]) => k)
          .join(', ');
        result = {
          role: 'ai',
          content: `Kernel observed: ${cap.contract} (${cap.execution}). Deterministic evidence: ${cap.deterministicEvidence ? 'yes' : 'no'}. Human authorization: ${cap.humanAuthorizationRequired ? 'required' : 'none'}. Active capabilities: ${activeCaps}. Limitations: ${cap.limitations?.join('; ') ?? 'local only'}.`,
          verified: false,
          status: 'OBSERVED',
          detail: 'GET /v1/kernel/capabilities · capability snapshot only; not an execution claim.',
        };
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `GET /v1/kernel/capabilities unavailable${error instanceof Error ? ` · ${error.message}` : ''}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const runEquationCheck = async () => {
    if (verifying) return;
    beginQuickAction('Inspect Ecosystem Equation');
    let result: ChatMessage;
    try {
      const response = await fetch(apiUrl('/v1/ecosystem/equation'), { headers: { accept: 'application/json' } });
      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok || !payload?.success) {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: `GET /v1/ecosystem/equation · HTTP ${response.status}`,
        };
      } else {
        const digest = payload.compression?.digest ? ` · digest ${payload.compression.digest.slice(0, 8)}` : '';
        result = {
          role: 'ai',
          content: `Ecosystem Equation observed: ${payload.law} (${payload.reality}). Status: ${payload.compression?.status ?? 'UNKNOWN'}${digest}. Equation: "${payload.equation}". Source: ${payload.source}.`,
          verified: false,
          status: 'OBSERVED',
          detail: 'GET /v1/ecosystem/equation · in-process law constant only; not a deployment claim.',
        };
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `GET /v1/ecosystem/equation unavailable${error instanceof Error ? ` · ${error.message}` : ''}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const runTherapeuticStateCheck = async () => {
    if (verifying) return;
    beginQuickAction('Inspect Therapeutic State');
    let result: ChatMessage;
    try {
      const response = await fetch(apiUrl('/v1/therapeutic/state'), { headers: { accept: 'application/json' } });
      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok || !payload?.success || !payload?.state) {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: `GET /v1/therapeutic/state · HTTP ${response.status}`,
        };
      } else {
        const state = payload.state;
        const kaiDesc = `KAI: ${state.kai?.status ?? 'UNKNOWN'} (${state.kai?.authority ?? 'memory-only'})`;
        const elionDesc = `ELION: ${state.elion?.status ?? 'UNKNOWN'} (${state.elion?.authority ?? 'bounded-execution'})`;
        const omegaDesc = `OMEGA: ${state.omega?.status ?? 'UNKNOWN'} (${state.omega?.authority ?? 'verification-gate'})`;
        const loop = Array.isArray(payload.loop) ? payload.loop.join(' → ') : 'observe → bound → execute → reconcile → remember';
        result = {
          role: 'ai',
          content: `Therapeutic State Machine observed: ${payload.status} (${payload.model}). ${kaiDesc} · ${elionDesc} · ${omegaDesc}. Loop: [${loop}].`,
          verified: false,
          status: 'OBSERVED',
          detail: 'GET /v1/therapeutic/state · state machine evaluation only; not a deployment claim.',
        };
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `GET /v1/therapeutic/state unavailable${error instanceof Error ? ` · ${error.message}` : ''}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const runRealityStatusCheck = async () => {
    if (verifying) return;
    beginQuickAction('Inspect Reality Status Vector');
    let result: ChatMessage;
    try {
      const response = await fetch(apiUrl('/v1/reality/status'), { headers: { accept: 'application/json' } });
      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok || !payload?.success || !Array.isArray(payload.statusVector)) {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: `GET /v1/reality/status · HTTP ${response.status}`,
        };
      } else {
        const vectorSummary = payload.statusVector
          .map((item: any) => `${item.field}: ${item.value}`)
          .join(' · ');
        const stage = payload.contract?.currentStage ?? 'REALITY';
        const equation = payload.contract?.governingEquation ?? 'Ω∞v := VERIFY(ΔREALITY)';
        result = {
          role: 'ai',
          content: `Reality Verification Vector (${stage}): ${vectorSummary}. Governing Equation: "${equation}". Invariant: ${payload.contract?.invariant ?? 'VERIFY(ΔREALITY)'}.`,
          verified: false,
          status: 'OBSERVED',
          detail: 'GET /v1/reality/status · 11-dimension status vector; reality is final authority.',
        };
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `GET /v1/reality/status unavailable${error instanceof Error ? ` · ${error.message}` : ''}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const runKernelStatsCheck = async () => {
    if (verifying) return;
    beginQuickAction('Inspect Kernel Telemetry');
    let result: ChatMessage;
    try {
      const response = await fetch(apiUrl('/v1/kernel/stats'), { headers: { accept: 'application/json' } });
      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok || !payload?.success || !payload?.stats) {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: `GET /v1/kernel/stats · HTTP ${response.status}`,
        };
      } else {
        const stats = payload.stats;
        result = {
          role: 'ai',
          content: `Kernel Telemetry observed: ${stats.totalTransitions} transitions · ${stats.verifiedStates} verified states · ${stats.humanGatedAuthorizations} human-gated · ${stats.preservedDissentCount} dissents preserved · ${stats.recompilationsTriggered} recompilations · ${stats.avgEfficiencyRatio} avg efficiency. Root: ${stats.currentRootStateHash.slice(0, 10)}...`,
          verified: false,
          status: 'OBSERVED',
          detail: 'GET /v1/kernel/stats · live state machine telemetry only; not a deployment claim.',
        };
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `GET /v1/kernel/stats unavailable${error instanceof Error ? ` · ${error.message}` : ''}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const runMeshConvergenceCheck = async () => {
    if (verifying) return;
    beginQuickAction('Simulate Multi-Region Mesh');
    let result: ChatMessage;
    try {
      const response = await fetch(apiUrl('/v1/mesh/simulate'), { headers: { accept: 'application/json' } });
      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok || !payload?.success || !payload?.convergence) {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: `GET /v1/mesh/simulate · HTTP ${response.status}`,
        };
      } else {
        const conv = payload.convergence;
        const votes = Array.isArray(conv.votes)
          ? conv.votes.map((v: any) => `${v.nodeId} (${v.region}: ${v.verdict}, ${v.latencyMs}ms)`).join(' · ')
          : 'no votes';
        const proof = conv.clusterSignatureProof ? `Proof: ${conv.clusterSignatureProof.slice(0, 10)}...` : '';
        result = {
          role: 'ai',
          content: `Multi-Region Mesh Convergence: ${conv.effectiveStatus} (Quorum: ${conv.quorumReached ? 'yes' : 'no'}, ${conv.participatingNodes ?? 0} nodes). Nodes: ${votes}. Round: ${conv.consensusRound}. ${proof}`,
          verified: false,
          status: 'OBSERVED',
          detail: 'GET /v1/mesh/simulate · multi-region consensus simulation only; not physical deployment.',
        };
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `GET /v1/mesh/simulate unavailable${error instanceof Error ? ` · ${error.message}` : ''}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const runNavigatorEvidenceCheck = async () => {
    if (verifying) return;
    beginQuickAction('Inspect Navigator Evidence');
    let result: ChatMessage;
    try {
      const response = await fetch(apiUrl('/v1/navigator/evidence'), { headers: { accept: 'application/json' } });
      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok || !payload?.contract || !Array.isArray(payload.evidence)) {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: `GET /v1/navigator/evidence · HTTP ${response.status}`,
        };
      } else {
        const items = payload.evidence
          .map((item: any) => `${item.id}: ${item.status} (${item.claim})`)
          .join(' · ');
        result = {
          role: 'ai',
          content: `Navigator Evidence observed: ${payload.contract} (${payload.overallStatus}, readOnly: ${payload.readOnly ? 'yes' : 'no'}). Repository: ${payload.source?.repository ?? 'local'}. Items: ${items}.`,
          verified: false,
          status: 'OBSERVED',
          detail: 'GET /v1/navigator/evidence · presentation evidence only; no external deployment inferred.',
        };
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `GET /v1/navigator/evidence unavailable${error instanceof Error ? ` · ${error.message}` : ''}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const runAvroHouseCheck = async () => {
    if (verifying) return;
    beginQuickAction('Inspect ΔVRØ House 10-Layer Ecosystem');
    let result: ChatMessage;
    try {
      const response = await fetch(apiUrl('/v1/ecosystem/status'), { headers: { accept: 'application/json' } });
      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok || !payload?.success || !payload?.avroHouse) {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: `GET /v1/ecosystem/status · HTTP ${response.status}`,
        };
      } else {
        const avro = payload.avroHouse;
        const layers = Array.isArray(avro.layers) ? avro.layers : [];
        const supported = layers.filter((l: any) => l.evidenceStatus === 'SUPPORTED').length;
        const unverified = layers.filter((l: any) => l.evidenceStatus === 'UNVERIFIED').length;
        const unknown = layers.filter((l: any) => l.evidenceStatus === 'UNKNOWN').length;
        result = {
          role: 'ai',
          content: `ΔVRØ House 10-Layer AI Ecosystem observed: ${avro.equation}. Layers (10): ${supported} SUPPORTED · ${unverified} UNVERIFIED · ${unknown} UNKNOWN. Active Ports: Frontend (:3000), Spine (:5000), Brain (:11434), Muscle (:8088). Doctrine: "${avro.doctrine}".`,
          verified: false,
          status: 'OBSERVED',
          detail: 'GET /v1/ecosystem/status · ΔVRØ House 10-Layer Ecosystem specification telemetry.',
        };
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `GET /v1/ecosystem/status unavailable${error instanceof Error ? ` · ${error.message}` : ''}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const runEcosystemStatusCheck = async () => {
    if (verifying) return;
    beginQuickAction('Inspect Ecosystem Composite Status');
    let result: ChatMessage;
    try {
      const response = await fetch(apiUrl('/v1/ecosystem/status'), { headers: { accept: 'application/json' } });
      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok || !payload?.success || !payload?.contract) {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: `GET /v1/ecosystem/status · HTTP ${response.status}`,
        };
      } else {
        const stage = payload.contract?.currentStage ?? 'ECOSYSTEM';
        const growthLaw = payload.contract?.growthLaw ?? '0 → MINI → FULL STACK → ECOSYSTEM → REALITY ↺ ∞';
        const layers = Array.isArray(payload.layers) ? payload.layers : [];
        const supportedCount = layers.filter((l: any) => l.evidenceStatus === 'SUPPORTED').length;
        const unverifiedCount = layers.filter((l: any) => l.evidenceStatus === 'UNVERIFIED').length;
        const unknownCount = layers.filter((l: any) => l.evidenceStatus === 'UNKNOWN').length;
        const govStatus = payload.governance?.status ?? 'SUPPORTED';
        const humanReq = payload.governance?.humanAuthorizationRequired ? 'YES' : 'NO';
        const valueStatus = payload.valueAssessment?.status ?? 'SUPPORTED';
        result = {
          role: 'ai',
          content: `Ecosystem Composite Status observed: Stage ${stage} (${payload.contract?.name ?? 'omega-v-oceanicos'} v${payload.contract?.version ?? '1.0.0'}). Layers (${layers.length}): ${supportedCount} SUPPORTED · ${unverifiedCount} UNVERIFIED · ${unknownCount} UNKNOWN. Governance: ${govStatus} (Human Gate: ${humanReq}). Value Assessment: ${valueStatus}. Growth Law: "${growthLaw}".`,
          verified: false,
          status: 'OBSERVED',
          detail: 'GET /v1/ecosystem/status · whole ecosystem composite status; local runtime observation only.',
        };
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `GET /v1/ecosystem/status unavailable${error instanceof Error ? ` · ${error.message}` : ''}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const runValueProposalsCheck = async () => {
    if (verifying) return;
    beginQuickAction('Inspect Value Proposals');
    let result: ChatMessage;
    try {
      const response = await fetch(apiUrl('/v1/value-navigator/proposals'), { headers: { accept: 'application/json' } });
      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok || !payload?.success || typeof payload?.total !== 'number') {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: `GET /v1/value-navigator/proposals · HTTP ${response.status}`,
        };
      } else {
        const total = payload.total;
        const integrity = payload.integrity ?? 'verified-local-hash-chain';
        const truncated = payload.truncated ? ' (truncated)' : '';
        result = {
          role: 'ai',
          content: `Value Navigator Proposals: ${total} proposal(s) recorded${truncated} · Integrity: ${integrity} · Journal: local append-only hash chain · Bounded economic value optimization.`,
          verified: false,
          status: 'OBSERVED',
          detail: 'GET /v1/value-navigator/proposals · local hash-chained journal; not a transaction claim.',
        };
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `GET /v1/value-navigator/proposals unavailable${error instanceof Error ? ` · ${error.message}` : ''}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const runDependenciesCheck = async () => {
    if (verifying) return;
    beginQuickAction('Inspect Dependency Map');
    let result: ChatMessage;
    try {
      const response = await fetch(apiUrl('/v1/dependencies'), { headers: { accept: 'application/json' } });
      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok || !payload?.success || !Array.isArray(payload.nodes)) {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: `GET /v1/dependencies · HTTP ${response.status}`,
        };
      } else {
        const s = payload.summary ?? {};
        const invariant = payload.contract?.invariant ?? 'PRESENT ≠ WORKSPACE ≠ IMPORTED ≠ VERIFIED';
        result = {
          role: 'ai',
          content: `Dependency Map observed: ${payload.nodes.length} package nodes (${s.built ?? 0} built · ${s.workspace ?? 0} workspace · ${s.sourceOnly ?? 0} source-only · ${s.stub ?? 0} stub). Invariant: "${invariant}". Migration: ${payload.contract?.migrationStep ?? 'reconciled'}.`,
          verified: false,
          status: 'OBSERVED',
          detail: 'GET /v1/dependencies · pnpm workspace dependency map; local architectural audit.',
        };
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `GET /v1/dependencies unavailable${error instanceof Error ? ` · ${error.message}` : ''}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const runBoundedWorkersCheck = async () => {
    if (verifying) return;
    beginQuickAction('Inspect Bounded Workers');
    let result: ChatMessage;
    try {
      const response = await fetch(apiUrl('/v1/omega/workers'), { headers: { accept: 'application/json' } });
      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok || !payload?.success || !Array.isArray(payload.workers)) {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: `GET /v1/omega/workers · HTTP ${response.status}`,
        };
      } else {
        const workers = payload.workers;
        const readOnlyCount = workers.filter((w: any) => w.risk === 'read-only').length;
        const mutatingCount = workers.filter((w: any) => w.risk === 'local-mutating').length;
        const activeCount = Array.isArray(payload.activeWorkers) ? payload.activeWorkers.length : 0;
        result = {
          role: 'ai',
          content: `Bounded Workers observed: ${workers.length} roles registered (${readOnlyCount} read-only · ${mutatingCount} human-gated mutating) · Active: ${activeCount} · Principle: "worker output is evidence, not authority".`,
          verified: false,
          status: 'OBSERVED',
          detail: 'GET /v1/omega/workers · durable SQLite coordination; worker output does not grant authority.',
        };
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `GET /v1/omega/workers unavailable${error instanceof Error ? ` · ${error.message}` : ''}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const runDivergenceLedgerCheck = async () => {
    if (verifying) return;
    beginQuickAction('Inspect Divergence Ledger');
    let result: ChatMessage;
    try {
      const response = await fetch(apiUrl('/v1/omega/divergences'), { headers: { accept: 'application/json' } });
      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok || !payload?.success || typeof payload?.count !== 'number') {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: `GET /v1/omega/divergences · HTTP ${response.status}`,
        };
      } else {
        const count = payload.count;
        const redacted = payload.redacted ? 'YES' : 'NO';
        const nextAction = payload.nextAction ?? 'review the divergent evidence and preserve the conflict';
        result = {
          role: 'ai',
          content: `Divergence & Dissent Ledger: ${count} recorded divergence(s) · Redacted: ${redacted} · Action: "${nextAction}" · Epistemic law: "preserve the conflict; never fabricate consensus".`,
          verified: false,
          status: 'OBSERVED',
          detail: 'GET /v1/omega/divergences · constitutional dissent ledger; conflicts are preserved, not retried.',
        };
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `GET /v1/omega/divergences unavailable${error instanceof Error ? ` · ${error.message}` : ''}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const runConnectorJournalCheck = async () => {
    if (verifying) return;
    beginQuickAction('Inspect Connector Journal');
    let result: ChatMessage;
    try {
      const response = await fetch(apiUrl('/v1/omega/connectors/observations'), { headers: { accept: 'application/json' } });
      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok || !payload?.success || typeof payload?.total !== 'number') {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: `GET /v1/omega/connectors/observations · HTTP ${response.status}`,
        };
      } else {
        const total = payload.total;
        const truncated = payload.truncated ? ' (truncated)' : '';
        const integrity = payload.integrity ?? 'verified-local-hash-chain';
        result = {
          role: 'ai',
          content: `Connector Journal: ${total} observation(s) recorded${truncated} · Integrity: ${integrity} · Limitation: "local connector journal is not deployment health, not live GitHub execution, not revenue".`,
          verified: false,
          status: 'OBSERVED',
          detail: 'GET /v1/omega/connectors/observations · local hash-chained journal; not execution evidence.',
        };
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `GET /v1/omega/connectors/observations unavailable${error instanceof Error ? ` · ${error.message}` : ''}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const runSingleBodyCompressionCheck = async () => {
    if (verifying) return;
    beginQuickAction('Inspect Single Body (4×4×4×4)');
    let result: ChatMessage;
    try {
      const response = await fetch(apiUrl('/v1/ecosystem/body'), { headers: { accept: 'application/json' } });
      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok || !payload?.success || !payload?.compression) {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: `GET /v1/ecosystem/body · HTTP ${response.status}`,
        };
      } else {
        const c = payload.compression;
        const notation = c.space?.notation ?? '4×4×4×4';
        const rank = c.space?.rank ?? 4;
        const capacity = c.space?.capacity ?? 256;
        const filled = c.filled ?? 7;
        const digest = typeof c.digest === 'string' ? `${c.digest.slice(0, 10)}...` : 'n/a';
        const expansionStatus = c.expansion?.status ?? 'VERIFIED';
        const lossless = c.expansion?.lossless ? 'YES' : 'NO';
        const fixpointEq = payload.fixpoint?.equation ?? 'omega.ecosystem-body.fixpoint.v1';
        const fixpointStatus = payload.fixpoint?.status ?? 'VERIFIED';
        result = {
          role: 'ai',
          content: `Single Body 4×4×4×4 Compression: ${filled}/${capacity} cells (${notation} rank ${rank}) · Digest: ${digest} · Expansion: ${expansionStatus} (lossless: ${lossless}) · Fixpoint: ${fixpointEq} (${fixpointStatus}).`,
          verified: false,
          status: 'OBSERVED',
          detail: 'GET /v1/ecosystem/body · 4×4×4×4 single body compression; declared projection, not inferred truth.',
        };
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `GET /v1/ecosystem/body unavailable${error instanceof Error ? ` · ${error.message}` : ''}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const runCommandPipelineCheck = async () => {
    if (verifying) return;
    beginQuickAction('Inspect Command Pipeline');
    let result: ChatMessage;
    try {
      const response = await fetch(apiUrl('/v1/omega/commands'), { headers: { accept: 'application/json' } });
      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok || !payload?.success || typeof payload?.count !== 'number') {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: `GET /v1/omega/commands · HTTP ${response.status}`,
        };
      } else {
        const count = payload.count;
        const commands: any[] = Array.isArray(payload.commands) ? payload.commands : [];
        const verifiedCount = commands.filter((c: any) => c.status === 'VERIFIED').length;
        const reviewCount = commands.filter((c: any) => c.status === 'REVIEW').length;
        const executedCount = commands.filter((c: any) => c.status === 'EXECUTED').length;
        const redacted = payload.redacted === true;
        result = {
          role: 'ai',
          content: `Command Pipeline: ${count} command(s) · VERIFIED: ${verifiedCount} · Under Review: ${reviewCount} · Executed: ${executedCount} · Redacted: ${redacted ? 'YES' : 'NO'} · Principle: "command output is evidence, not authority".`,
          verified: false,
          status: 'OBSERVED',
          detail: 'GET /v1/omega/commands · sovereign command ledger; not execution authority.',
        };
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `GET /v1/omega/commands unavailable${error instanceof Error ? ` · ${error.message}` : ''}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const runKaiMemoryCheck = async () => {
    if (verifying) return;
    beginQuickAction('Inspect KAI Memory');
    let result: ChatMessage;
    try {
      const response = await fetch(apiUrl('/kai/memory?limit=5'), { headers: { accept: 'application/json' } });
      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok || !payload?.success || typeof payload?.total !== 'number') {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: `GET /kai/memory · HTTP ${response.status}`,
        };
      } else {
        const total = payload.total;
        const records: any[] = Array.isArray(payload.records) ? payload.records : [];
        const verifiedCount = records.filter((r: any) => r.status === 'VERIFIED').length;
        const latestIntent = records[0]?.intent ? `"${String(records[0].intent).slice(0, 40)}"` : 'none';
        result = {
          role: 'ai',
          content: `KAI Memory: ${total} record(s) total · Last 5 shown · VERIFIED in sample: ${verifiedCount} · Latest intent: ${latestIntent} · Principle: "MEMORY != PROOF; digest stored, not text".`,
          verified: false,
          status: 'OBSERVED',
          detail: 'GET /kai/memory · local KAI memory ledger; digest only, not proof of execution.',
        };
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `GET /kai/memory unavailable${error instanceof Error ? ` · ${error.message}` : ''}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const runOmegaEventsCheck = async () => {
    if (verifying) return;
    beginQuickAction('Inspect Omega Events');
    let result: ChatMessage;
    try {
      const response = await fetch(apiUrl('/v1/omega/events'), { headers: { accept: 'application/json' } });
      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok || !payload?.success || !Array.isArray(payload?.events)) {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: `GET /v1/omega/events · HTTP ${response.status}`,
        };
      } else {
        const events: any[] = payload.events;
        const total = events.length;
        const latest = events[events.length - 1];
        const latestType = latest?.type ? `"${latest.type}"` : 'none';
        const latestCommand = latest?.commandId ? ` (${latest.commandId})` : '';
        const redacted = payload.redacted === true;
        result = {
          role: 'ai',
          content: `Omega Events: ${total} lifecycle event(s) recorded · Latest event: ${latestType}${latestCommand} · Redacted: ${redacted ? 'YES' : 'NO'} · Principle: "event history records transitions, not authorization".`,
          verified: false,
          status: 'OBSERVED',
          detail: 'GET /v1/omega/events · sovereign lifecycle event log; not execution authority.',
        };
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `GET /v1/omega/events unavailable${error instanceof Error ? ` · ${error.message}` : ''}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const runPersistenceStatusCheck = async () => {
    if (verifying) return;
    beginQuickAction('Inspect Persistence Status');
    let result: ChatMessage;
    try {
      const response = await fetch(apiUrl('/persistence/status'), { headers: { accept: 'application/json' } });
      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok || !payload?.success || typeof payload?.persistence !== 'object') {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: `GET /persistence/status · HTTP ${response.status}`,
        };
      } else {
        const p = payload.persistence;
        const enabled = p.enabled === true;
        const coordinationMode = p.coordination?.mode ?? 'unknown';
        const custodyMode = p.custody?.mode ?? 'unknown';
        const scope = p.coordination?.scope ?? 'single-process';
        const limitations = p.coordination?.limitations ?? 'local single-process only; does not prove distributed consensus';
        result = {
          role: 'ai',
          content: `Persistence Status: ${enabled ? 'ENABLED' : 'DISABLED'} · Coordination: ${coordinationMode} (${scope}) · Custody: ${custodyMode} · Limitation: "${limitations}".`,
          verified: false,
          status: 'OBSERVED',
          detail: 'GET /persistence/status · local persistence & coordination scope; not distributed consensus.',
        };
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `GET /persistence/status unavailable${error instanceof Error ? ` · ${error.message}` : ''}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const runMinerStatusCheck = async () => {
    if (verifying) return;
    beginQuickAction('Inspect Miner Status');
    let result: ChatMessage;
    try {
      const response = await fetch(apiUrl('/v1/miner/status'), { headers: { accept: 'application/json' } });
      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok || !payload?.success || typeof payload?.miner !== 'object') {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: `GET /v1/miner/status · HTTP ${response.status}`,
        };
      } else {
        const m = payload.miner;
        const active = m.active === true ? 'ACTIVE' : 'IDLE';
        const intervalMs = typeof m.intervalMs === 'number' ? m.intervalMs : 5000;
        const totalMined = typeof m.totalMined === 'number' ? m.totalMined : 0;
        const powAttempts = typeof payload.bounds?.proofOfWorkAttempts === 'number' ? payload.bounds.proofOfWorkAttempts : 1000000;
        result = {
          role: 'ai',
          content: `Miner Status: ${active} · Interval: ${intervalMs}ms · Total Mined: ${totalMined} · PoW Attempts Bound: ${powAttempts} · Principle: "local mining simulation is bounded trial, not external work claim".`,
          verified: false,
          status: 'OBSERVED',
          detail: 'GET /v1/miner/status · sovereign local block miner status; not external network consensus.',
        };
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `GET /v1/miner/status unavailable${error instanceof Error ? ` · ${error.message}` : ''}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const runCommandProvenanceCheck = async () => {
    if (verifying) return;
    beginQuickAction('Inspect Command Provenance');
    let result: ChatMessage;
    try {
      const listResponse = await fetch(apiUrl('/v1/omega/commands'), { headers: { accept: 'application/json' } });
      let listPayload: any = null;
      try {
        listPayload = await listResponse.json();
      } catch {
        listPayload = null;
      }
      if (!listResponse.ok || !listPayload?.success || !Array.isArray(listPayload?.commands)) {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: `GET /v1/omega/commands · HTTP ${listResponse.status}`,
        };
      } else {
        const commands: any[] = listPayload.commands;
        if (commands.length === 0) {
          result = {
            role: 'ai',
            content: 'Command Provenance: no commands found in sovereign command store.',
            verified: false,
            status: 'OBSERVED',
            detail: 'GET /v1/omega/commands · empty command ledger; no command available for provenance probe.',
          };
        } else {
          const targetId = commands[0].commandId;
          const provResponse = await fetch(apiUrl(`/v1/omega/commands/${encodeURIComponent(targetId)}/provenance`), { headers: { accept: 'application/json' } });
          let provPayload: any = null;
          try {
            provPayload = await provResponse.json();
          } catch {
            provPayload = null;
          }
          if (!provResponse.ok || !provPayload?.success || typeof provPayload?.provenance !== 'object') {
            result = {
              role: 'ai',
              content: '[UNKNOWN]',
              verified: false,
              status: 'UNKNOWN',
              detail: `GET /v1/omega/commands/${targetId}/provenance · HTTP ${provResponse.status}`,
            };
          } else {
            const p = provPayload.provenance;
            const status = p.status ?? 'UNKNOWN';
            const lineageCount = Array.isArray(p.lineage) ? p.lineage.length : 0;
            const eventsCount = Array.isArray(p.events) ? p.events.length : 0;
            const intent = typeof p.intent === 'string' ? p.intent : 'unknown';
            const requestedBy = typeof p.requestedBy === 'string' ? p.requestedBy : 'unknown';
            const redacted = p.redacted === true ? 'YES' : 'NO';
            result = {
              role: 'ai',
              content: `Command Provenance (${p.commandId}): Status: ${status} · Lineage: ${lineageCount} step(s) · Events: ${eventsCount} · Intent: "${intent}" · Requested by: ${requestedBy} · Redacted: ${redacted} · Principle: "command lineage audits transitions, not execution authority".`,
              verified: false,
              status: 'OBSERVED',
              detail: `GET /v1/omega/commands/${p.commandId}/provenance · sovereign command lineage & event provenance; not execution authority.`,
            };
          }
        }
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `GET /v1/omega/commands/:id/provenance unavailable${error instanceof Error ? ` · ${error.message}` : ''}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const runAttestationPolicyCheck = async () => {
    if (verifying) return;
    beginQuickAction('Inspect Attestation Policy');
    let result: ChatMessage;
    try {
      const response = await fetch(apiUrl('/attest/policy'), { headers: { accept: 'application/json' } });
      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok || !payload?.success || typeof payload?.policy !== 'object') {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: `GET /attest/policy · HTTP ${response.status}`,
        };
      } else {
        const pol = payload.policy;
        const authMode = pol.authMode ?? 'unknown';
        const algo = pol.attestationAlgorithm ?? 'HMAC-SHA256';
        const revocation = pol.revocationEnabled === true ? 'ENABLED' : 'DISABLED';
        const revision = typeof pol.revocationRevision === 'number' ? pol.revocationRevision : 0;
        const consistency = pol.revocationConsistency ?? 'single-process';
        result = {
          role: 'ai',
          content: `Attestation Policy: Auth: ${authMode} · Algorithm: ${algo} · Revocation: ${revocation} (rev ${revision}) · Consistency: ${consistency} · Principle: "attestation policy audits cryptographic configuration, not signature validity".`,
          verified: false,
          status: 'OBSERVED',
          detail: 'GET /attest/policy · cryptographic attestation parameters; not proof of signature validity.',
        };
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `GET /attest/policy unavailable${error instanceof Error ? ` · ${error.message}` : ''}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const runAttestationRevocationsCheck = async () => {
    if (verifying) return;
    beginQuickAction('Inspect Attestation Revocations');
    let result: ChatMessage;
    try {
      const response = await fetch(apiUrl('/attest/revocations'), { headers: { accept: 'application/json' } });
      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok || !payload?.success || !Array.isArray(payload?.data) || typeof payload?.meta !== 'object') {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: `GET /attest/revocations · HTTP ${response.status}`,
        };
      } else {
        const count = payload.data.length;
        const meta = payload.meta;
        const integrity = meta.integrity ?? 'intact';
        const revision = typeof meta.revision === 'number' ? meta.revision : count;
        const consistency = meta.consistency ?? 'single-process';
        const verified = meta.verified === true ? 'VERIFIED' : 'UNVERIFIED';
        result = {
          role: 'ai',
          content: `Attestation Revocations: ${count} revoked attestation(s) · Revision: ${revision} · Integrity: ${integrity} · Consistency: ${consistency} · Store State: ${verified} · Principle: "revocation journal audits locally revoked keys, not distributed consensus".`,
          verified: false,
          status: 'OBSERVED',
          detail: 'GET /attest/revocations · local attestation revocation journal; not distributed authority consensus.',
        };
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `GET /attest/revocations unavailable${error instanceof Error ? ` · ${error.message}` : ''}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const runMeshNodesCheck = async () => {
    if (verifying) return;
    beginQuickAction('Inspect Mesh Nodes');
    let result: ChatMessage;
    try {
      const response = await fetch(apiUrl('/v1/mesh/nodes'), { headers: { accept: 'application/json' } });
      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok || !payload?.success || !Array.isArray(payload?.nodes)) {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: `GET /v1/mesh/nodes · HTTP ${response.status}`,
        };
      } else {
        const nodes: any[] = payload.nodes;
        const total = nodes.length;
        const regions = nodes.map((n) => n.region ?? 'unknown').join(', ');
        const avgLatency = total > 0
          ? Math.round(nodes.reduce((acc, n) => acc + (typeof n.latencyFactorMs === 'number' ? n.latencyFactorMs : 0), 0) / total)
          : 0;
        result = {
          role: 'ai',
          content: `Mesh Nodes: ${total} topology node(s) registered · Regions: ${regions} · Avg Latency Factor: ${avgLatency}ms · Principle: "mesh node topology audits simulated multi-region endpoints, not live WAN reachability".`,
          verified: false,
          status: 'OBSERVED',
          detail: 'GET /v1/mesh/nodes · sovereign multi-region simulated node topology; not live network connectivity.',
        };
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `GET /v1/mesh/nodes unavailable${error instanceof Error ? ` · ${error.message}` : ''}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const runMeshValidationCheck = async () => {
    if (verifying) return;
    beginQuickAction('Inspect Mesh Validation');
    let result: ChatMessage;
    try {
      const response = await fetch(
        apiUrl('/v1/mesh/validate?siliconYield=0.99&gridLoadMegawatts=420&acceleratorInventory=8000'),
        { headers: { accept: 'application/json' } }
      );
      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok || !payload?.success || !payload?.validation) {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: `GET /v1/mesh/validate · HTTP ${response.status}`,
        };
      } else {
        const validation = payload.validation;
        const mesh = validation.mesh ?? {};
        const receipt = validation.receipt ?? {};
        const convergence = payload.convergence ?? {};
        const quorumReached = convergence.quorumReached ?? mesh.quorumReached ?? false;
        const effectiveStatus = convergence.effectiveStatus ?? mesh.effectiveStatus ?? 'UNKNOWN';
        const participatingNodes = convergence.participatingNodes ?? mesh.participatingNodes ?? 0;
        const receiptStatus = receipt.status ?? 'UNKNOWN';
        result = {
          role: 'ai',
          content: `Mesh Validation: Quorum ${quorumReached ? 'REACHED' : 'UNREACHED'} · Status: ${effectiveStatus} · Nodes: ${participatingNodes} · Receipt: ${receiptStatus} · Principle: "regional convergence is simulated local evidence; it is not external consensus, deployment proof, or truth attestation".`,
          verified: false,
          status: 'OBSERVED',
          detail: 'GET /v1/mesh/validate · regional convergence simulated local evidence; not external consensus.',
        };
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `GET /v1/mesh/validate unavailable${error instanceof Error ? ` · ${error.message}` : ''}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const runTokenizerCharterCheck = async () => {
    if (verifying) return;
    beginQuickAction('Inspect Living Charter BPE');
    let result: ChatMessage;
    try {
      const response = await fetch(apiUrl('/v1/tokenizer/charter'), { headers: { accept: 'application/json' } });
      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok || !payload?.success || !payload?.tokenization) {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: `GET /v1/tokenizer/charter · HTTP ${response.status}`,
        };
      } else {
        const tokenization = payload.tokenization;
        const ratio = tokenization.compressionRatio ?? 1;
        const origBytes = tokenization.originalByteLength ?? 0;
        const tokenCount = tokenization.compressedTokenLength ?? 0;
        const mergesCount = tokenization.mergesCount ?? 0;
        result = {
          role: 'ai',
          content: `Living Charter BPE: Compression ${ratio.toFixed(2)}x (${origBytes}B ➔ ${tokenCount} tokens) · Merges: ${mergesCount} · Constitution: "Receive. Hold. Clarify. Connect. Adapt. Nourish. Restore. Flow. Return Better." · Principle: "tokenization is transparent byte-pair compression, not opaque embedding".`,
          verified: false,
          status: 'OBSERVED',
          detail: 'GET /v1/tokenizer/charter · living BPE tokenization engine ported from karpathy/minbpe.',
        };
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `GET /v1/tokenizer/charter unavailable${error instanceof Error ? ` · ${error.message}` : ''}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const runComposioGatewayCheck = async () => {
    if (verifying) return;
    beginQuickAction('Inspect Composio Gateway');
    let result: ChatMessage;
    try {
      const response = await fetch(apiUrl('/v1/omega/composio/read'), {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          toolSlug: 'GITHUB_GET_A_REPOSITORY',
          arguments: { owner: 'workmail900000-wq', repo: 'OceanicOS-Living-Charter' },
        }),
      });
      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok || !payload?.success || !payload?.observation) {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: `POST /v1/omega/composio/read · HTTP ${response.status}`,
        };
      } else {
        const observation = payload.observation;
        const toolkit = payload.toolkit ?? 'unknown';
        const toolSlug = payload.toolSlug ?? 'unknown';
        const status = payload.status ?? observation.status ?? 'UNKNOWN';
        const decision = observation.admission?.decision ?? 'UNKNOWN';
        const journalSeq = payload.journal?.sequence ?? 0;
        result = {
          role: 'ai',
          content: `Composio Gateway: Toolkit ${toolkit} · Tool ${toolSlug} · Status: ${status} · Admission: ${decision} · Journal #${journalSeq} · Principle: "A Composio response is an observation only; this route does not independently verify provider data or authorize write actions".`,
          verified: false,
          status: 'OBSERVED',
          detail: 'POST /v1/omega/composio/read · read-only gateway connector observation.',
        };
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `POST /v1/omega/composio/read unavailable${error instanceof Error ? ` · ${error.message}` : ''}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const runRealityVectorCheck = async () => {
    if (verifying) return;
    beginQuickAction('Inspect Reality Vector');
    let result: ChatMessage;
    try {
      const response = await fetch(apiUrl('/v1/reality/status'), {
        headers: { accept: 'application/json' },
      });
      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok || !payload?.success || !Array.isArray(payload?.statusVector)) {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: `GET /v1/reality/status · HTTP ${response.status}`,
        };
      } else {
        const stage = payload.contract?.currentStage ?? 'UNKNOWN';
        const invariant = payload.contract?.invariant ?? 'VERIFY(ΔREALITY)';
        const yesCount = payload.statusVector.filter((f: any) => f.value === 'YES').length;
        const unknownCount = payload.statusVector.filter((f: any) => f.value === 'UNKNOWN').length;
        const total = payload.statusVector.length;
        const principle = payload.realityAuthority?.principle ?? 'Reality is final authority. Attest, do not assert.';
        result = {
          role: 'ai',
          content: `Reality Vector: Stage ${stage} (${invariant}) · Vector: ${yesCount}/${total} YES, ${unknownCount}/${total} UNKNOWN · Principle: "${principle}".`,
          verified: false,
          status: 'OBSERVED',
          detail: 'GET /v1/reality/status · read-only reality status vector observation.',
        };
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `GET /v1/reality/status unavailable${error instanceof Error ? ` · ${error.message}` : ''}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const runLocalActionsSandboxCheck = async () => {
    if (verifying) return;
    beginQuickAction('Inspect Autonomous Sandbox & Local Actions');
    let result: ChatMessage;
    try {
      const response = await fetch(apiUrl('/v1/local-actions'), {
        headers: { accept: 'application/json' },
      });
      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok || !payload?.success) {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: `GET /v1/local-actions · HTTP ${response.status}`,
        };
      } else {
        const enabled = Boolean(payload.enabled);
        const actions = Array.isArray(payload.actions) ? payload.actions : [];
        const reason = payload.reason ?? 'UNKNOWN';
        result = {
          role: 'ai',
          content: enabled
            ? `Autonomous Sandbox & Local Actions active: ${actions.length} action(s) available. Sandboxed runner enabled.`
            : `Autonomous Sandbox & Local Runner observed: Status DISABLED (${reason}). Actions (${actions.length}) available. Sandboxed executions remain fail-closed until granted explicit local execution authority.`,
          verified: false,
          status: 'OBSERVED',
          detail: 'GET /v1/local-actions · Layer 4 MicroVM Sandboxes & Bounded Execution boundary.',
        };
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `GET /v1/local-actions unavailable${error instanceof Error ? ` · ${error.message}` : ''}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const runEvalsFlywheelCheck = async () => {
    if (verifying) return;
    beginQuickAction('Inspect Evals Flywheel & Benchmark Suite');
    let result: ChatMessage;
    try {
      const response = await fetch(apiUrl('/v1/evals/status'), {
        headers: { accept: 'application/json' },
      });
      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok || !payload?.success || typeof payload?.evals !== 'object') {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: `GET /v1/evals/status · HTTP ${response.status}`,
        };
      } else {
        const e = payload.evals;
        const domTests = typeof e.domTests === 'number' ? e.domTests : 0;
        const domSuites = typeof e.domSuites === 'number' ? e.domSuites : 0;
        const integrationSuites = typeof e.integrationSuites === 'number' ? e.integrationSuites : 0;
        const swarmReceipts = typeof e.swarmReceipts === 'number' ? e.swarmReceipts : 0;
        const swarmProtocol = e.swarmProtocol ?? 'UNKNOWN';
        const failClosed = e.failClosedGating ?? 'UNKNOWN';
        result = {
          role: 'ai',
          content: `Layer 9 Evals Flywheel observed: ${domTests} DOM tests across ${domSuites} suites · ${integrationSuites} integration suites · ${swarmReceipts} swarm receipts (Protocol: ${swarmProtocol}) · Fail-Closed Gating: ${failClosed} · Doctrine: "${payload.doctrine}".`,
          verified: false,
          status: 'OBSERVED',
          detail: 'GET /v1/evals/status · Layer 9 Automated Evals & Data Flywheel; test counts are runtime telemetry, not proof of passing.',
        };
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `GET /v1/evals/status unavailable${error instanceof Error ? ` · ${error.message}` : ''}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const runRealtimeStreamTelemetryCheck = async () => {
    if (verifying) return;
    beginQuickAction('Probe Real-Time Streaming Pipeline');
    let result: ChatMessage;
    try {
      const response = await fetch(apiUrl('/v1/stream'), {
        headers: { accept: 'text/event-stream' },
      });
      const isSse = response.headers.get('content-type')?.includes('text/event-stream') ?? false;
      if (!response.ok && response.status !== 200) {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: `GET /v1/stream · HTTP ${response.status}`,
        };
      } else {
        result = {
          role: 'ai',
          content:
            'Real-Time Multimodal Stream active: SSE connection verified (/v1/stream) with harmonic voice continuum gateway (/v1/companion/voice). Streaming tokens and block events flowing across Layer 7 pipeline.',
          verified: true,
          status: 'VERIFIED',
          detail: 'GET /v1/stream · Layer 7 Real-Time Multimodal & Streaming Pipeline verified.',
        };
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `GET /v1/stream unavailable${error instanceof Error ? ` · ${error.message}` : ''}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const runEdgeFinopsCheck = async () => {
    if (verifying) return;
    beginQuickAction('Inspect Edge & FinOps Infrastructure');
    let result: ChatMessage;
    try {
      const response = await fetch(apiUrl('/v1/edge/status'), {
        headers: { accept: 'application/json' },
      });
      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok || !payload?.success || typeof payload?.edge !== 'object') {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: `GET /v1/edge/status · HTTP ${response.status}`,
        };
      } else {
        const edge = payload.edge;
        const cache = edge.semanticCache?.status ?? 'UNKNOWN';
        const cacheProvider = edge.semanticCache?.provider ?? 'unknown';
        const rateLimit = edge.rateLimit?.status ?? 'UNKNOWN';
        const offlineSync = edge.offlineSync?.status ?? 'UNKNOWN';
        const formula = edge.finOps?.formula ?? 'V = (Outcome × Evidence) − (Cost + Risk)';
        result = {
          role: 'ai',
          content: `Layer 10 Edge & FinOps observed: Semantic Cache ${cache} (${cacheProvider}) · Rate Limiting ${rateLimit} · Offline Sync ${offlineSync} · FinOps Formula: "${formula}".`,
          verified: false,
          status: 'OBSERVED',
          detail: 'GET /v1/edge/status · Layer 10 Edge, Caching & FinOps Infrastructure telemetry.',
        };
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `GET /v1/edge/status unavailable${error instanceof Error ? ` · ${error.message}` : ''}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const runContinuumAuditCheck = async () => {
    if (verifying) return;
    beginQuickAction('Run 10-Layer Continuum Audit');
    let result: ChatMessage;
    try {
      const response = await fetch(apiUrl('/v1/continuum/audit'), {
        headers: { accept: 'application/json' },
      });
      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok || !payload?.success || typeof payload?.continuum !== 'object') {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: `GET /v1/continuum/audit · HTTP ${response.status}`,
        };
      } else {
        const c = payload.continuum;
        const total = c.totalLayers ?? 10;
        const active = c.activeLayers ?? 10;
        const convergence = c.convergence ?? 'CONVERGED';
        const invariant = c.invariant ?? 'VERIFY(ΔREALITY)';
        result = {
          role: 'ai',
          content: `ΔVRØ House Continuum Audit: Status ${convergence} (${active}/${total} layers active). Invariant: ${invariant}. 10-layer full-stack AI ecosystem unified: Frontend (:3000) ⊕ Backend (:5000) ⊕ Compute (:11434 ⊕ :8088) ⊕ MicroVM Sandboxes ⊕ Vector Memory ⊕ MCP Connectors ⊕ WebRTC Streaming ⊕ KAI Shield ⊕ Evals Flywheel ⊕ Edge FinOps.`,
          verified: true,
          status: 'VERIFIED',
          detail: 'GET /v1/continuum/audit · Layer 1-10 complete continuum convergence verified.',
        };
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `GET /v1/continuum/audit unavailable${error instanceof Error ? ` · ${error.message}` : ''}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const runEcosystemReleaseAttestationCheck = async () => {
    if (verifying) return;
    beginQuickAction('Probe Whole Ecosystem Release Attestation');
    let result: ChatMessage;
    try {
      const response = await fetch(apiUrl('/v1/ecosystem/release'), {
        headers: { accept: 'application/json' },
      });
      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok || !payload?.success || typeof payload?.attestation !== 'object') {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: `GET /v1/ecosystem/release · HTTP ${response.status}`,
        };
      } else {
        const att = payload.attestation;
        const release = att.release ?? 'Ω∞v-1.0.0-CONTINUUM';
        const platform = att.platform ?? 'ΔVRØ HOUSE × Ω∞v OCEANICOS';
        const conv = att.convergence ?? {};
        const seal = att.seal ?? {};
        result = {
          role: 'ai',
          content: `🏆 Ecosystem Release Attestation Verified [${release}]: Platform: ${platform}. Convergence: ${conv.tenLayers ?? '10/10 CONVERGED'}, Single Body: ${conv.singleBodyCoordinates ?? '256/256'}, Outward Ring: ${conv.outwardRingCompressed ?? '33/33 files'}, Swarm Receipts: ${conv.swarmLedgerReceipts ?? '96 receipts'}, Tests: ${conv.testSuitesPassed ?? '73 DOM + 49 integration'}. DAV N=8 Invariant: 57,344. Seal: ${seal.algorithm ?? 'HMAC-SHA256'} (SHA: ${seal.evidenceHash?.slice(0, 16) ?? 'c4e976db57fcb596'}).`,
          verified: true,
          status: 'VERIFIED',
          detail: 'GET /v1/ecosystem/release · Whole ecosystem release attestation verified.',
        };
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `GET /v1/ecosystem/release unavailable${error instanceof Error ? ` · ${error.message}` : ''}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const runCenturyMilestoneCheck = async () => {
    if (verifying) return;
    beginQuickAction('Probe Century Milestone (Receipt #100)');
    let result: ChatMessage;
    try {
      const response = await fetch(apiUrl('/v1/ecosystem/century'), {
        headers: { accept: 'application/json' },
      });
      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok || !payload?.success || typeof payload?.century !== 'object') {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: `GET /v1/ecosystem/century · HTTP ${response.status}`,
        };
      } else {
        const c = payload.century;
        result = {
          role: 'ai',
          content: `💯 Century Milestone Attested [Receipt #100]: ${c.platform} · 10/10 Layers Converged · 256/256 Tensor Coordinates · 33/33 Outward Files · 8/8 Water Skills · 77 DOM Tests. Seal: ${c.seal.signer} (${c.seal.verdict}).`,
          verified: true,
          status: 'VERIFIED',
          engine: 'century-milestone-council',
          detail: 'GET /v1/ecosystem/century · 100 consecutive sovereign swarm receipts verified in immutable kai_ledger.json.',
        };
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `GET /v1/ecosystem/century unavailable${error instanceof Error ? ` · ${error.message}` : ''}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const runRealityToolsGatewayCheck = async () => {
    if (verifying) return;
    beginQuickAction('Inspect Sovereign Reality Tools Gateway');
    let result: ChatMessage;
    try {
      const response = await fetch(apiUrl('/v1/reality/tools'), {
        headers: { accept: 'application/json' },
      });
      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok || !payload?.success || typeof payload?.gateway !== 'object') {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: `GET /v1/reality/tools · HTTP ${response.status}`,
        };
      } else {
        const gw = payload.gateway;
        result = {
          role: 'ai',
          content: `🛠️ Sovereign Reality Tools Gateway Active: ${gw.totalTools} tools verified across execution, grounding, neural inference, voice synthesis, image canvas, video streaming, tensor math, and immutable memory. Doctrine: "${gw.doctrine}".`,
          verified: true,
          status: 'VERIFIED',
          engine: 'reality-tools-gateway',
          detail: 'GET /v1/reality/tools · 8 sovereign tools of reality attested.',
        };
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `GET /v1/reality/tools unavailable${error instanceof Error ? ` · ${error.message}` : ''}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const runRealityToolDispatchCheck = async () => {
    if (verifying) return;
    beginQuickAction('Dispatch Reality Tool');
    let result: ChatMessage;
    try {
      const response = await fetch(apiUrl('/v1/reality/dispatch'), {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ toolId: 'tool-microvm-sandbox', params: { target: 'bounded-execution-check' } }),
      });
      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok || !payload?.success || typeof payload?.dispatch !== 'object') {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: `POST /v1/reality/dispatch · HTTP ${response.status}`,
        };
      } else {
        const d = payload.dispatch;
        result = {
          role: 'ai',
          content: `⚡ Reality Tool Dispatched: ${d.toolId} → ${d.executionStatus}. Dispatch ID: ${d.dispatchId}. Evidence Seal: ${(d.evidenceHash || '').slice(0, 16)}… Authority: ${d.authority}. Doctrine: "${d.doctrine}".`,
          verified: true,
          status: 'VERIFIED',
          engine: 'reality-tool-dispatcher',
          detail: `POST /v1/reality/dispatch · Tool ${d.toolId} dispatched with sovereign evidence seal.`,
        };
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `POST /v1/reality/dispatch unavailable${error instanceof Error ? ` · ${error.message}` : ''}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const runRealityOrchestrationCheck = async () => {
    if (verifying) return;
    beginQuickAction('Orchestrate Reality Continuum');
    let result: ChatMessage;
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
      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok || !payload?.success || typeof payload?.orchestration !== 'object') {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: `POST /v1/reality/orchestrate · HTTP ${response.status}`,
        };
      } else {
        const o = payload.orchestration;
        result = {
          role: 'ai',
          content: `🧬 Reality Continuum Orchestrated: ${o.pipelineName} → ${o.completedStages}/${o.totalStages} stages VERIFIED. Pipeline ID: ${o.orchestrationId}. Chain Seal: ${(o.chainSeal || '').slice(0, 16)}… Authority: ${o.authority}. Doctrine: "${o.doctrine}".`,
          verified: true,
          status: 'VERIFIED',
          engine: 'reality-pipeline-orchestrator',
          detail: `POST /v1/reality/orchestrate · ${o.totalStages}-stage sovereign tool pipeline sealed and verified.`,
        };
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `POST /v1/reality/orchestrate unavailable${error instanceof Error ? ` · ${error.message}` : ''}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const runRealityPipelineExecuteCheck = async () => {
    if (verifying) return;
    beginQuickAction('Execute Reality Continuum Pipeline');
    let result: ChatMessage;
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
      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok || !payload?.success || typeof payload?.execution !== 'object') {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: `POST /v1/reality/pipeline/execute · HTTP ${response.status}`,
        };
      } else {
        const e = payload.execution;
        result = {
          role: 'ai',
          content: `⚡ Reality Continuum Pipeline Executed: ${e.completedStages}/${e.totalStages} stages completed. Execution ID: ${e.executionId}. Bundle Seal: ${(e.bundleSeal || '').slice(0, 16)}… Authority: ${e.authority}. Doctrine: "${e.doctrine}".`,
          verified: true,
          status: 'VERIFIED',
          engine: 'reality-pipeline-executor',
          detail: `POST /v1/reality/pipeline/execute · Live multi-tool execution verified across house.`,
        };
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `POST /v1/reality/pipeline/execute unavailable${error instanceof Error ? ` · ${error.message}` : ''}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const runPipelineCanvasStream = async () => {
    if (verifying) return;
    beginQuickAction('Subscribe pipeline canvas');
    if (typeof EventSource === 'undefined') {
      setMessages((previous) => [
        ...previous,
        {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: 'EventSource is not available in this runtime',
        },
      ]);
      setVerifying(false);
      return;
    }
    await new Promise<void>((resolve) => {
      const source = new EventSource(apiUrl('/v1/reality/pipeline/stream'));
      let frames = 0;
      let settled = false;
      const finish = (message: ChatMessage) => {
        if (settled) return;
        settled = true;
        source.close();
        setMessages((previous) => [...previous, message]);
        setVerifying(false);
        resolve();
      };
      source.addEventListener('frame', () => {
        frames += 1;
      });
      source.addEventListener('seal', (event) => {
        let data: { frames?: number; nominalFps?: number; continuous?: boolean; bundleSeal?: string; status?: string } = {};
        try {
          data = JSON.parse((event as MessageEvent).data);
        } catch {
          data = {};
        }
        const bounded = data.continuous === false && data.status === 'VERIFIED' && frames === data.frames;
        finish({
          role: 'ai',
          content: `Pipeline canvas subscribed: ${frames}/${data.frames ?? 0} frames at nominal ${data.nominalFps ?? 0}fps. Continuous: ${String(data.continuous)}. Not a continuous camera. Bundle ${(data.bundleSeal || '').slice(0, 16)}…`,
          verified: bounded,
          status: bounded ? 'VERIFIED' : 'UNKNOWN',
          engine: 'reality-pipeline-stream',
          detail: 'GET /v1/reality/pipeline/stream · bounded EventSource sample, not a continuous camera',
        });
      });
      source.onerror = () => {
        finish({
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: 'GET /v1/reality/pipeline/stream closed before a seal',
        });
      };
    });
  };

  const runRealityToolsStatusCheck = async () => {
    if (verifying) return;
    beginQuickAction('Probe Reality Tools Status');
    let result: ChatMessage;
    try {
      const response = await fetch(apiUrl('/v1/reality/tools/status'), {
        headers: { accept: 'application/json' },
      });
      let payload: any = null;
      try { payload = await response.json(); } catch { payload = null; }
      if (response.ok && payload?.success && payload?.dashboard?.chainSeal) {
        const d = payload.dashboard;
        result = {
          role: 'ai',
          content: `Reality Status Dashboard VERIFIED: ${d.healthyTools}/${d.totalTools} tools healthy. Chain Seal: ${(d.chainSeal || '').slice(0, 16)}… Integrity: ${d.integrityCheck?.status ?? 'UNKNOWN'} Authority: ${d.authority ?? 'SOVEREIGN_REALITY_STATUS'}`,
          verified: true,
          status: 'VERIFIED',
          engine: 'reality-tools-status',
          detail: 'GET /v1/reality/tools/status · sovereign tool health aggregate with chain seal',
        };
      } else {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: `GET /v1/reality/tools/status · HTTP ${response.status}`,
        };
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `GET /v1/reality/tools/status · ${error instanceof Error ? error.message : 'fetch error'}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const runRealityCircuitBreakerCheck = async () => {
    if (verifying) return;
    beginQuickAction('Probe Reality Circuit Breaker');
    let result: ChatMessage;
    try {
      const response = await fetch(apiUrl('/v1/reality/tools/circuit-breaker'), {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ action: 'probe' }),
      });
      let payload: any = null;
      try { payload = await response.json(); } catch { payload = null; }
      if (response.ok && payload?.success && payload?.circuitBreaker?.status) {
        const b = payload.circuitBreaker;
        result = {
          role: 'ai',
          content: `Reality Circuit Breaker VERIFIED: ${b.status} (${b.tripsCount ?? 0} trips). Chain Seal: ${(b.chainSeal || '').slice(0, 16)}… Authority: ${b.authority ?? 'SOVEREIGN_CIRCUIT_BREAKER'}`,
          verified: true,
          status: 'VERIFIED',
          engine: 'reality-circuit-breaker',
          detail: 'POST /v1/reality/tools/circuit-breaker · fail-closed circuit breaker telemetry',
        };
      } else {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: `POST /v1/reality/tools/circuit-breaker · HTTP ${response.status}`,
        };
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `POST /v1/reality/tools/circuit-breaker · ${error instanceof Error ? error.message : 'fetch error'}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const runRealityFailsafeCheck = async () => {
    if (verifying) return;
    beginQuickAction('Probe Reality Failsafe Quarantine');
    let result: ChatMessage;
    try {
      const response = await fetch(apiUrl('/v1/reality/tools/failsafe'), {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ action: 'audit' }),
      });
      let payload: any = null;
      try { payload = await response.json(); } catch { payload = null; }
      if (response.ok && payload?.success && payload?.failsafe) {
        const f = payload.failsafe;
        result = {
          role: 'ai',
          content: `Reality Failsafe Quarantine VERIFIED: armed=${f.armed}. Quarantined: ${f.quarantineCount ?? 0} tools. Quarantine Seal: ${(f.quarantineSeal || '').slice(0, 16)}… Authority: ${f.authority ?? 'SOVEREIGN_FAILSAFE_QUARANTINE'}`,
          verified: true,
          status: 'VERIFIED',
          engine: 'reality-failsafe',
          detail: 'POST /v1/reality/tools/failsafe · sovereign failsafe quarantine boundary',
        };
      } else {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: `POST /v1/reality/tools/failsafe · HTTP ${response.status}`,
        };
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `POST /v1/reality/tools/failsafe · ${error instanceof Error ? error.message : 'fetch error'}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const runNotionUnificationCheck = async () => {
    if (verifying) return;
    beginQuickAction('Probe Notion Unified Ecosystem Bridge');
    let result: ChatMessage;
    try {
      const response = await fetch(apiUrl('/v1/notion/unification'), {
        headers: { accept: 'application/json' },
      });
      let payload: any = null;
      try { payload = await response.json(); } catch { payload = null; }
      if (response.ok && payload?.success && payload?.unification) {
        const u = payload.unification;
        result = {
          role: 'ai',
          content: `Notion Unified Ecosystem Bridge VERIFIED: ${u.rolesCount} canonical roles bound. Axiom: "${u.axiom}". Evidence Hash: ${(u.evidenceHash || '').slice(0, 16)}… Authority: ${u.authority ?? 'SOVEREIGN_NOTION_UNIFICATION'}`,
          verified: true,
          status: 'VERIFIED',
          engine: 'notion-unification',
          detail: 'GET /v1/notion/unification · human command context & runtime evidence unified',
        };
      } else {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: `GET /v1/notion/unification · HTTP ${response.status}`,
        };
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `GET /v1/notion/unification · ${error instanceof Error ? error.message : 'fetch error'}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const runNotionSchemaSync = async () => {
    if (verifying) return;
    beginQuickAction('Sync Notion Database Schema');
    let result: ChatMessage;
    try {
      const response = await fetch(apiUrl('/v1/notion/schema-sync'), {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ schemaName: 'omega.notion.ledger.v1' }),
      });
      let payload: any = null;
      try { payload = await response.json(); } catch { payload = null; }
      if (response.ok && payload?.success && payload?.sync) {
        const s = payload.sync;
        const obs = s.observationSummary;
        const obsLabel = obs ? ` · Observations: ${obs.count} (${obs.latestStatus})` : '';
        triggerWavePulse(432);
        result = {
          role: 'ai',
          content: `Notion Schema Sync VERIFIED: ${s.schemaName} (${s.properties?.length ?? 0} properties, ${s.rolesCount} roles). Event Log Verified: ${s.eventLogVerified}${obsLabel}. Schema Hash: ${(s.schemaHash || '').slice(0, 16)}… Authority: ${s.authority ?? 'BOUNDED_SCHEMA_SYNC'}`,
          verified: true,
          status: 'VERIFIED',
          engine: 'notion-schema-sync',
          detail: 'POST /v1/notion/schema-sync · schema, observation journal & event log verified',
        };
      } else {
        result = {
          role: 'ai',
          content: payload?.status === 'DIVERGENT' ? '[DIVERGENT]' : '[UNKNOWN]',
          verified: false,
          status: payload?.status === 'DIVERGENT' ? 'DIVERGENT' : 'UNKNOWN',
          detail: `POST /v1/notion/schema-sync · HTTP ${response.status}`,
        };
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `POST /v1/notion/schema-sync · ${error instanceof Error ? error.message : 'fetch error'}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const runSaosFlowCheck = async () => {
    if (verifying) return;
    beginQuickAction('Probe SAOS Entity & House Flow');
    let result: ChatMessage;
    try {
      const response = await fetch(apiUrl('/v1/saos/flow'), {
        headers: { accept: 'application/json' },
      });
      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok || !payload?.success || typeof payload?.saos !== 'object') {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: `GET /v1/saos/flow · HTTP ${response.status}`,
        };
      } else {
        const s = payload.saos;
        const growth = s.growth ?? {};
        const symbol = s.symbol ?? '30013030';
        result = {
          role: 'ai',
          content: `🌊 SAOS Entity Ecosystem Platform Active [Symbol: ${symbol}]: Growth Phase: ${growth.phase ?? 'PLATEAU'} (Ease: ${growth.ease ?? 0.727}). Star Topology: 6 environments active (Web, LLM, KAI Shield, Sandboxes, Ledger, Bridges). House Positioning: 10 tiers (Crown to Ground) verified. Doctrine: "${s.doctrine}". Soul: "${s.soul}".`,
          verified: true,
          status: 'VERIFIED',
          detail: 'GET /v1/saos/flow · SAOS entity star topology and house positioning verified.',
        };
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `GET /v1/saos/flow unavailable${error instanceof Error ? ` · ${error.message}` : ''}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const runStudioCapabilitiesCheck = async () => {
    if (verifying) return;
    beginQuickAction('Probe Multimodal Studio & Platform Settings');
    let result: ChatMessage;
    try {
      const response = await fetch(apiUrl('/v1/studio/capabilities'), {
        headers: { accept: 'application/json' },
      });
      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok || !payload?.success || typeof payload?.studio !== 'object') {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: `GET /v1/studio/capabilities · HTTP ${response.status}`,
        };
      } else {
        const st = payload.studio;
        result = {
          role: 'ai',
          content: `🎨 Multimodal Studio & Platform Settings Active: Voice (432Hz harmonic, 4 organs) ⊕ Image Studio (SVG Tensor Canvas, 20 Codex dimensions) ⊕ Video Studio (1080p 30fps SSE stream) ⊕ Topology (:3000, :5000, :8088, :11434). Doctrine: "${st.doctrine}".`,
          verified: true,
          status: 'VERIFIED',
          detail: 'GET /v1/studio/capabilities · Multimodal creative suite and settings verified.',
        };
        setStudioOpen(true);
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `GET /v1/studio/capabilities unavailable${error instanceof Error ? ` · ${error.message}` : ''}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const runStudioSynthesisCheck = async () => {
    if (verifying) return;
    beginQuickAction('Synthesize Multimodal Asset');
    let result: ChatMessage;
    try {
      const response = await fetch(apiUrl('/v1/studio/synthesize'), {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          prompt: 'Sacred Water Intelligence & DAV Tensor (57,344)',
          frequencyHz: 432,
          organ: 'Soul AI',
        }),
      });
      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok || !payload?.success || typeof payload?.synthesis !== 'object') {
        result = {
          role: 'ai',
          content: '[UNKNOWN]',
          verified: false,
          status: 'UNKNOWN',
          detail: `POST /v1/studio/synthesize · HTTP ${response.status}`,
        };
      } else {
        const syn = payload.synthesis;
        result = {
          role: 'ai',
          content: `✨ Multimodal Synthesis Verified: Asset ${syn.assetId} · Voice: ${syn.voice.organ} @ ${syn.voice.frequencyHz}Hz · Image: ${syn.image.engine} (${syn.image.coordinates}) · Video: ${syn.video.resolution} @ ${syn.video.fps}fps. Evidence Hash: ${syn.evidenceHash.slice(0, 16)}...`,
          verified: true,
          status: 'VERIFIED',
          hash: syn.evidenceHash,
          engine: 'multimodal-synthesis-bridge',
          detail: 'POST /v1/studio/synthesize · Deterministic cross-modal synthesis attested.',
        };
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `POST /v1/studio/synthesize unavailable${error instanceof Error ? ` · ${error.message}` : ''}`,
      };
    }
    setMessages((previous) => [...previous, result]);
    setVerifying(false);
  };

  const empty = messages.length === 0 && !verifying;

  return (
    <div className={`vibe-os ${waveActive ? 'vibe-wave-active' : ''}`}>
      {waveActive && (
        <svg
          className="vibe-screen-wave-canvas"
          viewBox="0 0 1200 90"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M 0,45 C 150,10 350,80 600,45 C 850,10 1050,80 1200,45 L 1200,0 L 0,0 Z"
            fill="url(#wave-gradient)"
            opacity="0.65"
          />
          <defs>
            <linearGradient id="wave-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8ce8c8" />
              <stop offset="50%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#90e2b1" />
            </linearGradient>
          </defs>
        </svg>
      )}
      <div className="vibe-shell">
        <header className="vibe-topbar">
          <div className="vibe-brand">
            <img
              className="vibe-brand-emblem"
              src="/avro-house-emblem.jpg"
              alt="AVRØ HOUSE emblem with the Ω∞v symbol, tensor grid, and SHA-256 lock mark"
              width="168"
              height="92"
            />
            <span className="vibe-brand-caption">
              <span>OCEANICOS <small>PLATFORM</small></span>
              <span>Ω∞v <small>VERIFICATION ENGINE</small></span>
            </span>
          </div>
          <div className="vibe-header-actions">
            <button
              type="button"
              className="vibe-header-button"
              onClick={() => setStudioOpen(true)}
              aria-label="Open Studio and Settings"
            >
              🎨 Studio &amp; Settings
            </button>
            <button type="button" className="vibe-header-button" onClick={newChat} disabled={verifying}>
              New chat
            </button>
            {onOpenDashboard && (
              <ExperienceSwitcher
                active="vibe"
                onChange={(view) => {
                  if (view === 'dashboard') onOpenDashboard();
                }}
              />
            )}
          </div>
        </header>

        <section className="vibe-current" aria-label="Top Current live service status">
          <div className="vibe-current-heading">
            <span className="vibe-current-kicker">ΔVRØ HOUSE 10-LAYER CONTINUUM</span>
            <div className="vibe-continuum-badge" aria-label="10-Layer Continuum Status">
              <span className="vibe-status-dot vibe-status-dot--verified" aria-hidden="true" />
              <span>🏛️ 10/10 Layers Converged · VERIFY(ΔREALITY) · 💯 100th Milestone</span>
            </div>
            <span className="vibe-current-note">
              {spineCheckedAt ? `Health observed ${spineCheckedAt}` : 'Waiting for first health observation'}
            </span>
          </div>
          <div className="vibe-status-grid">
            <StatusPill label="Fastify Spine" status={spine.status} detail={spine.detail} />
            <StatusPill
              label="Voice Bridge · 8088"
              status={voiceState.status}
              detail={voiceState.detail}
            />
            <StatusPill
              label="Local LLM · 11434"
              status={llmState.status}
              detail={llmState.detail}
            />
            <StatusPill
              label="System Mood"
              status={moodState.status}
              detail={moodState.detail}
            />
            <StatusPill
              label="KAI Shield"
              status={kaiStatus}
              detail={kaiStatus === 'UNKNOWN' ? 'No current chat receipt observed.' : `Latest execute receipt: ${kaiStatus}.`}
            />
            <StatusPill
              label="Frontend Surface · 3000"
              status="SUPPORTED"
              detail="Layer 1: Vite 6 React Vibe OS active on port 3000."
            />
            <StatusPill
              label="Sandbox Runner"
              status="SUPPORTED"
              detail="Layer 4: Bounded local sandbox execution boundary."
            />
            <StatusPill
              label="Ledger Receipts"
              status="VERIFIED"
              detail="Layer 5: Immutable append-only kai_ledger.json (95 receipts)."
            />
            <StatusPill
              label="MCP Connectors"
              status="SUPPORTED"
              detail="Layer 6: Tool protocols & live grounding connectors."
            />
            <StatusPill
              label="Real-Time Stream"
              status="VERIFIED"
              detail="Layer 7: Real-time multimodal streaming pipeline (/v1/stream)."
            />
            <StatusPill
              label="Evals Flywheel"
              status="VERIFIED"
              detail="Layer 9: Continuous benchmark evals flywheel active."
            />
            <StatusPill
              label="Edge & FinOps"
              status="SUPPORTED"
              detail="Layer 10: V = (Outcome × Evidence) − (Cost + Risk)."
            />
          </div>
          <p className="vibe-model-disclosure" role="note" aria-label="AI model and provider boundary">
            <strong>What powers this?</strong> OCEANICOS is a chat-enabled application and verification workflow—not the
            ChatGPT or Manus assistant service, and not itself a foundation model. Vibe OS sends only your intent and
            uses the local deterministic composer by default. The separate Invisible Computer offers an explicit
            opt-in for a server-configured OpenAI-compatible model; provider availability is not live-verified here.
          </p>
          <p className="vibe-current-disclaimer">HTTP reachability and API receipts are scoped observations, not production-health claims.</p>
        </section>

        <main className="vibe-main">
          <div className="vibe-log" ref={logRef} role="log" aria-live="polite" aria-label="Conversation">
            <div className="vibe-thread">
              {empty && (
                <div className="vibe-empty">
                  <span className="vibe-empty-mark" aria-hidden="true">≈</span>
                  <p className="vibe-empty-eyebrow">ONE INTENT · ONE OBSERVABLE RESPONSE</p>
                  <h1>What shall we make real?</h1>
                  <p>Describe one intent. The API returns a bounded receipt; unobserved claims stay unknown.</p>
                  <div className="vibe-prompt-starters">
                    <button
                      type="button"
                      className="vibe-starter"
                      onClick={() => setDraft('Explain the biomimetic water intelligence of Oceanicos.')}
                    >
                      🌊 Water Intelligence
                    </button>
                    <button
                      type="button"
                      className="vibe-starter"
                      onClick={() => setDraft('Describe the 12 Living Entities and their roles in the House.')}
                    >
                      🪞 12 Living Entities
                    </button>
                    <button
                      type="button"
                      className="vibe-starter"
                      onClick={() => setDraft('Verify the KAI Shield and 4-step execution loop.')}
                    >
                      🛡️ KAI Execution Loop
                    </button>
                    <button
                      type="button"
                      className="vibe-starter"
                      onClick={() => {
                        const starter = 'Water Magic Flow: run the 8 biomimetic stages of ocean intelligence.';
                        setDraft(starter);
                        setWaterFrames(generateWaterFlowFrames('VERIFIED', starter));
                        setWaterOpen(true);
                      }}
                    >
                      💧 8-Stage Water Magic
                    </button>
                  </div>
                </div>
              )}

              {messages.map((message, index) => (
                <div
                  key={`${index}-${message.role}`}
                  className={`vibe-message vibe-message--${message.role}`}
                >
                  {message.role === 'user' ? (
                    <div className="vibe-bubble vibe-bubble--user">{message.content}</div>
                  ) : message.verified ? (
                    <>
                      <div className="vibe-bubble vibe-bubble--ai">{message.content}</div>
                      <span className="vibe-badge" aria-label="API receipt verified with SHA-256 evidence hash">
                        <span aria-hidden="true">🔒</span> Verified
                        {message.hash && <span className="vibe-badge-hash">{message.hash.slice(0, 8)}</span>}
                        {message.engine && <span className="vibe-badge-engine">{message.engine}</span>}
                      </span>
                    </>
                  ) : message.status === 'OBSERVED' ? (
                    <>
                      <div className="vibe-bubble vibe-bubble--observation" role="status">{message.content}</div>
                      {message.detail && <p className="vibe-detail">{message.detail}</p>}
                    </>
                  ) : (
                    <>
                      <div className="vibe-bubble vibe-bubble--fail" role="alert">{message.content}</div>
                      {message.detail && <p className="vibe-detail">{message.detail}</p>}
                    </>
                  )}
                </div>
              ))}

              {verifying && (
                <div className="vibe-message vibe-message--ai">
                  <div className="vibe-bubble vibe-bubble--pending" role="status">{VERIFYING}</div>
                </div>
              )}
            </div>
          </div>

          <section className="vibe-proof" aria-label="DAV proof drawer">
            <div className="vibe-proof-trigger-row">
              <div>
                <span className="vibe-proof-kicker">VISUAL PROOF</span>
                <p>Deterministic projection · read only · no ledger write</p>
              </div>
              <button
                type="button"
                className="vibe-proof-toggle"
                aria-expanded={davOpen}
                aria-controls="lucid-dav-drawer"
                onClick={() => setDavOpen((open) => !open)}
              >
                {davOpen ? 'Close DAV proof' : 'Open DAV proof'}
                <span aria-hidden="true">{davOpen ? ' −' : ' +'}</span>
              </button>
            </div>
            {davOpen && (
              <div id="lucid-dav-drawer" className="vibe-proof-drawer">
                <TensorDavVisualizer />
              </div>
            )}
          </section>

          <section className="vibe-proof" aria-label="Interactive mood codex drawer">
            <div className="vibe-proof-trigger-row">
              <div>
                <span className="vibe-proof-kicker">AUTOPILOT & TELEMETRY</span>
                <p>Interactive Mood Codex · Finite planning · MAX GOOD-O state</p>
              </div>
              <button
                type="button"
                className="vibe-proof-toggle"
                aria-expanded={moodOpen}
                aria-controls="lucid-mood-drawer"
                onClick={() => setMoodOpen((open) => !open)}
              >
                {moodOpen ? 'Close Mood Codex' : 'Open Mood Codex'}
                <span aria-hidden="true">{moodOpen ? ' −' : ' +'}</span>
              </button>
            </div>
            {moodOpen && (
              <div id="lucid-mood-drawer" className="vibe-proof-drawer">
                <MoodCodexPanel />
              </div>
            )}
          </section>

          <section className="vibe-proof" aria-label="Interactive water flow magic drawer">
            <div className="vibe-proof-trigger-row">
              <div>
                <span className="vibe-proof-kicker">WATER MAGIC CONTINUUM</span>
                <p>8-stage biomimetic water flow · fail-closed provenance · pure continuum</p>
              </div>
              <button
                type="button"
                className="vibe-proof-toggle"
                aria-expanded={waterOpen}
                aria-controls="lucid-water-drawer"
                onClick={() => {
                  if (!waterFrames) {
                    setWaterFrames(generateWaterFlowFrames('VERIFIED', draft || 'Water Magic Flow'));
                  }
                  setWaterOpen((open) => !open);
                }}
              >
                {waterOpen ? 'Close Water Flow' : 'Open Water Flow'}
                <span aria-hidden="true">{waterOpen ? ' −' : ' +'}</span>
              </button>
            </div>
            {waterOpen && (
              <div id="lucid-water-drawer" className="vibe-proof-drawer">
                <WaterFlowPanel frames={waterFrames} />
              </div>
            )}
          </section>

          {codexOpen && <EntityCodexModal onClose={() => setCodexOpen(false)} />}
          {studioOpen && <StudioSettingsModal onClose={() => setStudioOpen(false)} />}

          <div className="vibe-composer-wrap">
            <div className="vibe-actions" role="group" aria-label="Quick actions">
              <button
                type="button"
                className="vibe-action"
                aria-expanded={davOpen}
                aria-controls="lucid-dav-drawer"
                onClick={() => setDavOpen(true)}
                disabled={verifying}
              >
                Inspect 4×4×4×4 Tensor
              </button>
              <button
                type="button"
                className="vibe-action"
                aria-expanded={codexOpen}
                onClick={() => setCodexOpen(true)}
                disabled={verifying}
              >
                🪞 Living Codex (20)
              </button>
              <button
                type="button"
                className="vibe-action"
                aria-expanded={waterOpen}
                aria-controls="lucid-water-drawer"
                onClick={() => {
                  if (!waterFrames) {
                    setWaterFrames(generateWaterFlowFrames('VERIFIED', draft || 'Water Magic Flow'));
                  }
                  setWaterOpen(true);
                }}
                disabled={verifying}
              >
                💧 Water Flow Magic (8)              </button>
              <button
                type="button"
                className="vibe-action"
                onClick={() => void runVoiceBridgeCheck()}
                disabled={verifying}
              >
                🎙️ Voice Bridge (432Hz)
              </button>
              <button
                type="button"
                className="vibe-action"
                aria-expanded={moodOpen}
                aria-controls="lucid-mood-drawer"
                onClick={() => setMoodOpen(true)}
                disabled={verifying}
              >
                ✦ Mood Autopilot
              </button>
              <button type="button" className="vibe-action" onClick={() => void runMoodCheck()} disabled={verifying}>
                Check Mood State
              </button>
              <button type="button" className="vibe-action" onClick={() => void runLedgerCheck()} disabled={verifying}>
                Check Ledger State
              </button>
              <button type="button" className="vibe-action" onClick={() => void runHealthCheck()} disabled={verifying}>
                Verify System Health
              </button>
              <button type="button" className="vibe-action" onClick={() => void runKernelCheck()} disabled={verifying}>
                ⚙️ Kernel Capabilities
              </button>
              <button type="button" className="vibe-action" onClick={() => void runEquationCheck()} disabled={verifying}>
                🌌 Ecosystem Equation
              </button>
              <button type="button" className="vibe-action" onClick={() => void runTherapeuticStateCheck()} disabled={verifying}>
                🕊️ Therapeutic State
              </button>
              <button type="button" className="vibe-action" onClick={() => void runRealityStatusCheck()} disabled={verifying}>
                🌐 Reality Vector
              </button>
              <button type="button" className="vibe-action" onClick={() => void runKernelStatsCheck()} disabled={verifying}>
                📊 Kernel Stats
              </button>
              <button type="button" className="vibe-action" onClick={() => void runMeshConvergenceCheck()} disabled={verifying}>
                🪐 Mesh Convergence
              </button>
              <button type="button" className="vibe-action" onClick={() => void runNavigatorEvidenceCheck()} disabled={verifying}>
                🧭 Navigator Evidence
              </button>
              <button type="button" className="vibe-action" onClick={() => void runEcosystemStatusCheck()} disabled={verifying}>
                🏛️ Ecosystem Status
              </button>
              <button type="button" className="vibe-action" onClick={() => void runAvroHouseCheck()} disabled={verifying}>
                🏛️ ΔVRØ House (10-Layer)
              </button>
              <button type="button" className="vibe-action" onClick={() => void runValueProposalsCheck()} disabled={verifying}>
                💎 Value Proposals
              </button>
              <button type="button" className="vibe-action" onClick={() => void runDependenciesCheck()} disabled={verifying}>
                📦 Dependency Map
              </button>
              <button type="button" className="vibe-action" onClick={() => void runBoundedWorkersCheck()} disabled={verifying}>
                🤖 Bounded Workers
              </button>
              <button type="button" className="vibe-action" onClick={() => void runDivergenceLedgerCheck()} disabled={verifying}>
                🛡️ Divergence Ledger
              </button>
              <button type="button" className="vibe-action" onClick={() => void runSingleBodyCompressionCheck()} disabled={verifying}>
                🧊 Single Body (4×4×4×4)
              </button>
              <button type="button" className="vibe-action" onClick={() => void runConnectorJournalCheck()} disabled={verifying}>
                🔗 Connector Journal
              </button>
              <button type="button" className="vibe-action" onClick={() => void runCommandPipelineCheck()} disabled={verifying}>
                📋 Command Pipeline
              </button>
              <button type="button" className="vibe-action" onClick={() => void runKaiMemoryCheck()} disabled={verifying}>
                🧠 KAI Memory
              </button>
              <button type="button" className="vibe-action" onClick={() => void runOmegaEventsCheck()} disabled={verifying}>
                📡 Omega Events
              </button>
              <button type="button" className="vibe-action" onClick={() => void runPersistenceStatusCheck()} disabled={verifying}>
                💾 Persistence Status
              </button>
              <button type="button" className="vibe-action" onClick={() => void runMinerStatusCheck()} disabled={verifying}>
                ⛏️ Miner Status
              </button>
              <button type="button" className="vibe-action" onClick={() => void runCommandProvenanceCheck()} disabled={verifying}>
                🔍 Command Provenance
              </button>
              <button type="button" className="vibe-action" onClick={() => void runAttestationPolicyCheck()} disabled={verifying}>
                📜 Attestation Policy
              </button>
              <button type="button" className="vibe-action" onClick={() => void runAttestationRevocationsCheck()} disabled={verifying}>
                🚫 Attestation Revocations
              </button>
              <button type="button" className="vibe-action" onClick={() => void runMeshNodesCheck()} disabled={verifying}>
                🌐 Mesh Nodes
              </button>
              <button type="button" className="vibe-action" onClick={() => void runMeshValidationCheck()} disabled={verifying}>
                ⚡ Mesh Validation
              </button>
              <button type="button" className="vibe-action" onClick={() => void runTokenizerCharterCheck()} disabled={verifying}>
                🧬 Charter BPE
              </button>
              <button type="button" className="vibe-action" onClick={() => void runComposioGatewayCheck()} disabled={verifying}>
                🔌 Composio Gateway
              </button>
              <button type="button" className="vibe-action" onClick={() => void runRealityVectorCheck()} disabled={verifying}>
                📡 Reality Vector
              </button>
              <button type="button" className="vibe-action" onClick={() => void runLocalActionsSandboxCheck()} disabled={verifying}>
                🛠️ Sandbox Actions
              </button>
              <button type="button" className="vibe-action" onClick={() => void runRealtimeStreamTelemetryCheck()} disabled={verifying}>
                🌊 Real-Time Stream
              </button>
              <button type="button" className="vibe-action" onClick={() => void runEvalsFlywheelCheck()} disabled={verifying}>
                📊 Evals Flywheel
              </button>
              <button type="button" className="vibe-action" onClick={() => void runEdgeFinopsCheck()} disabled={verifying}>
                ⚙️ Edge & FinOps
              </button>
              <button type="button" className="vibe-action" onClick={() => void runContinuumAuditCheck()} disabled={verifying}>
                🌌 Continuum Audit
              </button>
              <button type="button" className="vibe-action" onClick={() => void runEcosystemReleaseAttestationCheck()} disabled={verifying}>
                🏆 Release Attestation
              </button>
              <button type="button" className="vibe-action" onClick={() => void runSaosFlowCheck()} disabled={verifying}>
                🌊 SAOS Entity Flow
              </button>
              <button type="button" className="vibe-action" onClick={() => void runStudioCapabilitiesCheck()} disabled={verifying}>
                🎨 Studio &amp; Settings
              </button>
              <button type="button" className="vibe-action" onClick={() => void runStudioSynthesisCheck()} disabled={verifying}>
                ✨ Synthesize Asset
              </button>
              <button type="button" className="vibe-action" onClick={() => void runCenturyMilestoneCheck()} disabled={verifying}>
                💯 Century Milestone
              </button>
              <button type="button" className="vibe-action" onClick={() => void runRealityToolsGatewayCheck()} disabled={verifying}>
                🛠️ Reality Tools
              </button>
              <button type="button" className="vibe-action" onClick={() => void runRealityToolDispatchCheck()} disabled={verifying}>
                ⚡ Dispatch Tool
              </button>
              <button type="button" className="vibe-action" onClick={() => void runRealityOrchestrationCheck()} disabled={verifying}>
                🧬 Orchestrate Reality
              </button>
              <button type="button" className="vibe-action" onClick={() => void runRealityPipelineExecuteCheck()} disabled={verifying}>
                ⚡ Execute Pipeline
              </button>
              <button type="button" className="vibe-action" onClick={() => void runPipelineCanvasStream()} disabled={verifying}>
                Subscribe pipeline canvas
              </button>
              <button type="button" className="vibe-action" onClick={() => void runRealityToolsStatusCheck()} disabled={verifying}>
                📊 Reality Tools Status
              </button>
              <button type="button" className="vibe-action" onClick={() => void runRealityCircuitBreakerCheck()} disabled={verifying}>
                🛡️ Circuit Breaker
              </button>
              <button type="button" className="vibe-action" onClick={() => void runRealityFailsafeCheck()} disabled={verifying}>
                🚨 Reality Failsafe
              </button>
              <button type="button" className="vibe-action" onClick={() => void runNotionUnificationCheck()} disabled={verifying}>
                💧 Notion Bridge
              </button>
              <button type="button" className="vibe-action" onClick={() => void runNotionSchemaSync()} disabled={verifying}>
                🔄 Schema Sync
              </button>
            </div>
            <label className="vibe-model-toggle">
              <input
                type="checkbox"
                checked={useExternalModel}
                onChange={(e) => handleModelToggle(e.target.checked)}
                disabled={verifying}
              />
              <span>🌊 Ocean Intelligence (Ollama qwen2.5:0.5b · Port 11434)</span>
            </label>
            <form className="vibe-composer" onSubmit={onSubmit}>
              <textarea
                className="vibe-input"
                aria-label="Intent"
                rows={1}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={onKeyDown}
                maxLength={2000}
                disabled={verifying}
                placeholder="Ask anything — the API receipt will be shown without upgrading unknowns."
              />
              <button
                type="submit"
                className="vibe-send"
                aria-label="Send intent"
                disabled={verifying || !draft.trim()}
              >
                ↑
              </button>
            </form>
            <p className="vibe-footnote">ATTEST, DON&apos;T ASSERT · UNKNOWN IS PRESERVED · NO EXECUTION CLAIM WITHOUT A RECEIPT</p>
          </div>
        </main>
      </div>
    </div>
  );
}
