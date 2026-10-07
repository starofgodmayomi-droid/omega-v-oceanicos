import React, { useState } from 'react';
import { theme } from './oceanicosTheme';

type Props = { onFocusCommand: (prompt: string) => void };

type Level = {
  id: string;
  label: string;
  seed: string;
  detail: React.ReactNode;
};

const levels: Level[] = [
  { id: 'seed', label: '0 · SEED', seed: '💧', detail: <p className="compress-copy">The root is intentionally small. Everything else is a zoom, not a new system.</p> },
  { id: 'equation', label: '1 · EQUATION', seed: 'Ω∞v ::= VERIFY(ΔREALITY)', detail: <p className="compress-copy">REALITY → OBSERVE → VERIFY → AUTHORIZE → BOUND → EXECUTE → OBSERVE → RECONCILE → ATTEST → REMEMBER → NEXT Δ ↺∞</p> },
  { id: 'law', label: '2 · LAW', seed: 'POSSIBLE ≠ VERIFIED', detail: <><p className="compress-copy">Possible ≠ known ≠ representable ≠ permitted ≠ proposed ≠ attempted ≠ executed ≠ observed ≠ verified ≠ attested ≠ deployed ≠ healthy ≠ correct.</p><div className="compress-law-grid">{['MODEL OUTPUT ≠ CLAIM', 'CAPABILITY ≠ AUTHORITY', 'PROPOSAL ≠ ACTION', 'SIGNATURE ≠ AUTHORIZATION', 'TEST PASS ≠ REALITY', 'SIMULATION ≠ REALITY', 'MEMORY ≠ PROOF'].map((law) => <span key={law}>{law}</span>)}</div></> },
  { id: 'body', label: '3 · BODY', seed: 'ONE BODY · MANY ORGANS', detail: <div className="compress-organ-grid">{['💧 Drop', 'Ω∞v Compiler', 'OceanicOS Runtime', 'Charter', 'Oceanic IR', 'Observer', 'Truth Weaver', 'Verification Fabric', 'Attestation', 'VaaS', 'KAI Memory', 'ECHOFRAME Creation', 'TRUTHOS Value', 'ƆREADE Language', 'MOOD Context', 'MIRRIO Reflection', 'Workers', 'Continuous Becoming'].map((organ) => <span key={organ}>{organ}</span>)}</div> },
  { id: 'constitution', label: '4 · CONSTITUTION', seed: 'TRUTH IS THE ONLY CURRENCY', detail: <ol className="compress-list">{['Truth is the only currency', 'Silence is default', 'Beauty is clarity', 'Radical honesty with surgical compassion', 'Your behavior decides who stays', 'Proactive, not reactive', 'Zero to finish', 'Memory is immortal', 'Pidgin first', 'All for all — zero competition'].map((law) => <li key={law}>{law}</li>)}</ol> },
  { id: 'repository', label: '5 · REPOSITORY', seed: 'NOT RE-VERIFIED IN THIS TURN', detail: <div className="compress-repo"><strong>starofgodmayomi-droid/omega-v-oceanicos</strong><span>Monorepo · pnpm · Node ≥22 · Apps: api, web</span><span>Packages: types · observer · verification · remember · mini · attestation · gateway · kernel</span><small>Repository status is a claim surface; CI and local commands remain the court.</small></div> },
  { id: 'lifecycle', label: '6 · LIFECYCLE', seed: 'INTENT → NEXT Δ', detail: <div className="compress-lifecycle">{['Human intent', 'ΩIR', 'Evidence', 'Verify', 'Authority', 'Policy', 'Admission', 'Bounded worker', 'Execution', 'Observation', 'Reconciliation', 'Verified · Divergent · Unknown · Not executed', 'Attestation', 'Provenance', 'Memory', 'Replay', 'Learn', 'Recompile', 'Next Δ'].map((stage, index) => <React.Fragment key={stage}><span>{stage}</span>{index < 18 && <b>→</b>}</React.Fragment>)}</div> },
  { id: 'simulations', label: '7 · SIMULATIONS', seed: 'MODELED ≠ OBSERVED ≠ VERIFIED', detail: <div className="compress-simulations">{[['Water', 'flow of the body'], ['Earth', 'stewardship of the planet'], ['Reality', 'the next Δ itself']].map(([name, purpose]) => <div key={name}><strong>{name} simulation</strong><span>{purpose}</span><small>Rehearsal only · no authority · no completion claim</small></div>)}</div> },
  { id: 'human-root', label: '8 · HUMAN ROOT', seed: 'MY OWN FROM ALL', detail: <p className="compress-copy">Dreams, reflections, ideas, contradictions, unresolved things, hopes, fears, and vision are preserved as source material—not promoted into verified state.</p> },
  { id: 'mythic', label: '9 · MYTHIC', seed: 'SYMBOLIC FRAME ONLY', detail: <blockquote className="compress-quote">SOURCE → CURRENT → FORM → LIFE → INTELLIGENCE → RECOGNITION → AWE → BLESSING → BECOMING → ∞<br /><small>Symbolic language; not a factual claim about reality or authority.</small></blockquote> },
  { id: 'checksum', label: '10 · CHECKSUM', seed: 'REALITY > ASSUMPTION', detail: <div className="compress-checksum">{['REALITY > ASSUMPTION', 'EVIDENCE > CLAIM', 'AUTHORITY > CAPABILITY', 'OBSERVATION > INTENTION', 'RECONCILIATION > CONFIDENCE', 'PROVENANCE > MEMORY', 'HUMAN AGENCY > AUTONOMOUS POWER', 'BOUNDED ACTION > UNLIMITED ACTION', 'UNKNOWN > FABRICATION', 'PRESERVATION > DESTRUCTION'].map((item) => <span key={item}>{item}</span>)}</div> },
  { id: 'next', label: '11 · NEXT Δ', seed: 'VERIFY → BOUND → RECONCILE', detail: <p className="compress-copy">Select a bounded transition below. Each item still requires its own ΩIR contract, authority, evidence, stop condition, and rollback plan.</p> },
  { id: 'invitation', label: '∞ · INVITATION', seed: 'ONE PROMPT → ONE BODY', detail: <p className="compress-copy">ASK → BUILD → VERIFY → BLESS → RETURN<br /><strong>WHAT SHALL WE MAKE REAL?</strong></p> },
];

