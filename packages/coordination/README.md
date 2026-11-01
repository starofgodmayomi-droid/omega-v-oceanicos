# @omega-v/coordination

`@omega-v/coordination` provides a small, local execution boundary for running independent **workers** and **builders** in parallel while preserving inspectable lifecycle evidence.

## Public README alignment

- [README.md](../../README.md) — repository mission and evidence-first system model
- [packages/runtime/README.md](../runtime/README.md) — bounded execution model and local evidence chain
- [packages/orchestrator/README.md](../orchestrator/README.md) — broader coordination and task dispatch layer
- [packages/worker/README.md](../worker/README.md) — worker lifecycle, authority checks, and local evidence scope

Coordination is intentionally bounded. It exposes parallel execution and lifecycle evidence, but it does not imply durable worker coordination, distributed consensus, or production authority.

## What this demonstrates

The executor supports a bounded concurrency limit, a bounded task count, explicit worker or builder roles, deterministic event sequencing, isolated task failures, and a replayable summary. It is designed to make parallel execution visible rather than magical.

```ts
import { ParallelExecutor } from '@omega-v/coordination';

const result = await new ParallelExecutor({
  maxConcurrency: 2,
  maxTasks: 8,
  runId: 'evidence-build-001',
}).execute([
  { id: 'observe', role: 'worker', title: 'Observe fixture', run: async () => 'observed' },
  { id: 'verify', role: 'worker', title: 'Verify evidence', run: async () => 'verified' },
  { id: 'bundle', role: 'builder', title: 'Build evidence bundle', run: async () => 'built' },
]);

console.log(result.state, result.events, result.limitations);
```

A second useful pattern is a mixed run where a builder fails without erasing successful worker output. The summary reports `state: 'failed'`, retains successful results, and records the failure event for diagnosis.

The package also exports `runCoordinationEvidenceProbe()`. With two independent clients and a restart callback, it verifies one exclusive lease winner, one rejected contender, and replay of the proposed/acquired/rejected/released lifecycle from a shared durable volume. Its result is explicitly `evidence: 'runtime-observed'`, `scope: 'multi-process-single-volume'`, and `verified: true`; it does not claim cross-host durability, distributed consensus, replica agreement, global ordering, deployment health, or external coordinator control.

## Safety boundary

This is a **local, bounded scheduler**. It does not provide a distributed queue, durable execution, leader election, retries, external callbacks, secret handling, deployment authorization, or proof of work outside the current process. Human authorization remains outside the executor.

The repository root now includes the package in the build chain and fast verification path. Run `pnpm --filter @omega-v/coordination test` for the focused proof, or `pnpm verify:fast` for the repository gate.
