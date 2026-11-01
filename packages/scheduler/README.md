# @omega-v/scheduler

Autonomous periodic verification scheduler — runs the Ω∞v kernel loop on a configurable cadence

## Overview

Ecosystem package for the Ω∞v Oceanicos platform.

## Public README alignment

- [README.md](../../README.md) — repo-wide mission and evidence-first operating posture
- [packages/mini/README.md](../mini/README.md) — the atomic kernel loop being scheduled
- [packages/runtime/README.md](../runtime/README.md) — the runtime model in which scheduled work executes
- [packages/telemetry/README.md](../telemetry/README.md) — emission of evidence about cadence and execution status

Scheduling is an operational concern, not a source of truth. It can repeat and surface checks, but it still depends on verification and authority boundaries.
