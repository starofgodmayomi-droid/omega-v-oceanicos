import React from 'react';
import {
  BODY_ORGANS, CONSTITUTION_LAWS, EQUATION_EXPANSION, HUMAN_ROOT_MATERIAL,
  LIFECYCLE_STAGES, MODEL_AGNOSTIC_NOTE, MYTHIC_LINES, MYTHIC_SEQUENCE,
  NEXT_DELTAS, NON_COLLAPSE_RULES, NON_COLLAPSE_STATES, REALITY_CHECKSUMS,
  REALITY_GUARDRAILS, REPOSITORY_APPS, REPOSITORY_CORE_PACKAGES,
  REPOSITORY_STATUS_NOTE, ROOT_EQUATION, SEED_EQUATION, SIMULATION_MODELS,
  VALUE_NON_COLLAPSE, VALUE_PATH, VALUE_STATUS_DEFAULT, VALUE_STATUS_NOTE,
  type NavigatorLayerId,
} from './oceanicos-navigator-model';

type Props = { layerId: NavigatorLayerId };

export function OceanicosNavigatorLayerContent({ layerId }: Props) {
  switch (layerId) {
    case 'seed':
      return <div className="navigator-content-grid navigator-seed-content">
        <div className="navigator-seed-drop" aria-hidden="true">💧</div>
        <div><p className="navigator-equation">{SEED_EQUATION}</p><p>∞ denotes iterated finite verified transitions—not unlimited action or an unbounded claim.</p></div>
      </div>;
    case 'equation':
      return <div><p className="navigator-equation">{ROOT_EQUATION}</p><div className="navigator-flowline" aria-label="Reality to next finite transition">
        {EQUATION_EXPANSION.map((step, index) => <React.Fragment key={`${step}-${index}`}><span>{step}</span>{index < EQUATION_EXPANSION.length - 1 && <b aria-hidden="true">→</b>}</React.Fragment>)}
      </div></div>;
    case 'law':
      return <div className="navigator-law-content">
        <p className="navigator-content-label">STATES ARE NOT SYNONYMS</p>
        <div className="navigator-state-chain">{NON_COLLAPSE_STATES.map((state, index) => <React.Fragment key={state}><span>{state}</span>{index < NON_COLLAPSE_STATES.length - 1 && <b aria-hidden="true">≠</b>}</React.Fragment>)}</div>
        <div className="navigator-rule-grid">{NON_COLLAPSE_RULES.map((rule) => <span key={rule}>{rule}</span>)}</div>
        <ul className="navigator-plain-list">{REALITY_GUARDRAILS.map((item) => <li key={item}>{item}</li>)}</ul>
      </div>;
    case 'body':
      return <div><div className="navigator-organ-grid">{BODY_ORGANS.map((organ) => <article className="navigator-organ" key={organ.name}>
        <h3>{organ.name}</h3><p className="navigator-organ-function">{organ.function}</p><p>{organ.note}</p>
      </article>)}</div><p className="navigator-caveat">Supplied framework map · names and roles do not establish that a service, connector, capability, or runtime is currently implemented or healthy.</p></div>;
    case 'constitution':
      return <div><ol className="navigator-law-list">{CONSTITUTION_LAWS.map((law) => <li key={law}>{law}</li>)}</ol>
        <p className="navigator-caveat">These are user-supplied guiding principles. This Navigator does not claim that each law is enforced by code or independently verified. “Memory is immortal” is preserved as principle text, not a durability guarantee.</p>
      </div>;
    case 'repository':
      return <div className="navigator-repository"><div className="navigator-repo-facts">
        <div><span>REPOSITORY</span><strong>starofgodmayomi-droid/omega-v-oceanicos</strong></div>
        <div><span>APPLICATIONS</span><strong>{REPOSITORY_APPS.map((name) => `apps/${name}`).join(' · ')}</strong></div>
        <div><span>SELECTED CORE PACKAGES</span><strong>{REPOSITORY_CORE_PACKAGES.map((name) => `packages/${name}`).join(' · ')}</strong></div>
        <div><span>CONSTITUTION</span><strong>docs/WHOLE-ECOSYSTEM-CONSTITUTION.md</strong></div>
      </div><p className="navigator-caveat">{REPOSITORY_STATUS_NOTE} Directory names describe repository structure, not deployed availability or feature completeness.</p>
        <a href="https://github.com/starofgodmayomi-droid/omega-v-oceanicos" target="_blank" rel="noreferrer">Open repository ↗</a>
      </div>;
    case 'lifecycle':
      return <div><div className="navigator-lifecycle-grid">{LIFECYCLE_STAGES.map((stage, index) => <div className="navigator-lifecycle-step" key={`${stage}-${index}`}><span>{String(index + 1).padStart(2, '0')}</span><strong>{stage}</strong></div>)}</div>
        <p className="navigator-caveat">This is a lifecycle schema, not a progress bar. Only a current command record and its attached evidence can establish the state of a specific transition.</p>
      </div>;
    case 'simulations':
      return <div><div className="navigator-simulation-grid">{SIMULATION_MODELS.map((model) => <article key={model.name}><h3>{model.name}</h3><p>{model.description}</p></article>)}</div>
        <p className="navigator-equation">MODELED ≠ OBSERVED ≠ VERIFIED</p><p className="navigator-caveat">A simulation can rehearse possibilities; it does not authorize action, produce external evidence, or claim completion.</p>
      </div>;
    case 'human-root':
      return <div><p className="navigator-human-root">MY OWN FROM ALL</p><div className="navigator-chip-list">{HUMAN_ROOT_MATERIAL.map((item) => <span key={item}>{item}</span>)}</div>
        <p className="navigator-human-promise">Preserved. Not promoted. Not erased.</p><p className="navigator-caveat">These labels describe possible source material; this surface does not read private journals or treat a thought, dream, reflection, or hope as an external fact.</p>
      </div>;
    case 'mythic':
      return <div><div className="navigator-flowline">{MYTHIC_SEQUENCE.map((step, index) => <React.Fragment key={step}><span>{step}</span>{index < MYTHIC_SEQUENCE.length - 1 && <b aria-hidden="true">→</b>}</React.Fragment>)}</div>
        <div className="navigator-mythic-lines">{MYTHIC_LINES.map((line) => <blockquote key={line}>{line}</blockquote>)}</div><p className="navigator-caveat">Symbolic frame only—not an externally verified claim about the universe, consciousness, or authority.</p>
      </div>;
    case 'checksum':
      return <div><div className="navigator-checksum-grid">{REALITY_CHECKSUMS.map((rule) => <span key={rule}>{rule}</span>)}</div>
        <p className="navigator-caveat">Human agency governs permission; observed reality governs outcome. These checks guide review and do not by themselves prove compliance.</p>
      </div>;
    case 'next-delta':
      return <div><ol className="navigator-next-list">{NEXT_DELTAS.map((delta, index) => <li key={delta}><b>{String(index + 1).padStart(2, '0')}</b><span>{delta}</span></li>)}</ol>
        <p className="navigator-caveat">Candidate next steps from the supplied handoff. No item is marked complete or scheduled by this view; each needs its own bounded intent, authority, evidence, and stop condition.</p>
      </div>;
    case 'invitation':
      return <div className="navigator-invitation"><p>ONE PROMPT → ONE BODY.</p><p>ONE ROOT. ONE CURRENT. MANY FORMS.</p><p>ASK → BUILD → VERIFY → BLESS → RETURN.</p><h3>WHAT SHALL WE MAKE REAL?</h3>
        <p className="navigator-caveat">“Bless” is symbolic language here—not a permission token, authorization, or verified state.</p>
      </div>;
  }
}

export function NavigatorValuePath() {
  return <section className="navigator-value-path" aria-label="Whole-body value path">
    <div className="navigator-value-heading"><div><span className="navigator-content-label">TRUTHOS · WHOLE-BODY VALUE</span><h3>Value must return to lived reality</h3></div>
      <div className="navigator-value-status"><span>EARNED VALUE · THIS SUMMARY</span><strong>{VALUE_STATUS_DEFAULT}</strong><small>{VALUE_STATUS_NOTE}</small></div>
    </div>
    <div className="navigator-flowline navigator-value-flow">{VALUE_PATH.map((step, index) => <React.Fragment key={step}><span>{step}</span>{index < VALUE_PATH.length - 1 && <b aria-hidden="true">→</b>}</React.Fragment>)}</div>
    <div className="navigator-rule-grid">{VALUE_NON_COLLAPSE.map((rule) => <span key={rule}>{rule}</span>)}</div>
    <p className="navigator-caveat">Human, ecological, social, creative, and economic value belong in the same account; no revenue or impact is inferred from a plan, proposal, or model output.</p>
  </section>;
}

export function NavigatorModelNote() {
  return <p className="navigator-model-note">{MODEL_AGNOSTIC_NOTE}</p>;
}
