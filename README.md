<p align="center">
  <img src="apps/web/public/omega-mark.svg" alt="Ω∞v OCEANICOS" width="88" height="88" />
</p>

<h1 align="center">OCEANICOS</h1>

<p align="center"><strong>REALITY, VERIFIED.</strong></p>

<p align="center">Ω∞v is the verification engine. OCEANICOS is the platform.<br/>One root. One current. Many forms. Finite Δ.</p>

<p align="center">
  <a href="skills/oceanicos-full-stack-companion/SKILL.md">Companion</a> ·
  <a href="docs/BRAND.md">Brand</a> ·
  <a href="MANIFEST.md">Manifest</a> ·
  <a href="CHARTER.md">Charter</a> ·
  <a href="SECURITY.md">Security</a> ·
  <a href="CONTRIBUTING.md">Contributing</a>
</p>

[![Verification Pipeline](https://github.com/starofgodmayomi-droid/omega-v-oceanicos/actions/workflows/verify.yml/badge.svg)](https://github.com/starofgodmayomi-droid/omega-v-oceanicos/actions/workflows/verify.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

![A luminous emerald current crossing a deep ocean toward the horizon](docs/assets/oceanicos-readme-hero.jpg)

> Attest, don't assert. A badge is a link. A README is not a verification receipt.

OCEANICOS is evidence-bound infrastructure for turning human intent into a bounded, observable change. The session method is the [Oceanicos Full-Stack Companion](skills/oceanicos-full-stack-companion/SKILL.md): one finite outcome, specialist skills only when needed, `UNKNOWN` left unknown.

```text
Ω∞v MINI ::= Observe → Verify → Remember
Ω∞v     ::= VERIFY(ΔREALITY)
∞       ::= another finite pass may be justified — not unlimited autonomy
```

## Loop

```text
HUMAN INTENT
→ DISTINGUISH → EVIDENCE → AUTHORITY → POLICY → ADMIT → BOUND
→ EXECUTE → OBSERVE → RECONCILE
→ VERIFIED | DIVERGENT | UNKNOWN | NOT_EXECUTED
→ PROVENANCE → MEMORY → NEXT FINITE Δ
```

Capability is not authority. A test is not deployment. Memory is not truth. Simulation is not reality.

## What is in this repository

| Surface | Where | What a reader may claim |
| --- | --- | --- |
| MINI kernel | `packages/types`, `observer`, `verification`, `remember`, `mini` | Contracts and local kernel code exist. Runtime health is separate. |
| API and web | `apps/api`, `apps/web` | Local dev surfaces. Not production health. |
| Companion | `skills/oceanicos-full-stack-companion` | A method for a session. Not a person and not a running process. |
| Inventory | [docs/REPO_INVENTORY.md](docs/REPO_INVENTORY.md) | Workspace membership versus directories on disk. |
| Package index | [packages/README.md](packages/README.md) | Every `packages/*` name, labeled workspace or source-only. |

Present on disk is not workspace-active, not imported, not tested, not verified, not deployed.

## Quick start

Node.js 22 or newer. pnpm 10.34.5 (`packageManager` in the root manifest).

```bash
git clone https://github.com/starofgodmayomi-droid/omega-v-oceanicos.git
cd omega-v-oceanicos
pnpm install --frozen-lockfile
pnpm dev
```

- API: `http://localhost:5000`
- Web: `http://localhost:3000`

```bash
pnpm build
pnpm typecheck
pnpm test
pnpm verify:full
pnpm smoke:api
pnpm cli status
```

`pnpm test` runs the enumerated integration list in the root manifest. It does not discover every file under `tests/`. A green local run covers that machine, that commit, and that configuration only.

## Status words

| Word | Use it when |
| --- | --- |
| `VERIFIED` | An authorized check ran and the observation matches the bounded expectation. |
| `DIVERGENT` | Observation and expectation disagree. Keep both. |
| `UNKNOWN` | Evidence is missing or inconclusive. |
| `NOT_EXECUTED` | Proposed, refused, or never attempted. |
| `NOT_AUTHORIZED` | A capability existed. Permission did not. |

Do not promote `healthy`, `GREEN`, or `connected` into `VERIFIED`.

## Boundaries

- Human review is required for consequential, destructive, or production action.
- Fail closed when policy, identity, or evidence is missing.
- Secrets stay out of source, logs, fixtures, and docs.
- Symbolic language (water, mirror, Ω, blessing, cosmic body) is meaning. It is not an implementation and not custody of money, identity, or physical systems.
- Projected revenue is not earned revenue.
- The longer design map stays in [docs/WHOLE-ECOSYSTEM-MASTER-PROMPT.md](docs/WHOLE-ECOSYSTEM-MASTER-PROMPT.md). This page does not restate it as fact.

## Read next

- [apps/README.md](apps/README.md) — how the two apps start
- [apps/api/README.md](apps/api/README.md) — routes the server registers
- [apps/web/README.md](apps/web/README.md) — dashboard
- [docs/README.md](docs/README.md) — documentation index
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) — local workflow
- [docs/ROADMAP.md](docs/ROADMAP.md) — earned phases
- [SECURITY.md](SECURITY.md) — how to report a vulnerability

## Evidence boundary for this page

Revised against `main` at `b4203efa1065a72ca46c06db0f116d0bfd71922a` (2026-10-16). That SHA is the parent of this documentation change. It is not a claim that CI, a container, or a deployed service was re-run for this sentence.

**License:** [Apache-2.0](LICENSE)
