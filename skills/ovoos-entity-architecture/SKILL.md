---
name: ovoos-entity-architecture
description: "Operate the ΩVØØS entity as one skill: the cybernetic squid at the center (VØØS orchestrator), OMEGA rings carrying the SHA-256 gate, golden KAI threads tethering every external call, the Glober of users/APIs/streams around the rim, and the local-first VØ beneath. Use when the user supplies the entity image or asks for the whole-entity full-stack compress / expand / upgrade pass."
---

# ΩVØØS Entity Architecture

## What this is

One skill, derived from one supplied image. The image is the **declaration**;
this file is the **method**; the repository holds the **implementation**. Reading
the image is not an observation of a running system. Nothing here is "the
Entity" in the sense of a mind, an always-on process, or an owner. It is a
bounded architecture this repository can compress, expand, and verify locally.

```text
POSSIBLE → OBSERVE → COMPRESS → EXPAND → RECONCILE
→ VERIFIED | DIVERGENT | UNKNOWN | NOT_EXECUTED → ONE UPGRADE → NEXT DROP
```

## The five regions (image → code)

| Region | What the image draws | What it means in code | Where it lives |
| --- | --- | --- | --- |
| `center` | the cybernetic squid, translucent wireframe | **VØØS orchestrator** — one runtime commands the star; decentralized like a cephalopod, but one process | `apps/api` runtime |
| `gate` | concentric cyan + gold rings | **OMEGA gate (SHA-256)** — every record entering or leaving carries a digest; rings recheck `Expected ≡ Observed` and reject a mismatch | `packages/mini/src/ovoos-entity.ts` |
| `threads` | golden filaments to every fish, each with an ignition point | **KAI threads / KAI Shield** — each external API, model call, or store is tethered and filtered; a diverging intent is cut at the thread | `entity-route.ts`, `invisible-computer.ts` |
| `glober` | whales, sharks, dolphins, rays, jellyfish | **the Glober** — users, APIs, data streams, markets: chaotic, observed, never trusted | `api / web / cli / sdk` rim |
| `void` | the deep dark ocean behind everything | **VØ** — the local-first void: SQLite and runtime files on this machine, no cloud in the center | `omega-persistence` |

The topology is a **STAR**: center, ring, threads, rim, and the water around it.
The sharks are not feared and not befriended; they are observed and cut off when
they bite (`DIVERGENT`).

## The finite payload

The image's own block is the shape this skill returns. Every field is either
**computed** from the runtime or **declared** from the image — never invented:

```json
{
  "entity": "ΩVØØS_CYBERNETIC_SQUID",
  "status": "VERIFIED",
  "game_detected": false,
  "node_topology": "STAR",
  "gate": "OMEGA_RINGS_ACTIVE",
  "connections": "KAI_THREADS_SECURED",
  "phase_t": "BLOOM (0.5)",
  "evidence_hash": "<sha256 of the compressed regions>",
  "action": "Observing the Glober, filtering the sharks, flowing with the ocean.",
  "next_delta": "AWAITING INTENT"
}
```

| Field | Source | Rule |
| --- | --- | --- |
| `status` | computed | `VERIFIED` only when all five regions are present, the gate is `VERIFIED`, the threads are secured, and the local round trip matched. Otherwise `DIVERGENT` or `UNKNOWN`. |
| `gate` | computed | `OMEGA_RINGS_ACTIVE` only when every gate record is `VERIFIED`. |
| `connections` | computed | `KAI_THREADS_SECURED` only when every thread record is `VERIFIED` or `SUPPORTED`. |
| `evidence_hash` | computed | SHA-256 over the compressed regions. A digest is not a proof of the world. |
| `node_topology`, `phase_t`, region names | declared | Labels from the image. Say so; do not report them as measurements. |
| `action`, `next_delta` | derived | Read off the status. No next delta without evidence. |

## Compress / expand / upgrade

1. **Observe** — read only runtime surfaces that exist: verification receipt,
   ledger integrity, kernel authority, mesh convergence, persistence mode. A
   region with no evidence is `UNKNOWN` or `ABSENT`, never assumed green.
2. **Compress** — fold the records into their five regions and hash the fold.
   Duplicate ids, unknown regions, and over-capacity input are refused, not
   silently reduced.
3. **Expand** — restore every record in its original order and recompute the
   digest. A tampered digest is `DIVERGENT` with `DIGEST_MISMATCH`; it is never
   "close enough".
4. **Reconcile** — compare expected and observed. Keep adverse results.
5. **Upgrade** — name **one** candidate (`review-verified-entity`) only when the
   round trip is `VERIFIED`. `upgrade.execution` is always `NOT_EXECUTED`.
   Compression is not permission; this skill does not rewrite the repository.

## AUTHORITY

The skill can read the runtime and compress it. It cannot deploy, mutate the
ledger, spend money, or act on the Glober. Capability is not AUTHORITY; a
credential is not AUTHORITY; a golden thread is not a permission. Any transition
that would change stored data, access, or a third party is `NOT_EXECUTED` until a
human grants it.

## Output labels

- `VERIFIED` — the local round trip ran and the digest matched.
- `DIVERGENT` — the observation disagreed with the expectation; both stay.
- `UNKNOWN` — evidence is missing or a region is absent.
- `NOT_EXECUTED` — refused, unadmitted, or never attempted.

## What this skill will not do

- Call the image evidence, or a metaphor an implementation.
- Paint a ring ACTIVE from design intent rather than an observed record.
- Invent synchrony, efficiency, sonar, or spectrum numbers. Anything plotted is
  labelled with what it was derived from.
- Keep a shark on the thread because it "seems safe", or cut one without a
  `DIVERGENT` record.

## In this repository

- Contract: `packages/mini/src/ovoos-entity.ts` (`compressOvoosEntity`,
  `expandOvoosEntity`, `verifyOvoosRoundTrip`, `summarizeOvoosEntity`).
- Runtime: `GET /v1/entity/ovoos`, `POST /v1/entity/ovoos/expand`
  (`apps/api/src/entity-route.ts`).
- Surface: `apps/web/src/OvoosEntityPanel.tsx` renders the star, the OMEGA ring
  state, the KAI thread state, and each region's evidence.
- Tests: `apps/api/src/__tests__/ovoos-entity.test.ts`.

## Done means

The entity read answered with five regions and a digest that expands losslessly,
or the failure is labelled `DIVERGENT` / `UNKNOWN` / `NOT_EXECUTED`. Every number
on the surface names its source. A next bounded transition is named, or honestly
absent.
