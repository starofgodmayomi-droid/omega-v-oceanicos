import React from 'react';

type State = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' | 'NOT_EXECUTED';
type Props = {
  intent: string; onIntentChange: (value: string) => void; onSubmit: () => void;
  loading: boolean; streamConnected: boolean; simulationMode: boolean; humanGateRequired: boolean;
  realityStatus?: string | null; ledgerIntegrity: { valid: boolean; height: number } | null;
  ecosystemBody: any; ecosystemStatus?: any; ecosystemStatusState?: 'loading' | 'available' | 'error'; ecosystemStatusError?: string | null; command: any;
};

const ORGANS = [
  ['🧠','AI SOUL','Map AI SOUL: purpose, implementation, authority boundary, runtime state, and evidence.'],
  ['🪞','MIRRIO','Map MIRRIO: reflection inputs, observed state, assumptions, and evidence boundaries.'],
  ['🧬','KAI','Map KAI: data flow, context, dependencies, and verified capabilities.'],
  ['🗣','ƆREADE','Map ƆREADE: conversation, meaning translation, and bounded action flow.'],
  ['💎','TRUTHOS','Map TRUTHOS: claims, evidence, disagreement, and verification contracts.'],
  ['🎨','ECHOFRAME','Map ECHOFRAME: creative inputs, outputs, provenance, and review.'],
  ['Δ','ΩIR','Explain the ΩIR change contract from current state and intent to decision and result.'],
  ['Ω','Ω∞v','Inspect the Ω∞v verification spine and show which claims have direct evidence.'],
  ['🐙','GitHub','Inspect repository source, open pull requests, tests, and the highest-value next change.'],
  ['📚','Notion','Reconcile relevant Notion specifications, decisions, tasks, and evidence links.'],
  ['🔌','Composio','List connected tool capabilities relevant to this request, including permission and availability limits.'],
  ['⚙','Workers','Map bounded workers, capability, authority, limits, and stop conditions.'],
] as const;
const STARTERS = [
  'Map the whole ecosystem body',
  'Inspect current runtime and unknowns',
  'Find the highest-value next finite change',
  'Trace GitHub × Notion × Composio',
];
const FLOW = ['INTENT','CONTEXT','PLAN','AUTHORITY','BOUND','EXECUTE','OBSERVE','VERIFY','REMEMBER','VALUE'];

function evidenceState(value: unknown): State {
  const state = String(value ?? '').toUpperCase().replace(/\s+/g, '_');
  return state === 'VERIFIED' || state === 'DIVERGENT' || state === 'NOT_EXECUTED' ? state : 'UNKNOWN';
}
function EvidenceSignal({label,value,status,detail}:{label:string;value:string;status:State;detail:string}) {
  return <div className="oceanic-front-signal">
    <div className="oceanic-front-signal__top"><span>{label}</span><span className="oceanic-front-status" data-state={status.toLowerCase()}>{status}</span></div>
    <strong>{value}</strong><small>{detail}</small>
  </div>;
}

