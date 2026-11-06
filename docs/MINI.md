# Ω∞v MINI Kernel

> Zero is the origin. Mini is the first living system. Everything after that is verified expansion.

---

## Growth model

Architecture does **not** begin as the giant ecosystem. It begins at **ZERO**, becomes a **MINI** kernel, and expands only when reality verifies the next step.

```text
                         0
                         │
                         ▼
                    💧 Ω∞v MINI
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
           👁 OBSERVE  ✓ VERIFY   🧠 REMEMBER
              │          │          │
              └──────────┼──────────┘
                         ▼
                      + REASON
                         │
                      + INTENT
                         │
                      + BUILD
                         │
                      + TEST
                         │
                     + ATTEST
                         │
                      + ACT
                         │
                   + FULL STACK
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
      💻 Apps          🤖 AI            ☁️ Infra
        │                │                │
        └────────────────┼────────────────┘
                         ▼
                   👥 ECOSYSTEM
                         │
              🔐 GOVERNANCE / TRUST
                         │
                   🌍 STEWARDSHIP
                         │
                    📈 VALUE
                         │
                   🔄 COMPOUND
                         │
                     🌱 EVOLVE
                         │
                         ▼
                       🌎
                         │
                         └────────↺
                              ∞
```

---

## Evolution law

Growth toward a declared capacity is paced, not linear:

```text
Ease(t) = (1 - cos(t * π)) / 2        t ∈ [0, 1]

SPROUT   [0.00, 0.25)
BLOOM    [0.25, 0.50)
PLATEAU  [0.50, 0.75)
WILT     [0.75, 1.00]
```

`t` is `verified rows / EVOLUTION_CAPACITY` (1024, declared in
`packages/mini/src/evolution.ts`), so a position describes memory the ledger
actually holds. WILT is the closing quarter, where the curve has nearly stopped
adding value: reaching the bound is a decision point for a declared expansion,
not permission to keep growing. Every `POST /api/execute` response carries
`phase_t` and an `evolution` block. The law is a read — out-of-range input is
refused with `null`, a saturated position reports `saturated: true`, and no
position changes a verdict, grants authority, or remembers anything.

---

## Zero

```text
0
```

- No assumed ecosystem
- No assumed capital
- No assumed architecture
- No pretending something is already verified

Zero is honesty about starting conditions.

---

## Mini

```text
💧 Ω∞v MINI ::= 👁 → ✓ → 🧠
```

**Observe → Verify → Remember.**

That is the smallest useful kernel.

| Symbol | Name     | Package                 | Responsibility                |
| ------ | -------- | ----------------------- | ----------------------------- |
| 👁      | Observe  | `@omega-v/observer`     | Capture and normalize claims  |
| ✓      | Verify   | `@omega-v/verification` | Apply rules; produce evidence |
| 🧠     | Remember | `@omega-v/remember`     | Append-only durable memory    |
| 💧     | MINI     | `@omega-v/mini`         | Compose one living cycle      |

### One cycle

```typescript
import { MiniKernel } from '@omega-v/mini';

const mini = new MiniKernel({ rules: [/* ... */] });
const result = mini.cycle(input);

// result.observation  — what was seen
// result.verification — evidence path
// result.memory       — what was kept
```

---

## Continuous expansion

```text
MINI
+ Reason
+ Intent
+ Build
+ Test
+ Attest
+ Act
+ API
+ CLI
+ SDK
+ Web
+ Mobile
+ AI
+ Agents
+ Data
+ Infrastructure
+ Security
+ Governance
+ Community
+ Stewardship
+ Economy
+ Evolution
```

**Each `+` is earned by the previous layer.**

Do not scaffold the full ecosystem because the vision diagram includes it. Ship MINI. Prove it. Then expand.

---

## Fundamental lifecycle

```text
0 → MINI → + → + → + → FULL STACK → ECOSYSTEM
                                      ↓
                                   REALITY
                                      ↺
                                      ∞
```

Root equation:

```text
💧 Ω∞v ::= 🌎 ⇄ ✓
             ↺
             ∞
```

---

## What is NOT MINI

These exist in the repo as **earned or planned expansions**, not as the kernel:

- `@omega-v/attestation` — `+ ATTEST`
- `apps/api`, `apps/web` — `+ FULL STACK`
- Compiler, IR, SDKs, CLI, mobile, edge, VaaS — later `+` layers

They must not redefine the kernel. The kernel remains Observe → Verify → Remember.

---

## Invariants for expansion

1. **MINI must remain runnable alone** — no required API, UI, or cloud.
2. **Memory is append-only** — history is not rewritten to fit a later narrative.
3. **Failed verification is still remembered** — reality includes failure.
4. **A new `+` requires evidence** that the previous layer works in practice.
5. **Docs describe current truth first**, aspirational stack second.

---

## References

- [ARCHITECTURE.md](./ARCHITECTURE.md) — system design from MINI outward
- [ROADMAP.md](./ROADMAP.md) — earned expansion phases
- [VERIFICATION_LOOP.md](./VERIFICATION_LOOP.md) — full loop including post-MINI steps
- [packages/mini](../packages/mini/) — implementation

---

**Status**: Canonical growth model  
**Last Updated**: 2026-08-14
