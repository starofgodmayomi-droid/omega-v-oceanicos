import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { submitIntent, type IntentReceipt, type Verdict } from './vibe-os-api';
import { TensorDavVisualizer } from './components/TensorDavVisualizer';
import { MoodCodexPanel } from './MoodCodexPanel';
import { EntityCodexModal } from './components/EntityCodexModal';
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
  status?: Verdict | 'OBSERVED';
};

type LiveState = 'OBSERVED' | 'UNKNOWN' | 'VERIFIED';
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
      void ctx.close().catch(() => {});
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

export function VibeOS({ onOpenDashboard }: { onOpenDashboard?: () => void }) {
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
  const [useExternalModel, setUseExternalModel] = useState(false);
  const logRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    let controller: AbortController | null = null;
    const probe = async () => {
      controller?.abort();
      const current = new AbortController();
      controller = current;
      const observation = await observeSpineHealth(current.signal);
      if (active && !current.signal.aborted) {
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
        const voiceUrl = (import.meta as any).env?.VITE_VOICE_URL || 'http://localhost:8088/voice';
        const voiceRes = await fetch(voiceUrl, {
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
      active = false;
      controller?.abort();
      window.clearInterval(interval);
    };
  }, []);

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

    const receipt = await submitIntent(intent, undefined, useExternalModel);
    setKaiStatus(receipt.status);
    setMessages((previous) => [...previous, receiptMessage(receipt)]);
    setWaterFrames(generateWaterFlowFrames(receipt.status, intent));
    if (receipt.verified) {
      playHarmonicTone(432, 0.5);
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
      const voiceUrl = (import.meta as any).env?.VITE_VOICE_URL || 'http://localhost:8088/voice';
      const response = await fetch(voiceUrl, { headers: { accept: 'application/json' } });
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
          detail: `GET /voice · SHA-256: ${payload.sha256}`,
        };
      }
    } catch (error) {
      result = {
        role: 'ai',
        content: '[UNKNOWN]',
        verified: false,
        status: 'UNKNOWN',
        detail: `GET http://localhost:8088/voice unavailable${error instanceof Error ? ` · ${error.message}` : ''}`,
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

  const empty = messages.length === 0 && !verifying;

  return (
    <div className="vibe-os">
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
            <button type="button" className="vibe-header-button" onClick={newChat} disabled={verifying}>
              New chat
            </button>
            {onOpenDashboard && (
              <button type="button" className="vibe-header-button vibe-header-button--primary" onClick={onOpenDashboard}>
                Full system dashboard
              </button>
            )}
          </div>
        </header>

        <section className="vibe-current" aria-label="Top Current live service status">
          <div className="vibe-current-heading">
            <span className="vibe-current-kicker">TOP CURRENT</span>
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
          </div>
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
                🪞 Living Codex (12)
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
            </div>
            <label className="vibe-model-toggle">
              <input
                type="checkbox"
                checked={useExternalModel}
                onChange={(e) => setUseExternalModel(e.target.checked)}
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