export function UnifiedOceanicFrontView(props: Props) {
  const {intent,onIntentChange,onSubmit,loading,streamConnected,simulationMode,humanGateRequired,realityStatus,ledgerIntegrity,ecosystemBody,ecosystemStatus,ecosystemStatusState='loading',ecosystemStatusError,command}=props;
  const bodyState=evidenceState(ecosystemBody?.status);
  const realityState=evidenceState(realityStatus);
  const commandState=evidenceState(command?.reality?.classification);
  return <section className="oceanic-front-view" aria-label="OceanicOS unified conversational front view">
    <header className="oceanic-front-header">
      <div className="oceanic-front-brand"><span className="oceanic-front-mark" aria-hidden="true">Ω∞v</span><div><span className="oceanic-front-eyebrow">OMEGA × OCEANICOS</span><strong>Full-stack intelligence</strong></div></div>
      <div className="oceanic-front-header-state">
        <span className="oceanic-front-presence" data-connected={streamConnected}><i aria-hidden="true"/>{streamConnected?'Runtime stream connected':'Runtime stream not connected'}</span>
        <span className="oceanic-front-mode">{simulationMode?'BOUNDED SIMULATION':'RUNTIME MODE NOT PROVEN'}</span>
      </div>
    </header>

    <div className="oceanic-front-intro">
      <div><span className="oceanic-front-eyebrow">ONE BODY · ONE CURRENT · MANY CAPABILITIES</span>
        <h1>Your whole ecosystem, in one conversation.</h1>
        <p>Bring an idea, question, or goal. OceanicOS helps route it through relevant capabilities while keeping permissions, actual results, and unknowns visible.</p></div>
      <div className="oceanic-front-core" role="img" aria-label="Conceptual ecosystem map with OceanicOS at the center">
        <div className="oceanic-front-orbit oceanic-front-orbit--outer"/><div className="oceanic-front-orbit oceanic-front-orbit--inner"/>
        <div className="oceanic-front-core__center"><span>OCEANICOS</span><strong>Ω∞v</strong></div>
        <span className="oceanic-front-node oceanic-front-node--top">INTENT</span><span className="oceanic-front-node oceanic-front-node--left">MEMORY</span>
        <span className="oceanic-front-node oceanic-front-node--right">TOOLS</span><span className="oceanic-front-node oceanic-front-node--bottom">EVIDENCE</span>
      </div>
    </div>

    <div className="oceanic-front-grid">
      <aside className="oceanic-front-panel oceanic-front-organs" aria-label="Whole ecosystem body map">
        <div className="oceanic-front-panel-heading"><span className="oceanic-front-eyebrow">THE BODY</span><h2>Choose a current</h2><p>Choose an organ to draft a focused question; it does not execute anything.</p></div>
        <div className="oceanic-front-organ-list">{ORGANS.map(([icon,label,prompt])=><button className="oceanic-front-organ" key={label} type="button" onClick={()=>onIntentChange(prompt)}><span aria-hidden="true">{icon}</span><span>{label}</span><span className="oceanic-front-organ-arrow" aria-hidden="true">↗</span></button>)}</div>
        <small className="oceanic-front-footnote">Organ names describe the architecture vocabulary; they do not prove that each component is running or connected.</small>
      </aside>

      <div className="oceanic-front-center">
        <section className="oceanic-front-panel oceanic-front-conversation" aria-label="Conversation with the OceanicOS full-stack assistant">
          <div className="oceanic-front-panel-heading oceanic-front-chat-heading"><span className="oceanic-front-assistant-avatar" aria-hidden="true">💧</span><div><span className="oceanic-front-eyebrow">OCEANICOS · CONVERSATIONAL FRONT VIEW</span><h2>What shall we make real?</h2><p>This composer routes intent into the existing OMEGA proposal and lifecycle flow; it is not a claim of a separate general-purpose chat backend.</p></div></div>
          <div className="oceanic-front-welcome"><span className="oceanic-front-welcome-mark" aria-hidden="true">Ω</span><div><strong>One request. The relevant parts of the body.</strong><p>Clarify the outcome, identify source-of-truth context, and keep the plan, permissions, execution, observation, and verification distinct.</p></div></div>
          <div className="oceanic-front-quick-prompts" aria-label="Suggested starting prompts">{STARTERS.map(p=><button type="button" key={p} onClick={()=>onIntentChange(p)}>{p}<span aria-hidden="true"> ↗</span></button>)}</div>
          <form className="oceanic-front-composer" aria-label="OceanicOS intent submission" onSubmit={(event:React.FormEvent<HTMLFormElement>)=>{event.preventDefault();if(intent.trim()&&!loading)onSubmit();}}>
            <label htmlFor="oceanic-front-intent">Your intent</label><textarea id="oceanic-front-intent" value={intent} onChange={event=>onIntentChange(event.target.value)} maxLength={2000} rows={3} placeholder="Ask OceanicOS to explore, build, explain, verify, or connect something…"/>
            <div className="oceanic-front-composer-footer"><span>{intent.length}/2000 · Drafting does not execute an action.</span><button type="submit" disabled={loading||!intent.trim()}>{loading?'Preparing…':'Route intent'} <span aria-hidden="true">→</span></button></div>
          </form>
          <div className="oceanic-front-authority-note"><span aria-hidden="true">🔐</span>{humanGateRequired?'Consequential actions require a human authorization gate.':'The capability snapshot reports no human gate; check action-specific policy before acting.'}</div>
        </section>
        <section className="oceanic-front-panel oceanic-front-current" aria-label="Current request state">
          <div className="oceanic-front-panel-heading"><span className="oceanic-front-eyebrow">CURRENT REQUEST</span><h2>{command?.command?.intent||'No request submitted yet'}</h2></div>
          <div className="oceanic-front-request-meta"><span className="oceanic-front-status" data-state={commandState.toLowerCase()}>{command?commandState:'NOT_EXECUTED'}</span><span>{command?.command?.commandId?`Command ${command.command.commandId}`:'No command ID observed'}</span></div>
          <p className="oceanic-front-footnote">A returned command is not proof of an external effect. Inspect its actual state in the lifecycle and evidence panels below.</p>
        </section>
      </div>

      <aside className="oceanic-front-panel oceanic-front-reality" aria-label="Observed reality and evidence signals">
        <div className="oceanic-front-panel-heading"><span className="oceanic-front-eyebrow">MIRROR WATER · SIGNALS</span><h2>What is actually known?</h2><p>Only values supplied by current dashboard state appear here.</p></div>
        <div className="oceanic-front-signal-list">
          <EvidenceSignal label="Runtime stream" value={streamConnected?'Connected':'Not connected'} status="UNKNOWN" detail="Connectivity is not verification."/>
          <EvidenceSignal label="Ledger integrity" value={ledgerIntegrity?(ledgerIntegrity.valid?`Valid · height ${ledgerIntegrity.height}`:'Integrity check failed'):'Unavailable'} status={ledgerIntegrity?(ledgerIntegrity.valid?'VERIFIED':'DIVERGENT'):'UNKNOWN'} detail="Limited to the observed local ledger check."/>
          <EvidenceSignal label="Ecosystem body" value={ecosystemBody?String(ecosystemBody.status??'Snapshot returned'):'Snapshot unavailable'} status={bodyState} detail={ecosystemBody?.bodyVersion?`Body version ${ecosystemBody.bodyVersion}`:'Source: ecosystem body API'}/>
          <EvidenceSignal label="Reality evidence" value={realityStatus?String(realityStatus):'Unavailable'} status={realityState} detail="Unknown values remain unknown."/>
        </div>
        <div className="oceanic-front-system-notes"><div><span>Authority</span><strong>{humanGateRequired?'Human gate required':'Review action policy'}</strong></div><div><span>Execution mode</span><strong>{simulationMode?'Simulation':'Not proven live'}</strong></div></div>
      </aside>
    </div>

    <section className="oceanic-front-panel oceanic-front-status-evidence" aria-label="Read-only ecosystem status evidence">
      <div className="oceanic-front-panel-heading">
        <span className="oceanic-front-eyebrow">READ-ONLY API · /v1/ecosystem/status</span>
        <h2>Evidence snapshot</h2>
        <p>Separate from the ecosystem-body snapshot. This is an API contract response, not proof of deployment or live external connectivity.</p>
      </div>
      {ecosystemStatusState === 'loading' && <p role="status">Loading ecosystem status evidence…</p>}
      {ecosystemStatusState === 'error' && <div role="alert"><strong>Status snapshot unavailable.</strong><p>{ecosystemStatusError || 'The status endpoint could not be read.'}</p><p>Unknown remains unknown; no live status is inferred.</p></div>}
      {ecosystemStatusState === 'available' && ecosystemStatus && <>
        <p><strong>{ecosystemStatus.contract?.name || 'Ecosystem'} · schema {ecosystemStatus.contract?.schemaVersion || 'unknown'}</strong></p>
        <p>Evaluated at: <time dateTime={ecosystemStatus.contract?.evaluatedAt}>{ecosystemStatus.contract?.evaluatedAt || 'Timestamp unavailable'}</time> · scope: {ecosystemStatus.oneBody?.scope || 'unknown'}</p>
        <ul className="oceanic-front-status-layers">{ecosystemStatus.layers.map((layer: any) => <li key={layer.layer}>
          <strong>{layer.layer}</strong> — {layer.evidenceStatus || 'UNKNOWN'}
          <p>Source: {layer.source || 'Not supplied'} · Scope: {layer.scope || 'unknown'}</p>
          <p>Policy: {layer.policy || 'Not supplied'} · Provenance: {layer.provenance || 'Not supplied'}</p>
        </li>)}</ul>
        <div><strong>Governance:</strong> {ecosystemStatus.governance?.status || 'UNKNOWN'} · auth mode: {ecosystemStatus.governance?.authMode || 'unknown'} · fail closed: {String(ecosystemStatus.governance?.failClosed ?? 'unknown')}</div>
        <div><strong>Limitations</strong><ul>{(ecosystemStatus.oneBody?.limitations || ['Limitations were not supplied by the endpoint.']).map((item: string, i: number) => <li key={i}>{item}</li>)}</ul></div>
      </>}
    </section>

    <section className="oceanic-front-flow" aria-label="Whole ecosystem operating flow"><div className="oceanic-front-flow-head"><div><span className="oceanic-front-eyebrow">THE ONE CURRENT</span><h2>Intent to value, with evidence all the way through.</h2></div><small>Operating design · individual stage completion is not inferred from this diagram.</small></div><ol>{FLOW.map((step,i)=><li key={step}><span>{String(i+1).padStart(2,'0')}</span>{step}</li>)}</ol></section>
  </section>;
}
export default UnifiedOceanicFrontView;
