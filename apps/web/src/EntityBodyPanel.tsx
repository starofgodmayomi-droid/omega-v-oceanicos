import { useEffect, useState, type FormEvent } from 'react';

/*
 * ΩVØØS — the three-pane clean ocean surface.
 *
 * Section II of the stored directive names this surface (`#030812` ocean,
 * `#00e5ff` cyan) and Section V names `ΩVØØS/app.py` as its host. The
 * repository web surface is apps/web, so the panes live here and read the
 * receipt law from `POST /v1/ovoos/entity` — the same `runEntity` the CLI uses.
 *
 * Nothing here executes: a receipt is bounded, `ledgerMutation` is false, and
 * the law never emits VERIFIED for a sentence it composed itself.
 */

const API_BASE_URL = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '');

const OCEAN_BG = '#030812';
const OCEAN_CYAN = '#00e5ff';

type ReceiptStatus = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN';

type Receipt = {
  engine: string;
  status: ReceiptStatus;
  phase_t: number;
  evidence_hash: string;
  action: string;
  reason: string;
  next_delta: string;
};

type PhaseBoundary = { name: 'SPROUT' | 'BLOOM' | 'PLATEAU' | 'WILT'; min: number };

type Law = {
  engine: string;
  checksum_symbol: string;
  emitted_statuses: ReceiptStatus[];
  phases: PhaseBoundary[];
  ease_law: string;
  limitation: string;
  ledgerMutation: boolean;
};

type ReceiptResponse = {
  success: boolean;
  receipt: Receipt;
  phase: string;
  ledgerMutation: boolean;
};

const LAWS = [
  'Expected ≡ Observed',
  'No unverified action is accepted',
  'ATTEST, DON\'T ASSERT. UNKNOWN PRESERVED.',
  'POSSIBLE ≠ EXECUTED ≠ OBSERVED ≠ VERIFIED',
];

const STATUS_TONE: Record<ReceiptStatus, string> = {
  VERIFIED: '#22c55e',
  DIVERGENT: '#ef4444',
  UNKNOWN: '#eab308',
};

const paneStyle = {
  border: `1px solid ${OCEAN_CYAN}26`,
  background: 'rgba(4, 10, 24, 0.72)',
  borderRadius: '14px',
  padding: '16px',
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '10px',
};

const labelStyle = {
  fontSize: '10px',
  letterSpacing: '0.18em',
  textTransform: 'uppercase' as const,
  color: `${OCEAN_CYAN}99`,
};

function phaseFor(phases: PhaseBoundary[], t: number): string {
  let name = phases.length ? phases[0].name : 'UNKNOWN';
  for (const boundary of phases) {
    if (t >= boundary.min) name = boundary.name;
  }
  return name;
}

function easeAt(t: number): number {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 0));
  return (1 - Math.cos(clamped * Math.PI)) / 2;
}

