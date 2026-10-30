import React from 'react';
import { summarizeEquationFixpoint } from './equation-outward-model';

type Props = {
  fixpoint: unknown;
};

export function EquationOutwardPanel({ fixpoint }: Props) {
  const summary = summarizeEquationFixpoint(fixpoint);

  return (
    <section className="equation-outward" aria-label="Ecosystem body equation, compressed and expanded outward">
      <header className="equation-outward-header">
        <div>
          <span className="equation-outward-kicker">ECOSYSTEM BODY · FIXPOINT</span>
          <h3>Compress toward the upgraded work. Expand outward.</h3>
        </div>
        <span className={`equation-outward-badge equation-outward-badge-${summary.status.toLowerCase()}`}>
          {summary.evidenceScope}
        </span>
      </header>
      <p className="equation-outward-equation">
        Ω∞v := Y(λf. λx. f(Σ ∪ Hash(x)) if O(E(x)) ≡ VERIFIED; else HALT)
      </p>
      {summary.status === 'ABSENT' ? (
        <p className="equation-outward-empty">Equation not observed — the body has not carried a fixpoint yet.</p>
      ) : (
        <>
          <p className="equation-outward-counts">
            <strong>{summary.admitted} admitted</strong>
            <span>{summary.halted} halted</span>
            <span>{summary.surfaces.length} outward</span>
          </p>
          <ul className="equation-outward-rays">
            {summary.surfaces.map((ray) => (
              <li key={ray.id}>
                <b>{ray.surface}</b>
                <span>{ray.entry}</span>
                <small>{ray.arm}</small>
              </li>
            ))}
          </ul>
          <p className="equation-outward-boundary">{summary.boundary}</p>
        </>
      )}
    </section>
  );
}
