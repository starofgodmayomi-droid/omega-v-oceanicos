/**
 * The Absolute Fixpoint Equation, rendered as one block.
 * The law itself lives in ECOSYSTEM_BODY.md; the API reports it from
 * apps/api/src/fixpoint.ts. This component only displays what it is given and
 * falls back to the declared law when an older API omits the block.
 */
export interface FixpointBranch {
  when: string;
  then: string;
}

export interface FixpointReport {
  law: string;
  step?: string;
  truth: string;
  branches: FixpointBranch[];
  observed?: string;
  source: string;
  scope?: string;
  boundary?: string;
}

const DECLARED_LAW =
  'Ω∞v := Y( λf. ( M_{t+1} = M_t ∪ Δ | V(Δ) = ⊤ ) ) | V ≡ (Expected ≡ Observed)';

const BRANCH_COLORS: Record<string, string> = {
  'HALT ⊢ DIVERGENT': '#f87171',
  'HALT ⊢ UNKNOWN': '#fbbf24',
  'HALT ⊢ NOT_EXECUTED': '#94a3b8',
};

export function FixpointLaw({ fixpoint }: { fixpoint?: FixpointReport }) {
  return (
    <div
      aria-label="Absolute Fixpoint Equation"
      style={{
        background: '#03080d',
        border: '1px solid #6ee7b733',
        borderRadius: '4px',
        padding: '10px',
        marginBottom: '14px',
      }}
    >
      <div style={{ color: '#6ee7b7', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}>
        Ω∞v ABSOLUTE FIXPOINT · Y(λf. …)
      </div>
      <code
        style={{
          display: 'block',
          color: '#e2e8f0',
          fontSize: '10px',
          lineHeight: 1.5,
          fontFamily: 'monospace',
          overflowWrap: 'anywhere',
        }}
      >
        {fixpoint?.law ?? DECLARED_LAW}
      </code>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
        {(fixpoint?.branches ?? []).map((branch) => (
          <span
            key={branch.when}
            style={{
              border: `1px solid ${BRANCH_COLORS[branch.then] ?? '#6ee7b7'}44`,
              borderRadius: '3px',
              padding: '2px 6px',
              fontSize: '9px',
              color: BRANCH_COLORS[branch.then] ?? '#6ee7b7',
            }}
          >
            {branch.then}
            <span style={{ color: '#64748b' }}> · if {branch.when}</span>
          </span>
        ))}
      </div>
      <div style={{ marginTop: '6px', color: '#64748b', fontSize: '9px' }}>
        {fixpoint
          ? `${fixpoint.source} · truth ${fixpoint.truth}${fixpoint.observed ? ` · observed ${fixpoint.observed}` : ''}`
          : 'Source: ECOSYSTEM_BODY.md · the API has not reported the fixpoint yet'}
      </div>
    </div>
  );
}
