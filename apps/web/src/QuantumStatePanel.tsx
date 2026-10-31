import React, { useCallback, useEffect, useState } from 'react';

/**
 * Ω∞v Quantum State Evolution — ∣Ψ(t)⟩ = U(t,t₀)·[Symmetry⊗Inversion]·∣Agent⟩
 *
 * The panel asks the API to evolve one declared agent state through the
 * tensor product of the symmetry and inversion operators, then through a
 * declared unitary time evolution. It shows the amplitudes and probabilities
 * before and after, the local algebraic checks, and the resulting status.
 *
 * Evidence boundary: VERIFIED means compressible local algebra matched —
 * normalization, unitarity, phase-only evolution, and exact recovery. It is
 * not a physical quantum observation.
 */

const API_BASE_URL = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '');

type Amplitude = { re: number; im: number };
type StateView = { amplitudes: Amplitude[]; probabilities: number[]; phases: number[] };
type Evolution = {
  notation: string;
  basis: string[];
  angles: { symmetryDegrees: number; inversionDegrees: number };
  tau: number;
  states: { agent: StateView; inverted: StateView; evolved: StateView };
  checks: { normalization: number; unitarity: number; phaseOnly: number; reversibility: number; passed: boolean };
  reality: { status: string; checksRun: string[]; boundary: string };
  digest: string;
};

const formatAmplitude = (amplitude: Amplitude | undefined): string => {
  if (!amplitude) return '0';
  const re = amplitude.re.toFixed(3);
  const im = Math.abs(amplitude.im).toFixed(3);
  return amplitude.im === 0 ? re : `${amplitude.re.toFixed(3)} ${amplitude.im < 0 ? '−' : '+'} ${im}i`;
};

export function QuantumStatePanel() {
  const [symmetryDegrees, setSymmetryDegrees] = useState(90);
  const [inversionDegrees, setInversionDegrees] = useState(90);
  const [tauDegrees, setTauDegrees] = useState(90);
  const [evolution, setEvolution] = useState<Evolution | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const accept = useCallback((payload: Evolution) => {
    setEvolution(payload);
    setSymmetryDegrees(payload.angles.symmetryDegrees);
    setInversionDegrees(payload.angles.inversionDegrees);
    setTauDegrees(Math.round((payload.tau * 180) / Math.PI));
  }, []);

  const request = useCallback(async (url: string, init?: RequestInit) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(url, init);
      const payload = await response.json();
      if (!response.ok || payload?.status === 'INVALID' || !payload?.states) {
        throw new Error(payload?.issues?.[0]?.message || `evolution refused (${response.status})`);
      }
      accept(payload as Evolution);
    } catch (err) {
      setEvolution(null);
      setError(err instanceof Error ? err.message : 'evolution unavailable');
    } finally {
      setLoading(false);
    }
  }, [accept]);

  const evolve = useCallback(
    () =>
      request(`${API_BASE_URL}/v1/ecosystem/quantum/evolve`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          symmetryDegrees,
          inversionDegrees,
          tau: (tauDegrees * Math.PI) / 180,
        }),
      }),
    [request, symmetryDegrees, inversionDegrees, tauDegrees],
  );

  useEffect(() => {
    // The shell renders the declared default via a read-only GET; only the
    // explicit EVOLVE control submits new parameters.
    void request(`${API_BASE_URL}/v1/ecosystem/quantum`);
  }, [request]);

  const status = evolution?.reality.status ?? 'UNKNOWN';
  const cards: Array<{ label: string; view: StateView | undefined }> = [
    { label: '∣Agent⟩', view: evolution?.states.agent },
    { label: '[Symmetry⊗Inversion]∣Agent⟩', view: evolution?.states.inverted },
    { label: '∣Ψ(t)⟩', view: evolution?.states.evolved },
  ];

  return (
    <section className="quantum-state" aria-label="Ω∞v quantum state evolution">
      <header className="quantum-header">
        <div>
          <span className="quantum-kicker">Ω∞v QUANTUM STATE · Ψ(t)</span>
          <h3>Symmetry ⊗ Inversion, then time</h3>
        </div>
        <span className={`quantum-badge quantum-badge-${status.toLowerCase()}`}>EVOLUTION {status}</span>
      </header>

      <p className="quantum-equation">{evolution?.notation ?? '∣Ψ(t)⟩ = U(t,t₀)·[Symmetry⊗Inversion]·∣Agent⟩'}</p>

      <div className="quantum-controls">
        <label className="quantum-control">
          <span>Symmetry θ · {symmetryDegrees}°</span>
          <input
            type="range"
            min={0}
            max={180}
            step={1}
            value={symmetryDegrees}
            onChange={(event) => setSymmetryDegrees(Number(event.target.value))}
            aria-label="Symmetry angle in degrees"
          />
        </label>
        <label className="quantum-control">
          <span>Inversion φ · {inversionDegrees}°</span>
          <input
            type="range"
            min={0}
            max={180}
            step={1}
            value={inversionDegrees}
            onChange={(event) => setInversionDegrees(Number(event.target.value))}
            aria-label="Inversion angle in degrees"
          />
        </label>
        <label className="quantum-control">
          <span>Time τ · {tauDegrees}°</span>
          <input
            type="range"
            min={0}
            max={360}
            step={1}
            value={tauDegrees}
            onChange={(event) => setTauDegrees(Number(event.target.value))}
            aria-label="Evolution time in degrees"
          />
        </label>
        <button type="button" onClick={() => void evolve()} disabled={loading}>
          {loading ? 'EVOLVING…' : 'EVOLVE Ψ(t)'}
        </button>
      </div>

      <div className="quantum-states">
        {cards.map((card) => (
          <article className="quantum-state-card" key={card.label}>
            <span className="quantum-state-label">{card.label}</span>
            <div className="quantum-bars">
              {(evolution?.basis ?? ['00', '01', '10', '11']).map((basis, index) => {
                const probability = card.view?.probabilities[index] ?? 0;
                return (
                  <div className="quantum-bar" key={basis}>
                    <span className="quantum-bar-key">|{basis}⟩</span>
                    <span className="quantum-bar-track">
                      <span style={{ width: `${Math.max(0, Math.min(1, probability)) * 100}%` }} />
                    </span>
                    <b>{probability.toFixed(3)}</b>
                    <small>{formatAmplitude(card.view?.amplitudes[index])}</small>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </div>

      <div className="quantum-checks">
        {[
          ['NORMALIZATION', evolution ? evolution.checks.normalization.toExponential(1) : '—'],
          ['UNITARITY · G² = I', evolution ? evolution.checks.unitarity.toExponential(1) : '—'],
          ['PHASE-ONLY · Δp', evolution ? evolution.checks.phaseOnly.toExponential(1) : '—'],
          ['REVERSIBILITY · |⟨Agent|recovered⟩|²', evolution ? evolution.checks.reversibility.toFixed(12) : '—'],
        ].map(([label, value]) => (
          <div className={`quantum-check${evolution?.checks.passed ? ' is-verified' : ''}`} key={label}>
            <span>{label}</span>
            <b>{value}</b>
          </div>
        ))}
      </div>

      {error && <p className="quantum-error" role="status">Evolution refused · {error}</p>}

      <div className="quantum-footer">
        <span className="quantum-digest">
          digest {evolution?.digest ? `${evolution.digest.slice(0, 16)}…` : 'UNKNOWN'}
        </span>
        <small>{evolution?.reality.boundary ?? 'Local symbolic evolution only — not a physical observation.'}</small>
      </div>
    </section>
  );
}
