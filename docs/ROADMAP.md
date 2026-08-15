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
- **MINI kernel**: Observe → Verify → Remember — establishing
- **Expansions present but not kernel**: attestation, API, web skeletons

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

### Phase 2 — MINI kernel (current center of gravity)

Smallest useful living system:

```text
💧 Ω∞v MINI ::= 👁 → ✓ → 🧠
```

| Package | Role |
|---------|------|
| `@omega-v/types` | Shared contracts |
| `@omega-v/observer` | 👁 Observe |
| `@omega-v/verification` | ✓ Verify |
| `@omega-v/remember` | 🧠 Remember |
| `@omega-v/mini` | Compose the cycle |

**Done when**:
- [x] Observe normalizes claims
- [x] Verify produces evidence paths
- [x] Remember stores append-only hash-chained memory
- [x] MiniKernel runs one cycle without API/UI
- [ ] MINI is the documented default mental model everywhere
- [ ] Integration tests treat MINI as the primary runtime unit

### Phase 3 — Earned core expansions

Only after MINI is real:

| Expansion | Intent |
|-----------|--------|
| `+ Reason` | Richer evidence and explanation |
| `+ Intent` | Explicit goals/policies for cycles |
| `+ Build` / `+ Test` | Stronger packaging and proof harnesses |
| `+ Attest` | `@omega-v/attestation` cryptographic proof |
| `+ Act` | Authorized actions gated by memory/attestation |

**Attestation note**: the package may already exist; roadmap treats production-grade attestation workflows as earned completion, not a kernel prerequisite.

### Phase 4 — Interface expansions

| Expansion | Surface |
|-----------|---------|
| `+ API` | `apps/api` |
| `+ Web` | `apps/web` |
| `+ CLI` | planned |
| `+ SDK` | planned |
| `+ Mobile` | planned |

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
- Next milestone: make MINI the default path in apps and docs, then earn `+ Attest` integration against Remember

---

**Last Updated**: 2026-08-14
