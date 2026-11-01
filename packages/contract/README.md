# @omega-v/contract

Formal Schema & Behavioral Contract Verification Engine for Ω∞v Oceanicos

## Overview

Ecosystem package for the Ω∞v Oceanicos platform.

## Public README alignment

- [README.md](../../README.md) — repo-wide mission and evidence-first operating posture
- [packages/verification/README.md](../verification/README.md) — the rule engine that evaluates conditions and evidence claims
- [packages/observer/README.md](../observer/README.md) — the normalized input stream contracts these checks accept
- [apps/api/README.md](../../apps/api/README.md) — runtime API contract boundary where these constraints are exposed

Contracts are how the system defines admissible behavior. They do not replace verification or authorization; they make expected states explicit so evidence can be checked against them.
