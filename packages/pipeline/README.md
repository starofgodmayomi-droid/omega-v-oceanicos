# @omega-v/pipeline

Automated Verified CI/CD Pipeline Orchestrator for Ω∞v Oceanicos — Stage graphs, dependency ordering, gate checks, worker dispatch, rollback, and build attestation chains

## Overview

Ecosystem package for the Ω∞v Oceanicos platform.

---

## Whole-ecosystem alignment

This repository surface is one bounded form in the OCEANICOS body, rooted in human intent and source context. Its place in `SOURCE → ROOT → SUCCESS → relevant BODY → finite Δ` and the full-stack transition loop is defined by the [Whole-Ecosystem Master Prompt](../../WHOLE-ECOSYSTEM-MASTER-PROMPT.md).

The prompt is a design/continuity contract, not evidence that a named component exists, connects, runs, or is healthy. This README documents this surface; establish claims from relevant implementation, tests, and observations. Keep `UNKNOWN` and `DIVERGENT` explicit; capability is not authority, and execution is not verification.

## Human approval gate

`REQUIRE_HUMAN` fails closed because this engine has no independent human-approval event interface. It marks the gated stage `GATE_BLOCKED` before dispatching its jobs, skips remaining pending stages, and returns a failed run. `approverDid` identifies an intended approver only; it is not approval evidence. An approval/resume flow requires a separately verified integration and is not implemented here.

## Stage graph admission

Before recording a run or dispatching work, the engine rejects empty or duplicate stage IDs, dependencies that reference undeclared stages, and dependency cycles. These checks validate graph shape only; they do not establish authority, worker readiness, or successful execution.
