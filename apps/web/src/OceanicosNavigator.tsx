import React, { useState, type FormEvent } from 'react';
import { humanStatus } from './oceanicosTheme';
import {
  NAVIGATOR_LAYERS,
  reconciliationLabel,
  resolveNavigatorCommand,
  type NavigatorLayerId,
} from './oceanicos-navigator-model';
import { OceanicosNavigatorLayerContent, NavigatorModelNote, NavigatorValuePath } from './OceanicosNavigatorLayers';

type Props = {
  intent: string;
  onIntentChange: (value: string) => void;
  onSubmit: () => void;
  onQuickPrompt: (prompt: string) => void;
  onNewWork: () => void;
  loading: boolean;
  command: any;
  realityStatus: string | null | undefined;
  humanGateRequired: boolean;
};

const INTENT_STARTERS = [
  { label: 'Explore a need', prompt: 'Help me explore one human need and what evidence would clarify it.' },
  { label: 'Trace value', prompt: 'Trace value from need to observed outcome; keep earned value unknown until sourced.' },
  { label: 'Map the body', prompt: 'Map the organs needed for one bounded transition; distinguish concepts from current connections.' },
  { label: 'Build one Δ', prompt: 'Build and test one finite slice, then report what was actually observed.' },
] as const;

const ALL_LAYER_IDS = NAVIGATOR_LAYERS.map((layer) => layer.id);