export function EntityBodyPanel() {
  const [law, setLaw] = useState<Law | null>(null);
  const [lawError, setLawError] = useState<string | null>(null);
  const [intent, setIntent] = useState('');
  const [phaseT, setPhaseT] = useState(0);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE_URL}/v1/ovoos/entity`)
      .then(async (response) => {
        const payload = await response.json();
        if (cancelled) return;
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error || `law unavailable (${response.status})`);
        }
        setLaw(payload as Law);
      })
      .catch((error: unknown) => {
        if (!cancelled) setLawError(error instanceof Error ? error.message : String(error));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setRunning(true);
    setReceiptError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/v1/ovoos/entity`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ intent, phaseT }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || `receipt failed (${response.status})`);
      }
      setReceipt((payload as ReceiptResponse).receipt);
    } catch (error: unknown) {
      setReceiptError(error instanceof Error ? error.message : String(error));
    } finally {
      setRunning(false);
    }
  }

  return (
    <section
      aria-label="ΩVØØS entity body"
      style={{
        background: OCEAN_BG,
        color: '#d8f6ff',
        border: `1px solid ${OCEAN_CYAN}33`,
        borderRadius: '18px',
        padding: '20px',
        margin: '28px 0',
        boxShadow: `0 0 0 1px ${OCEAN_CYAN}12, 0 24px 60px rgba(0, 229, 255, 0.06)`,
      }}
    >
      <header style={{ marginBottom: '16px' }}>
        <div style={{ ...labelStyle, color: OCEAN_CYAN }}>ΩVØØS · LOCAL-FIRST ENTITY BODY</div>
        <h2 style={{ margin: '6px 0 0', fontSize: '20px', fontWeight: 600, color: '#eafcff' }}>
          Three panes, one ocean
        </h2>
        <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#7fb6c8' }}>
          A receipt is composed locally. Composition is not verification, and nothing here is executed.
        </p>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '14px',
          alignItems: 'stretch',
        }}
      >
        {/* Pane 1 — the law */}
        <div style={paneStyle}>
          <div style={labelStyle}>I · Law</div>
          <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', lineHeight: 1.7, color: '#b7e6f2' }}>
            {LAWS.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <div style={{ fontSize: '11px', color: '#7fb6c8' }}>
            {law ? `${law.ease_law} · checksum ${law.checksum_symbol}` : null}
            {lawError ? `Law unavailable: ${lawError}` : null}
          </div>

          <label htmlFor="ovoos-phase" style={{ ...labelStyle, marginTop: '4px' }}>
            Phase t = {phaseT.toFixed(2)} · {law ? phaseFor(law.phases, phaseT) : '—'} · ease{' '}
            {easeAt(phaseT).toFixed(3)}
          </label>
          <input
            id="ovoos-phase"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={phaseT}
            onChange={(event) => setPhaseT(Number(event.target.value))}
            style={{ accentColor: OCEAN_CYAN, width: '100%' }}
          />
        </div>

        {/* Pane 2 — the intent */}
        <form style={paneStyle} onSubmit={submit}>
          <div style={labelStyle}>II · Intent</div>
          <label htmlFor="ovoos-intent" style={{ fontSize: '13px', color: '#eafcff' }}>
            What shall we make real?
          </label>
          <textarea
            id="ovoos-intent"
            aria-label="State an intent for the ΩVØØS entity"
            value={intent}
            onChange={(event) => setIntent(event.target.value)}
            rows={4}
            placeholder="Map a patient plan for a book stall."
            style={{
              resize: 'vertical',
              background: 'rgba(3, 8, 18, 0.9)',
              border: `1px solid ${OCEAN_CYAN}40`,
              borderRadius: '10px',
              color: '#eafcff',
              padding: '10px',
              fontSize: '13px',
              fontFamily: 'inherit',
            }}
          />
          <button
            type="submit"
            disabled={running}
            style={{
              background: 'transparent',
              border: `1px solid ${OCEAN_CYAN}`,
              color: OCEAN_CYAN,
              borderRadius: '999px',
              padding: '8px 18px',
              fontSize: '11px',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              cursor: running ? 'progress' : 'pointer',
              opacity: running ? 0.6 : 1,
            }}
          >
            {running ? 'RECEIVING' : 'RECEIPT'}
          </button>
          <div style={{ fontSize: '11px', color: '#7fb6c8' }}>
            {law ? `Statuses this endpoint can emit: ${law.emitted_statuses.join(' / ')}` : null}
            {receiptError ? `Receipt unavailable: ${receiptError}` : null}
          </div>
        </form>

        {/* Pane 3 — the receipt */}
        <div style={paneStyle} aria-live="polite">
          <div style={labelStyle}>III · Receipt</div>
          {receipt ? (
            <>
              <div
                style={{
                  alignSelf: 'flex-start',
                  border: `1px solid ${STATUS_TONE[receipt.status]}`,
                  color: STATUS_TONE[receipt.status],
                  borderRadius: '999px',
                  padding: '4px 12px',
                  fontSize: '11px',
                  letterSpacing: '0.16em',
                }}
              >
                {receipt.status}
              </div>
              <dl style={{ margin: 0, fontSize: '12px', lineHeight: 1.6 }}>
                <dt style={labelStyle}>engine</dt>
                <dd style={{ margin: '0 0 6px' }}>{receipt.engine}</dd>
                <dt style={labelStyle}>action</dt>
                <dd style={{ margin: '0 0 6px' }}>{receipt.action}</dd>
                <dt style={labelStyle}>reason</dt>
                <dd style={{ margin: '0 0 6px', color: '#b7e6f2' }}>{receipt.reason}</dd>
                <dt style={labelStyle}>next_delta</dt>
                <dd style={{ margin: '0 0 6px', color: '#b7e6f2' }}>{receipt.next_delta}</dd>
                <dt style={labelStyle}>phase_t</dt>
                <dd style={{ margin: '0 0 6px' }}>{receipt.phase_t.toFixed(3)}</dd>
                <dt style={labelStyle}>evidence_hash</dt>
                <dd
                  style={{
                    margin: 0,
                    fontFamily:
                      "'JetBrains Mono', 'DM Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
                    fontSize: '11px',
                    color: OCEAN_CYAN,
                    wordBreak: 'break-all',
                  }}
                >
                  {receipt.evidence_hash}
                </dd>
              </dl>
            </>
          ) : (
            <p style={{ margin: 0, fontSize: '12px', color: '#7fb6c8' }}>
              UNKNOWN preserved. No receipt has been requested in this session.
            </p>
          )}
        </div>
      </div>

      <footer style={{ marginTop: '14px', fontSize: '10px', letterSpacing: '0.12em', color: '#5f93a5' }}>
        LEDGER MUTATION: FALSE · AUTHORIZED: FALSE · {law ? law.limitation : 'LAW NOT LOADED'}
      </footer>
    </section>
  );
}