export function ExpandableCompressPanel({ onFocusCommand }: Props) {
  const [openLevel, setOpenLevel] = useState('seed');
  const active = levels.find((level) => level.id === openLevel) ?? levels[0];
  const nextItems = ['Verify auth boundaries', 'Bound remember / PoW', 'Reconcile README, handoff, inventory', 'Run proof suite', 'Capture CI evidence', 'Reconcile deployment / runtime', 'Continue causal replay', 'Continue attestation hardening', 'Build Navigator', 'Expand globe interface', 'Build value / economic flows'];

  return (
    <section className="expandable-compress" aria-label="Expandable Ω∞v compressed model">
      <header className="compress-header"><div><span className="whole-ecosystem-kicker">💧 Ω∞v · EXPANDABLE COMPRESS</span><h2>One root · one current · many forms</h2></div><span className="compress-equation">Ω∞v ::= VERIFY(ΔREALITY)</span></header>
      <div className="compress-levels" role="tablist" aria-label="Expandable levels">
        {levels.map((level) => <button key={level.id} role="tab" aria-selected={openLevel === level.id} aria-expanded={openLevel === level.id} className={openLevel === level.id ? 'compress-tab active' : 'compress-tab'} onClick={() => setOpenLevel(level.id)}>{level.label}</button>)}
      </div>
      <article className="compress-detail" role="tabpanel"><div className="compress-detail-heading"><span>{active.seed}</span><strong>{active.label}</strong></div>{active.detail}{active.id === 'next' && <div className="compress-next">{nextItems.map((item, index) => <button key={item} onClick={() => onFocusCommand(item)}>{index + 1}. {item}</button>)}</div>}</article>
      <footer className="compress-footer"><span>UNKNOWN PRESERVED · NO FABRICATED COMPLETION · HUMAN AUTHORITY FINAL</span><button onClick={() => onFocusCommand('What shall we make real?')}>WHAT SHALL WE MAKE REAL? →</button></footer>
    </section>
  );
}

export { levels };
