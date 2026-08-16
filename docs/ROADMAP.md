# Ω∞v Oceanicos Roadmap

This roadmap follows the growth law:

```text
0 → MINI → + → + → + → FULL STACK → ECOSYSTEM → REALITY ↺ ∞
```

Each phase is **earned**. We do not pretend later layers already exist as architecture just because they appear on the vision diagram.

Canonical model: [MINI.md](./MINI.md).

## Vision

Ω∞v is a verification-first system that starts as a living MINI kernel (Observe → Verify → Remember) and expands into a full-stack trusted intelligence ecosystem only when reality verifies each next step.

## Current Status

- **Zero**: acknowledged — complete
- **MINI kernel**: Observe → Verify → Remember — complete (see Phase 2)
- **Expansions present but not kernel**: attestation, API, web

The expansions are implemented rather than sketched: attestation signs with
HMAC-SHA256 or Ed25519, the API serves the loop plus Act/Learn/Recompile over
HTTP, and the web dashboard renders the evidence chain. That says what exists,
not what it is worth — none of it is production-hardened, and the open gaps are
listed under each phase below.

They remain expansions. The kernel is still Observe → Verify → Remember, and
[MINI.md](./MINI.md) governs that definition.

## Phase Breakdown

### Phase 0 — Zero

Honest origin. No assumed ecosystem, capital, or verified stack.

**Done when**: project admits it starts empty and refuses fake completeness.

### Phase 1 — Constitution

Foundational documents and governance:

- `CHARTER.md`
- `MANIFEST.md`
- `CONTRIBUTING.md`
- `LICENSE`
- `README.md`
- `docs/MINI.md`

### Phase 2 — MINI kernel (complete)

Smallest useful living system:

```text
💧 Ω∞v MINI ::= 👁 → ✓ → 🧠
```

| Package                 | Role              |
| ----------------------- | ----------------- |
| `@omega-v/types`        | Shared contracts  |
| `@omega-v/observer`     | 👁 Observe         |
| `@omega-v/verification` | ✓ Verify          |
| `@omega-v/remember`     | 🧠 Remember       |
| `@omega-v/mini`         | Compose the cycle |

**Done when**:

- [x] Observe normalizes claims
- [x] Verify produces evidence paths
- [x] Remember stores append-only hash-chained memory
- [x] MiniKernel runs one cycle without API/UI
- [x] MINI is the documented default mental model everywhere
- [x] Integration tests treat MINI as the primary runtime unit

Each tick above is anchored to evidence by
`tests/__tests__/roadmap-claims.test.ts`, which fails if a box is checked while
the thing it claims is absent. That test checks evidence anchors, not the full
meaning of each sentence — see its header for what it does and does not decide.

### Phase 3 — Earned core expansions

Only after MINI is real:

| Expansion            | Intent                                         |
| -------------------- | ---------------------------------------------- |
| `+ Reason`           | Richer evidence and explanation                |
| `+ Intent`           | Explicit goals/policies for cycles             |
| `+ Build` / `+ Test` | Stronger packaging and proof harnesses         |
| `+ Attest`           | `@omega-v/attestation` cryptographic proof     |
| `+ Act`              | Authorized actions gated by memory/attestation |

**Attestation note**: the package may already exist; roadmap treats production-grade attestation workflows as earned completion, not a kernel prerequisite.

Attestation status: signing is implemented for HMAC-SHA256 and Ed25519, with
key material parsed at construction and the verifying algorithm taken from
configuration rather than from the attestation. Not yet earned: the API still
constructs its service as HMAC and publishes no public key, so the Ed25519 path
is unreachable over HTTP. That is a key-distribution decision, not a coding one.
Also absent: HSM/KMS custody, encryption at rest, a signing audit log, and
revocation.

### Phase 4 — Interface expansions

| Expansion  | Surface    |
| ---------- | ---------- |
| `+ API`    | `apps/api` |
| `+ Web`    | `apps/web` |
| `+ CLI`    | planned    |
| `+ SDK`    | planned    |
| `+ Mobile` | planned    |

### Phase 5 — Depth expansions

- Stronger rule engine / compiler / IR
- Durable multi-process persistence
- Query and temporal audit APIs
- Policy-driven verification workflows

### Phase 6 — Distribution expansions

- Edge runtimes
- Agents
- Infrastructure (Docker/K8s/cloud)
- VaaS (verification as a service)

### Phase 7 — Ecosystem expansions

- Governance / trust
- Community + stewardship
- Economy / value loops
- Compound → evolve → return to reality (`∞`)

## Runbook

### Developer Quick Start

```bash
git clone https://github.com/starofgodmayomi-droid/omega-v-oceanicos.git
cd omega-v-oceanicos
pnpm install
pnpm test -- packages/mini packages/remember
pnpm run dev   # expansion surfaces (API/Web), optional for MINI work
```

### Current Live Ports (expansions)

- API: `http://localhost:3000`
- Web: `http://localhost:3001`

## Workflow Principles

- Start from Zero; ship MINI first
- Build the smallest executable loop before the ecosystem story
- Keep every package compilable independently
- Keep each package exporting one public interface
- Keep the repo runnable from a fresh clone
- **Each `+` is earned by the previous layer**
- Prioritize runtime truth over aspirational diagrams

## Notes

- `pnpm` is the workspace package manager
- MINI does not require API or Web to be valid
- Existing API/Web/attestation code is welcome expansion work; it must not redefine the kernel
- Previous milestone (complete): make MINI the default path in apps and docs,
  and enter completed loops into Remember. `/complete-loop` now returns the
  memory record alongside the observation, verification and attestation.

### Known drift, not yet closed

Recorded here so it is visible rather than rediscovered. None of these is
blocked on design; each is a decision or a scoped change.

- **Two package managers, one lockfile.** `pnpm` is canonical: `pnpm-lock.yaml`
  is the committed lockfile and CI installs with `pnpm install --frozen-lockfile`.
  The READMEs mostly say `npm install`, which does work — verified on a clean
  clone: 671 packages, then 263 tests, build and lint all green. But npm ignores
  `pnpm-lock.yaml` and there is no `package-lock.json`, so an npm install
  resolves fresh and can differ from what CI proved. Mixing them in one tree is
  the actual hazard: running `npm install` over an existing pnpm `node_modules`
  fails with a misleading `EUNSUPPORTEDPROTOCOL workspace:*` raised by pnpm's
  own store layout, not by anything in this repository's manifests. No manifest
  here uses the `workspace:` protocol.
- ~~**`format:check` was not run by CI and failed on 14 files.**~~ **Closed.**
  The formatting drift was corrected, `pnpm format:check` was added to the
  verify workflow after dependency installation, and the main-branch workflow
  now passes it on both supported Node versions. The workflow summaries report
  formatting explicitly alongside lint, type-check, test, coverage and build.
- ~~**CI skipped stacked pull requests entirely.**~~ **Closed.** The workflow
  filtered `pull_request` to `[main, develop]`, so a pull request based on any
  other branch ran no jobs at all. Nothing failed because nothing ran, and an
  absence of checks is easily read as passing ones. The filter is removed, so
  every pull request is verified whatever it targets.
- ~~**`summary.confidence` is the claimant's own number.**~~ **Closed.** The
  summary now reports the lowest confidence among the rules that actually ran,
  and carries the claim's own figure separately as `claimedConfidence`. This
  mattered further down the chain than it first looked: the value reached
  `attestation.confidence`, which sits inside the signed payload, so the system
  was issuing unforgeable signatures over a number the submitter chose.

---

**Last Updated**: 2026-08-16
