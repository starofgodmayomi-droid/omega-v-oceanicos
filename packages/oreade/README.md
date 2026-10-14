# @omega-v/oreade

Deterministic translation from ƆREADE-inspired symbolic language into bounded Ω∞v Oceanicos Drops.

This package does **not** execute actions, grant authority, contact deities, or verify external reality. It makes intent legible and testable so a separate runtime can validate, authorize, admit, execute, observe, and reconcile it.

```ts
import { buildSymbolicDrop } from '@omega-v/oreade';

const drop = buildSymbolicDrop({
  symbolicIntent: 'activate a community wisdom reflection',
  requestedBy: 'telegram:8632545391',
  targetScope: ['oracle:reflection'],
  idempotencyKey: 'oracle-reflection-001',
  stopCondition: 'stop after one generated reflection',
  expectedObservation: 'one bounded reflection is returned and labeled symbolic',
});
```

The resulting Drop keeps symbolic meaning separate from authority and carries an explicit evidence limitation.

## Bounded OceanicOS cycle example

The cycle below is preserved as symbolic intent and translated into one finite proposal. The arrows are not interpreted as proof of physical transitions, and the infinity marker is not an instruction to loop:

```ts
const drop = buildSymbolicDrop({
  symbolicIntent: '🌊 Ω♾️V :: ƆCEANiC_OS(v∞)/0 → 💧 → Ω∞v → 🕳️ → 💧 → ∞.',
  requestedBy: 'operator:human',
  targetScope: ['oreade:translation'],
  idempotencyKey: 'oceanic-cycle-001',
  stopCondition: 'stop after one translation; do not recurse or execute external actions',
  expectedObservation: 'one bounded Drop retains the symbolic input without asserting physical reality',
  mode: 'WORLDVIEW',
});
```

This produces a `PROPOSAL` only. Runtime authority, admission, execution, observation, and reconciliation remain separate steps; translation grants none of them.
