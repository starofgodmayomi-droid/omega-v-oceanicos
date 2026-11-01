# @omega-v/runtime

This package provides the smallest useful runtime slice for modular agent execution and hot-path memory.

## Public README alignment

- [README.md](../../README.md) — repository mission and evidence-first system framing
- [packages/mini/README.md](../mini/README.md) — the bounded observe → verify → remember kernel
- [packages/observer/README.md](../observer/README.md) and [packages/verification/README.md](../verification/README.md) — the runtime inputs and evidence checks

`AgentLoop` runs a bounded sequence of named modules. Each module receives the same run context, writes a typed value into the context, and produces explicit start, success, or failure trace entries. A failed module stops the loop so downstream builders cannot silently consume incomplete evidence.

`MemoryFabric` is a bounded append-only in-process window for run artifacts. It supports direct writes, run-scoped recall, and explicit retention limits. It is a hot-path cache/fabric, not a replacement for the repository's encrypted `Remember` persistence chain.

```ts
const loop = new AgentLoop([
  { id: 'observe', execute: ({ input }) => ({ input, observed: true }) },
  { id: 'verify', execute: ({ values }) => Boolean(values.observe) },
  { id: 'build', execute: ({ values }) => ({ verified: values.verify }) },
]);

const result = await loop.run('fixture', 'agent-run-001');
```

The package intentionally does not claim literal zero latency, distributed coordination, autonomous authorization, hidden retries, network access, or durable memory. Measured elapsed time is returned as an observation so optimization can be evidence-driven.