export function OceanicosNavigator({
  intent,
  onIntentChange,
  onSubmit,
  onQuickPrompt,
  onNewWork,
  loading,
  command,
  realityStatus,
  humanGateRequired,
}: Props) {
  const [openLayers, setOpenLayers] = useState<Set<NavigatorLayerId>>(() => new Set(['body']));
  const [navigatorCommand, setNavigatorCommand] = useState('');
  const [navigatorNotice, setNavigatorNotice] = useState('Expansion commands run locally in this page; they do not invoke an AI provider.');
  const current = command?.command;
  const actualReality = command?.reality;
  const currentStatus = current?.status ? humanStatus(current.status) : 'NO ACTIVE TRANSITION';
  const observedStatus = actualReality?.status ?? actualReality?.classification ?? null;
  const realityLabel = current
    ? reconciliationLabel(current.status, observedStatus)
    : 'NO CURRENT TRANSITION';
  const expected = current?.change?.stateAfter ?? current?.execution?.stateAfter ?? 'NOT SPECIFIED';
  const observed = actualReality?.observedState ?? 'NOT OBSERVED';
  const ledgerLabel = realityStatus ? humanStatus(realityStatus) : 'UNKNOWN';

  const setLayerOpen = (id: NavigatorLayerId, open: boolean) => {
    setOpenLayers((previous) => {
      const next = new Set(previous);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const runNavigatorCommand = (raw: string) => {
    const action = resolveNavigatorCommand(raw);
    if (action.kind === 'expand-all') {
      setOpenLayers(new Set(ALL_LAYER_IDS));
      setNavigatorNotice('All Navigator layers expanded.');
      return;
    }
    if (action.kind === 'collapse-all') {
      setOpenLayers(new Set());
      setNavigatorNotice('All Navigator layers collapsed.');
      return;
    }
    if (action.kind === 'expand-layer' || action.kind === 'collapse-layer') {
      const layer = NAVIGATOR_LAYERS.find((item) => item.id === action.layerId);
      const shouldOpen = action.kind === 'expand-layer';
      setLayerOpen(action.layerId, shouldOpen);
      setNavigatorNotice(`${shouldOpen ? 'Expanded' : 'Collapsed'} ${layer?.title ?? action.layerId}.`);
      if (shouldOpen) requestAnimationFrame(() => document.getElementById(`navigator-layer-${action.layerId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      return;
    }
    setNavigatorNotice('No layer matched. Try “expand Law”, “expand Body”, “expand Next Δ”, “expand ALL”, or “collapse ALL”.');
  };

  const submitNavigatorCommand = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    runNavigatorCommand(navigatorCommand);
  };

  const submitIntent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (intent.trim() && !loading) onSubmit();
  };

  const allExpanded = openLayers.size === ALL_LAYER_IDS.length;

  return (
    <section className="navigator-surface" aria-label="Ω infinity-v expandable Navigator">
      <header className="navigator-header">
        <div className="navigator-brand">
          <span className="navigator-brand-mark" aria-hidden="true">◉</span>
          <div><strong>OCEANICOS <span>Ω∞v NAVIGATOR</span></strong><small>MY OWN FROM ALL · LIVING VALUE & REALITY OS</small></div>
        </div>
        <div className="navigator-header-right">
          <span>ONE ROOT</span><i>•</i><span>ONE CURRENT</span><i>•</i><span>MANY FORMS</span>
        </div>
      </header>

      <div className="navigator-hero-grid">
        <section className="navigator-intent-panel" aria-labelledby="navigator-question">
          <div className="navigator-level-marker"><span>💧</span><span>LEVEL 0 · THE SEED</span></div>
          <div className="navigator-root-line">ONE PROMPT <b>→</b> ONE BODY</div>
          <h1 id="navigator-question">What shall we make real?</h1>
          <p className="navigator-hero-copy">Start with a human need, question, idea, or observed change. Then make one finite transition—without collapsing intent, authority, action, evidence, or value.</p>
          <form className="navigator-intent-form" onSubmit={submitIntent}>
            <label className="navigator-sr-only" htmlFor="navigator-intent">Describe one bounded intent</label>
            <textarea
              id="navigator-intent"
              value={intent}
              onChange={(event) => onIntentChange(event.target.value)}
              maxLength={2000}
              rows={2}
              placeholder="Drop one intention, question, need, or bounded change…"
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  if (intent.trim() && !loading) onSubmit();
                }
              }}
            />
            <div className="navigator-intent-actions">
              <small>INTENT → PROPOSAL · NO EXECUTION FROM THIS SUBMIT</small>
              <button type="submit" disabled={!intent.trim() || loading}>{loading ? 'Preparing Δ…' : 'Propose one Δ'}</button>
            </div>
          </form>
          <p className="navigator-intent-note">Submitting creates a command proposal through the existing Oceanicos API. It is not an external-model chat, execution, or verified outcome.</p>
          <div className="navigator-intent-starters" aria-label="Intent starters">
            {INTENT_STARTERS.map((starter) => <button type="button" key={starter.label} onClick={() => onQuickPrompt(starter.prompt)}>{starter.label}</button>)}
          </div>
        </section>

        <aside className="navigator-now-panel" aria-label="Current transition, reality, and value">
          <div className="navigator-now-heading">
            <span className="navigator-content-label">NOW · LOADED EVIDENCE</span>
            {current && <button type="button" onClick={onNewWork}>New Δ</button>}
          </div>
          <div className="navigator-state-primary">
            <span>CURRENT TRANSITION</span>
            <strong>{currentStatus}</strong>
            {current?.intent ? <p>{current.intent}</p> : <p>No active transition is loaded in this view; this does not establish that no earlier work exists.</p>}
          </div>
          <div className="navigator-now-metrics">
            <div><span>EXPECTED</span><strong>{expected}</strong></div>
            <div><span>OBSERVED</span><strong>{observed}</strong></div>
            <div><span>RECONCILIATION</span><strong>{realityLabel}</strong></div>
            <div><span>HUMAN GATE</span><strong>{humanGateRequired ? 'REQUIRED' : 'NOT REQUIRED BY CURRENT CONFIG'}</strong></div>
          </div>
          <div className="navigator-ledger-signal"><span>LATEST LEDGER SIGNAL</span><strong>{ledgerLabel}</strong><small>Not a whole-system health verdict.</small></div>
          <div className="navigator-earned-value"><span>EARNED VALUE · THIS SUMMARY</span><strong>UNKNOWN</strong><small>Value records are not queried here; unknown does not mean none exist.</small></div>
        </aside>
      </div>

      <div className="navigator-value-return">
        <span>ASK</span><b>→</b><span>BUILD</span><b>→</b><span>VERIFY</span><b>→</b><span>BLESS</span><b>→</b><span>RETURN</span>
        <small>“Bless” is symbolic wording, not an authorization or state.</small>
      </div>

      <div className="navigator-expand-toolbar">
        <div><span className="navigator-content-label">EXPAND ON DEMAND</span><p>Open a level by name, or reveal the whole stack.</p></div>
        <form className="navigator-command-form" onSubmit={submitNavigatorCommand}>
          <label className="navigator-sr-only" htmlFor="navigator-expand-command">Navigator expand command</label>
          <input id="navigator-expand-command" value={navigatorCommand} onChange={(event) => setNavigatorCommand(event.target.value)} placeholder="expand Law · expand Body · expand ALL" />
          <button type="submit">Open</button>
        </form>
        <button className="navigator-expand-all" type="button" onClick={() => runNavigatorCommand(allExpanded ? 'collapse all' : 'expand all')} aria-expanded={allExpanded}>{allExpanded ? 'Collapse all' : 'Expand all'}</button>
      </div>
      <p className="navigator-command-notice" aria-live="polite">{navigatorNotice}</p>
      <nav className="navigator-quick-jumps" aria-label="Quick expansion commands">
        {['expand Law', 'expand Body', 'expand Lifecycle', 'expand Next Δ'].map((commandText) => <button type="button" key={commandText} onClick={() => runNavigatorCommand(commandText)}>{commandText}</button>)}
      </nav>

      <div className="navigator-level-stack">
        {NAVIGATOR_LAYERS.map((layer) => (
          <details
            className="navigator-layer"
            id={`navigator-layer-${layer.id}`}
            key={layer.id}
            open={openLayers.has(layer.id)}
            onToggle={(event) => setLayerOpen(layer.id, event.currentTarget.open)}
          >
            <summary>
              <span className="navigator-layer-number">{layer.level}</span>
              <span className="navigator-layer-title">{layer.title}</span>
              <span className="navigator-layer-summary">{layer.summary}</span>
              <span className="navigator-layer-toggle" aria-hidden="true">＋</span>
            </summary>
            <div className="navigator-layer-body"><OceanicosNavigatorLayerContent layerId={layer.id} /></div>
          </details>
        ))}
      </div>

      <NavigatorValuePath />
      <NavigatorModelNote />
    </section>
  );
}
