# Documentation map

Use this page to find the smallest authoritative guide for the task. Design language and architecture explain intent; source, tests, CI, and runtime observations establish what is implemented and what was verified.

## First read

- [Manifest](../MANIFEST.md) — mission and system map
- [Charter](../CHARTER.md) — principles and governance boundaries
- [Architecture](ARCHITECTURE.md) — components and dependency direction
- [MINI kernel](MINI.md) — the smallest verification loop
- [Verification loop](VERIFICATION_LOOP.md) — observation through reconciliation
- [Development setup](DEVELOPMENT.md) — install and run locally
- [Repository inventory](REPO_INVENTORY.md) — declared workspace versus observed files
- [Dependency map](DEPENDENCY_MAP.md) — declared package edges, not runtime health
- [Roadmap](ROADMAP.md) — staged expansion

## By task

| Task | Canonical guide |
|---|---|
| Start the applications | [Applications](../apps/README.md) · [API](../apps/api/README.md) · [Web](../apps/web/README.md) |
| Understand shared libraries | [Package index](../packages/README.md) |
| Work on the verification loop | [Verification package](../packages/verification/README.md) · [Observer](../packages/observer/README.md) · [Remember](../packages/remember/README.md) |
| Sign a result | [Attestation](../packages/attestation/README.md) |
| Use command-line or typed clients | [CLI](../packages/cli/README.md) · [SDK](../packages/sdk/README.md) |
| Inspect operational behavior | [Infrastructure](../infra/README.md) · [Tests](../tests/README.md) |
| Contribute changes | [Contributing](../CONTRIBUTING.md) · [Security](../SECURITY.md) |
| Understand symbolic language boundaries | [ƆREADE package](../packages/oreade/README.md) |

## Design specifications and ecosystem skills

Protocol, conflict-resolution, value-navigation, continuity, and whole-ecosystem design documents are available throughout `docs/spec/`, `docs/upgrades/`, and `skills/`. Treat prompts, symbolic models, simulations, and roadmaps as design inputs—not evidence that a capability is connected, authorized, deployed, or verified. Check the linked source and tests for implementation status.

## Evidence rule

`POSSIBLE ≠ IMPLEMENTED ≠ EXECUTED ≠ OBSERVED ≠ VERIFIED ≠ DEPLOYED`. Every operational claim should name the revision, environment, check, result, and remaining uncertainty.
