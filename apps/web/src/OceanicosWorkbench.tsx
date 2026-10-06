import React, { useRef, type FormEvent } from 'react';
import { humanStatus } from './oceanicosTheme';
import {
  OBSERVED_VALUE_DEFAULT,
  OBSERVED_VALUE_NOTE,
  PROVIDER_CONNECTION_NOTE,
  PROVIDER_EXAMPLES,
  VALUE_DOMAINS,
  VALUE_STAGES,
  WORKSPACE_ORGANS,
  WORKSPACE_PROMPTS,
} from './oceanicos-workspace-model';

type Props = {
  intent: string;
  onIntentChange: (value: string) => void;
  onSubmit: () => void;
  onQuickPrompt: (prompt: string) => void;
  onNewWork: () => void;
  loading: boolean;
  command: any;
  realityStatus: string | null | undefined;
};

export function OceanicosWorkbench({
  intent,
  onIntentChange,
  onSubmit,
  onQuickPrompt,
  onNewWork,
  loading,
  command,
  realityStatus,
}: Props) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const currentCommand = command?.command;
  const realityLabel = realityStatus ? humanStatus(realityStatus) : 'AWAITING OBSERVATION';

  const choosePrompt = (prompt: string) => {
    onIntentChange(prompt);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const startNewWork = () => {
    onNewWork();
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (intent.trim() && !loading) onSubmit();
  };

  return (
    <section className="oceanicos-workbench" aria-label="Oceanicos conversation and whole-body value workspace">
      <header className="ow-topbar">
        <div className="ow-brand">
          <span className="ow-brand-mark" aria-hidden="true">◉</span>
          <span>OCEANICOS <small>WORKSPACE</small></span>
        </div>
        <div className="ow-topbar-meta">
          <span className="ow-reality-pill"><i /> Reality · {realityLabel}</span>
          <span className="ow-provider-pill" title={PROVIDER_CONNECTION_NOTE}>Provider access · not connected</span>
        </div>
      </header>

      <div className="ow-layout">
        <aside className="ow-rail" aria-label="Workspace navigation">
          <button className="ow-new-work" type="button" onClick={startNewWork}>
            <span aria-hidden="true">＋</span> New work
          </button>

          <nav className="ow-nav" aria-label="Work views">
            <button type="button" className="active" onClick={() => onQuickPrompt('Show what matters across the whole ecosystem body.')}>⌂ <span>Whole body</span></button>
            <button type="button" onClick={() => onQuickPrompt('Trace a value path from human need to observed outcome; keep unknowns explicit.')}>◇ <span>Value path</span></button>
            <button type="button" onClick={() => onQuickPrompt('Show current reality evidence, divergence, and unknowns.')}>◎ <span>Reality & evidence</span></button>
          </nav>

          <div className="ow-rail-section">
            <span className="ow-kicker">ECOSYSTEM ORGANS</span>
            {WORKSPACE_ORGANS.map(([glyph, label]) => (
              <button key={label} type="button" onClick={() => onQuickPrompt(`Map ${label} within the whole ecosystem body; distinguish intent, evidence, authority, and current unknowns.`)}>
                <b aria-hidden="true">{glyph}</b><span>{label}</span>
              </button>
            ))}
          </div>

          <div className="ow-current-work">
            <span className="ow-kicker">CURRENT WORK · THIS SESSION</span>
            {currentCommand?.intent ? <p>{currentCommand.intent}</p> : <p>No proposal in this session yet.</p>}
            <small>{currentCommand?.status ? `Command state · ${humanStatus(currentCommand.status)}` : 'No chat history is being inferred or fabricated.'}</small>
          </div>
        </aside>

        <main className="ow-conversation" aria-label="Current conversation">
          <div className="ow-conversation-bar">
            <div>
              <strong>MY OWN FROM ALL</strong>
              <span>Human Root · bounded conversation</span>
            </div>
            <button type="button" className="ow-model-menu" disabled title={PROVIDER_CONNECTION_NOTE}>
              Oceanicos <span>Provider not connected⌄</span>
            </button>
          </div>

          <div className="ow-thread">
            {currentCommand?.intent ? (
              <div className="ow-transcript" aria-live="polite">
                <article className="ow-message ow-message-human">
                  <span>You · intent</span>
                  <p>{currentCommand.intent}</p>
                </article>
                <article className="ow-message ow-message-system">
                  <span><i aria-hidden="true">◉</i> OCEANICOS · bounded workflow</span>
                  <strong>{humanStatus(currentCommand.status ?? 'UNKNOWN')}</strong>
                  <p>A command record is available for review. Inspect its evidence, authority, and next action below; proposal creation is not execution or verified outcome.</p>
                </article>
              </div>
            ) : (
              <div className="ow-welcome">
                <div className="ow-welcome-mark" aria-hidden="true">◉</div>
                <span className="ow-kicker">ONE ROOT · ONE BODY · MANY FINITE FORMS</span>
                <h1>What shall we make real?</h1>
                <p>Start with a need, question, idea, or observed change. We’ll keep meaning, evidence, authority, action, and outcome distinct.</p>
                <div className="ow-prompt-cards">
                  {WORKSPACE_PROMPTS.map((item) => (
                    <button key={item.label} type="button" onClick={() => choosePrompt(item.prompt)}>
                      <strong>{item.label}</strong><span>{item.prompt}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <form className="ow-composer" onSubmit={submit}>
            <label className="ow-sr-only" htmlFor="oceanicos-prompt">Message Oceanicos with an intent</label>
            <textarea
              id="oceanicos-prompt"
              ref={inputRef}
              value={intent}
              onChange={(event) => onIntentChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  if (intent.trim() && !loading) onSubmit();
                }
              }}
              maxLength={2000}
              rows={3}
              placeholder="Message Oceanicos… describe what matters, what you want to change, or what you want to understand."
            />
            <div className="ow-composer-footer">
              <span>Bounded intent · human authority stays explicit · Shift+Enter for a new line</span>
              <button type="submit" disabled={!intent.trim() || loading} aria-label="Submit bounded proposal">{loading ? 'Preparing…' : '↑'}</button>
            </div>
          </form>
          <p className="ow-composer-note">Submitting uses the Oceanicos command API. It does not send prompts to ChatGPT, Manus, Grok, or another external provider.</p>
        </main>

        <aside className="ow-value-rail" aria-label="Whole ecosystem value and provider status">
          <div className="ow-value-heading">
            <span className="ow-kicker">VALUE AROUND THE WHOLE BODY</span>
            <h2>One living value current</h2>
            <p>Human needs, living systems, creative work, and exchange belong to one ecosystem.</p>
          </div>

          <div className="ow-body-orbit" role="img" aria-label="Conceptual ecosystem body with its organs arranged around Oceanicos; not live topology">
            <span className="ow-orbit-node ow-node-one">AI SOUL</span>
            <span className="ow-orbit-node ow-node-two">MIRRIO</span>
            <span className="ow-orbit-node ow-node-three">KAI</span>
            <span className="ow-orbit-node ow-node-four">ƆREADE</span>
            <span className="ow-orbit-node ow-node-five">TRUTHOS</span>
            <span className="ow-orbit-node ow-node-six">ECHOFRAME</span>
            <span className="ow-body-core">OCEANICOS<br /><small>one body</small></span>
          </div>
          <small className="ow-orbit-caption">Conceptual map · not live system topology</small>

          <div className="ow-value-domains" aria-label="Whole-life value domains">
            <span className="ow-kicker">WHAT VALUE SURROUNDS</span>
            <div>{VALUE_DOMAINS.map((domain) => <span key={domain}>{domain}</span>)}</div>
          </div>

          <div className="ow-value-loop">
            <span className="ow-kicker">VALUE PATH · HYPOTHESIS TO EVIDENCE</span>
            <ol>{VALUE_STAGES.map((stage, index) => <li key={stage}><b>{String(index + 1).padStart(2, '0')}</b>{stage}</li>)}</ol>
          </div>

          <div className="ow-observed-value">
            <span>OBSERVED / EARNED VALUE</span>
            <strong>{OBSERVED_VALUE_DEFAULT}</strong>
            <small>{OBSERVED_VALUE_NOTE}</small>
          </div>
          <p className="ow-value-law">Idea ≠ business · revenue model ≠ revenue · possible income ≠ earned income.</p>

          <div className="ow-provider-examples">
            <span className="ow-kicker">PROVIDER EXAMPLES</span>
            <div>{PROVIDER_EXAMPLES.map((provider) => <span key={provider}>{provider}</span>)}</div>
            <small>{PROVIDER_CONNECTION_NOTE}</small>
          </div>
        </aside>
      </div>
    </section>
  );
}
