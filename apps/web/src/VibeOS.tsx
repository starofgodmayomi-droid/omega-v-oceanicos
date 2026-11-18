import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { submitIntent, type IntentReceipt, type Verdict } from './vibe-os-api';
import { TensorDavVisualizer } from './components/TensorDavVisualizer';
import { MoodCodexPanel } from './MoodCodexPanel';
import { EntityCodexModal } from './components/EntityCodexModal';
import './VibeOS.css';

export type ChatMessage = {
  role: 'user' | 'ai';
  content: string;
  verified: boolean;
  hash?: string;
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
      status: 'VERIFIED',
    };
  }
  return {
    role: 'ai',
    content: `[${receipt.status}]`,
    verified: false,
    detail: receipt.reason ?? undefined,
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
