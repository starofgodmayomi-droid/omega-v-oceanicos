---
name: oceanicos-max-space-full-stack
description: "Map Oceanicos max-space and N-dimensional requests into bounded coordinates, clocks, arrays, and finite execution. Use for spatial, temporal, shader, simulation, matrix, or whole-state-space work that must stay evidence-bound."
---

# Oceanicos Max-Space Full Stack

## Purpose

Max space means the largest relevant state space that can still be named, bounded, executed, and observed. It does not mean literal infinite dimensions, a Hilbert-space computer, omniscience, or control of physical reality.

Use this skill when a request talks about 0D–3D space, a 4D clock, N-dimensional arrays, phase space, shaders, simulations, matrices, or “maximum full stack.” Translate the symbol into a representation, then keep that representation distinct from the thing it models.

```text
POSSIBLE ≠ REPRESENTABLE ≠ AUTHORIZED ≠ EXECUTED ≠ OBSERVED ≠ VERIFIED
```

## Dimensional contract

The supplied ƆCEANiC_OS layers map as follows. Each row is a model. None of them is automatic authority.

| Layer | Supplied reading | Finite representation | Evidence state until observed |
| --- | --- | --- | --- |
| 0D | Void, null equilibrium | No allocation yet. Empty scope. | `NOT_EXECUTED` |
| 1D–3D | Spatial web | Cartesian coordinates. State handedness (left or right) because the graphics or sensor target requires it. Units and origin are explicit. | `UNKNOWN` until a coordinate source is inspected |
| 4D | Temporal stream, `+11:11` | A named frame, tick, or synchronization boundary. `+11:11` is a label for that boundary, not a measured physical constant. | `UNKNOWN` until a clock source and timezone are recorded |
| N-D | Hyper-phase space, ND-array, wavefunction | A finite array with declared rank, shape, dtype, and bounds. Collapse means reduction or aggregation to a smaller record. | `UNKNOWN` as a quantum or metaphysical claim |
| `∞` | Recursive infinity | Another bounded pass with a stop condition, a budget, and a handoff. | `NOT_EXECUTED` until that pass is admitted |

Do not allocate an “infinite” array. If rank or bounds are unspecified, ask once or assume the smallest shape that can answer the request, and label the assumption.

## Field, then sink

```text
0 → 💧 → Ω∞v → 🕳️ → 💧
```

1. **Void.** Do not invent coordinates, frames, or datasets.
2. **Drop.** Instantiate one local vector, particle, sample, or record. Name its type and owner.
3. **Field (`Ω∞v`).** Scale only inside declared limits: sample count, resolution, time window, memory, and cost. Exponential language is a request to find the limit, not to ignore it.
4. **Sink (`🕳️`).** Reduce. Garbage-collect intermediates. Keep the receipt: inputs, parameters, seed, output shape, and what was discarded. Do not delete dissent or raw evidence that the claim depends on.
5. **Return drop.** One artifact or one numeric result, plus the observation that produced it.

## What may be generated

Generate these only when the user asked for that artifact, and label each one `REPRESENTATION`, not reality:

- Procedural code: GLSL, WebGL or Three.js, bounded C++ metaprogramming, or a Python fluid or particle simulation.
- A matrix or tensor with an explicit shape. Show a small example, not an implied infinity.
- A lifecycle readout from null allocation to the next finite drop.

A shader compiling is not a physical fluid. A green numeric test is not a deployed world. A plot is not the sensor that was never connected.

## Authority and outcomes

Capability to write a simulation is not AUTHORITY to spend unbounded compute, to scrape private data, or to treat the output as a measurement.

- `VERIFIED` — the representation ran, and the observed output matches the stated expectation inside the declared shape and seed.
- `DIVERGENT` — the run happened and the output does not match. Keep both the expectation and the output.
- `UNKNOWN` — no run, no source frame, or an inconclusive comparison.
- `NOT_EXECUTED` — the space was described and not computed.

Before raising dimensionality, name the question the extra axis answers. If it answers none, stay at the lower dimension.
