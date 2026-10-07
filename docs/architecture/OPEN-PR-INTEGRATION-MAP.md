# 💧 OCEANICOS — OPEN PR INTEGRATION MAP

**Purpose:** turn the open pull-request queue into one dependency-aware upgrade current without treating age, quantity, CI, or conceptual alignment as permission to merge.

## Authority / merge law

- Reality > assumption.
- Current repository state > historical PR description.
- CI/review evidence > claimed validation.
- Protected `main` remains the integration gate.
- A PR is a candidate transition, not a completed transition.
- `UNKNOWN` and `DIVERGENT` remain explicit.
- Never merge a security-sensitive or data-sensitive PR merely because it is old.
- Never merge duplicate/overlapping PRs independently when they change the same contract.

## Integration lanes

### L0 — SECURITY / FAIL-CLOSED FOUNDATION
**Priority: highest**
- #396 — bound public connector egress and payloads
- #360 — pin patched transitive dependencies
- #193 — refuse an empty expected token
- #214 — document AES-256-GCM key derivation boundary
- #209 — prevent unknown/failed dashboard states from appearing verified
- #204 — preserve matrix-leg evidence
- #264 — make image build packages it names

**Rule:** rebase/inspect current main, run current security + verification gates, then integrate only changes still applicable. Historical validation is not current evidence.

### L1 — CORE REALITY / AUTHORITY / RECONCILIATION
**Priority: highest after security**
- #278 — Ω change admission boundary
- #294 — explicit reality attestation boundary
- #297 — durable causal replay evidence
- #306 — reality status evidence-bound
- #321 — bounded runtime lifecycle
- #371 — durable reconciliation notes
- #370 — reconciliation-stage pipeline assertions
- #369 — bounded total-compression validation
- #301 — Ω coordination observability
- #308 — bounded multi-job ecosystem orchestration
- #249 — safe admission contract
- #251 — shared @omega-v/types package
- #252 — OmegaTotal integrity composition
- #253 — duplicate/overlapping OmegaTotal adapter proposal
- #254 — OmegaTotalAdapter metadata/manifest types
- #266 — TypeScript/Node/pnpm toolchain upgrade

**Rule:** #251/#252/#253/#254 require explicit duplicate-contract reconciliation before parallel merge. #253 must not silently compete with #252/#254.

### L2 — API / SAFETY SURFACE
**Priority: high**
- #408 — Notion intent → verified agent safety surface
- #409 — runtime safety-boundary evidence API
- #404 — API route contract parity
- #397 — expandable Oceanicos Navigator
- #399 — bounded water-flow UI
- #367 — mobile evidence field console
- #320 — verified market intelligence command center

**Preferred dependency direction:**
`#408 → #409`; route-contract changes (#404) should be reconciled before API surface merge; UI changes consume established contracts rather than defining authority.

### L3 — NETWORK / GRAPH / CONTINUITY
**Priority: high**
- #413 — Network Intelligence design law
- #414 — machine-readable Network Intelligence contract
- #407 — OCEANICOS ecosystem graph contract
- #406 — ΩIR source-line provenance (referenced by current work)
- #401 — Ocean of Thought universal current root
- #381 — Notion ↔ repository operating spine
- #339 — maximum full-stack ecosystem compression
- #311 — continuation handoff
- #300 — compressed continuation handoff
- #197 — roadmap/current-state reconciliation

**Preferred dependency direction:**
`#407/#413 → #414 → later graph/runtime consumers`.
Source-line provenance (#406) should be reconciled with the new network provenance contract rather than duplicated.

### L4 — VALUE / DOMAIN / EXPANSION
**Priority: medium**
- #332 — OceanicOS Value Navigator demo
- #250 — analytics/authorization/workflows/search
- #248 — multi-tenancy/query optimization/replication/migration

**Rule:** value or scale features cannot imply earned value, deployment health, external capability, or production readiness without independent evidence.

### L5 — MOBILE / EXPERIMENTAL
**Priority: gated**
- #395 — Expo mobile companion

Keep gated until dependency audit findings and native-device boundaries are deliberately reviewed.

### L6 — LEGACY / STALE / NEEDS REBASE OR RE-EVALUATION
- #217 — development guide/database mismatch
- any older PR whose branch has materially diverged from current main
- any PR whose implementation is superseded by a newer contract

These remain preserved for lineage, but are not automatically merge candidates.

## Current 2026-10-07 coordination state

### Active transition
**#413 → #414**

#413 establishes the Network Intelligence design law.
#414 makes that law machine-representable at the existing types/ΩIR seam.

#413 remains **OPEN / NOT MERGED** after a GitHub internal merge-service error was observed.
#414 has been created from current main and is **OPEN; CI must be observed before merge**.

### Important duplicate/overlap clusters

```
#252 ↔ #253 ↔ #254
OmegaTotal / Totality contract cluster

#408 ↔ #409 ↔ #404
Notion safety → runtime safety evidence → route parity

#407 ↔ #413 ↔ #414 ↔ #406
Graph constitution → Network Intelligence → executable graph → source provenance

#397 ↔ #399 ↔ #367
Navigator → bounded water-flow surface → mobile evidence console

#381 ↔ #339 ↔ #311 ↔ #300 ↔ #197
continuity / compression / reconciliation documentation
```

## Merge protocol

For each candidate:

`INSPECT CURRENT BASE → COMPARE → REBASE/REBUILD IF NEEDED → VERIFY → REVIEW → MERGE → OBSERVE MAIN → RECONCILE NOTION`

Never:

`OLD CI → ASSUME CURRENT → MERGE`

## Target next upgrade

```
SECURITY
  ↓
ADMISSION / AUTHORITY
  ↓
OBSERVATION / RECONCILIATION
  ↓
ΩIR PROVENANCE
  ↓
NETWORK GRAPH
  ↓
BOUNDED EXECUTION
  ↓
API SAFETY EVIDENCE
  ↓
OCEANICOS UI
  ↓
VALUE / DOMAIN EXPANSION
```

**One body. Many PRs. One integration current.**

The queue is a set of proposed transitions; only observed repository evidence promotes a transition to integrated state.
