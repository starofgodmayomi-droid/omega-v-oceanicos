<p align="center">
  <img src="apps/web/public/omega-mark.svg" alt="Ω∞v OCEANICOS" width="76" height="76" />
</p>

<h1 align="center">OCEANICOS</h1>
<p align="center"><strong>REALITY, VERIFIED.</strong></p>
<p align="center">Ω∞v is the verification loop. OCEANICOS is the ecosystem built around it.</p>

[![Verification](https://github.com/starofgodmayomi-droid/omega-v-oceanicos/actions/workflows/verify.yml/badge.svg)](https://github.com/starofgodmayomi-droid/omega-v-oceanicos/actions/workflows/verify.yml) [![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

> **Attest, don’t assert. Evidence before trust. Verification before evolution.**

OCEANICOS is verification-first infrastructure for translating human intent into bounded, observable, auditable transitions. Its interfaces and subsystems may expand; evidence, policy, authority, and explicit outcome states remain the control boundary.

## The whole system, compressed

```text
Ω∞v = VERIFY(Δ(Intent, Reality))
MINI = OBSERVE → VERIFY → REMEMBER
FLOW = INTENT → EVIDENCE → AUTHORITY → POLICY → ADMISSION
       → BOUNDED EXECUTION → OBSERVATION → RECONCILIATION
       → ATTESTATION → PROVENANCE → NEXT FINITE Δ
```

`∞` means repeatable finite transitions—not unlimited autonomy, access, budget, or authority. `POSSIBLE ≠ KNOWN ≠ EXECUTED ≠ OBSERVED ≠ VERIFIED`. When evidence is missing, preserve `UNKNOWN`; when reality disagrees, preserve `DIVERGENT`; when no action occurred, record `NOT_EXECUTED`.

## Start here

**Requirements:** Node.js `>=22`, pnpm `10.34.5` (see the root `package.json`). From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm dev                 # builds workspace, starts API + web
```

Useful verification commands:

```bash
pnpm build               # build workspace packages
pnpm test                # registered web + integration checks
pnpm verify:full         # repository totality/verification sequence
pnpm smoke:api           # build and smoke-test the API
pnpm test:worker         # bounded worker lifecycle checks
pnpm validate:skills     # validate repository skill contracts
pnpm format:check        # git diff --check
```

Use `pnpm --filter @omega-v/<package> test` only for packages that declare a `test` script; inspect each package manifest before assuming a command exists. A successful local test is evidence for that test scope, not proof of deployment or production health.

## Navigate the ecosystem

| Need | Start here |
|---|---|
| Project principles and scope | [Manifest](MANIFEST.md) · [Charter](CHARTER.md) · [Formless architecture](FORMLESS.md) |
| System architecture | [Architecture](docs/ARCHITECTURE.md) · [MINI kernel](docs/MINI.md) · [Verification loop](docs/VERIFICATION_LOOP.md) |
| Local setup | [Development guide](docs/DEVELOPMENT.md) · [Applications](apps/README.md) |
| HTTP API | [API contract](apps/api/README.md) |
| Web interface | [Web dashboard](apps/web/README.md) |
| Shared libraries | [Package map](packages/README.md) |
| Full documentation index | [docs/README.md](docs/README.md) |
| Deployment boundary | [Infrastructure guide](infra/README.md) |
| Test inventory | [Test guide](tests/README.md) |
| Repository skills | [Skills index](.claude/skills/README.md) |
| Security reports | [Security policy](SECURITY.md) |
| Contributing | [Contributing guide](CONTRIBUTING.md) |

## Architecture at a glance

```text
Human intent
  → ΩIR / typed contracts
  → evidence + source provenance
  → policy + authority + admission
  → bounded worker/runtime or API action
  → observation + reconciliation
  → verification result + optional attestation
  → append-only memory, trace, and next proposal
```

The API and web dashboard are interfaces to this model, not independent sources of truth. Package boundaries and public exports are defined by their source and manifests. The repository also contains experimental and domain-oriented packages; a package name or README title alone does not establish a distributed network, blockchain deployment, hardware enclave, production service, or external-world verification.

## Operating rules

- **No evidence → no verified claim.** Identify source, time, scope, and method.
- **No authority → no execution.** Capability is not permission; consequential work needs the required approval.
- **Tests ≠ reality.** CI proves only the checks it actually ran against the tested revision.
- **Simulation ≠ deployment.** Keep local, CI, staging, and production evidence distinct.
- **Memory ≠ proof.** Preserve provenance and re-observe claims that can change.
- **Dissent is data.** Keep uncertainty, divergent results, and rejected proposals visible.

## Contribute

Read [CONTRIBUTING.md](CONTRIBUTING.md), identify the smallest useful delta, make a bounded change, run the relevant checks, and report the exact revision and evidence. Prefer a reviewable pull request over an unverified claim of completion.

**Canonical rule:** `Reality is the final authority. No claim wider than its evidence.`
