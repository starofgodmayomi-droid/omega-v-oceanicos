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
