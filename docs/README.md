# Documentation

Welcome to the Ω∞v Oceanicos documentation. Start here to understand the project and contribute effectively.

---

## Foundation Documents

### Getting Started

- **[Charter](../CHARTER.md)** — Our living agnostic principles and decision-making philosophy
- **[Manifest](../MANIFEST.md)** — Project mission, architecture, and verification loop
- **[Contributing](../CONTRIBUTING.md)** — How to submit PRs and work within our verification-first culture

### Development

- **[Development Setup](./DEVELOPMENT.md)** — Get the project running locally
- **[MINI Kernel](./MINI.md)** — Zero → MINI → verified expansion (canonical growth model)
- **[Architecture](./ARCHITECTURE.md)** — High-level system design from MINI outward
- **[Roadmap](./ROADMAP.md)** — Earned expansion phases
- **[Verification Loop](./VERIFICATION_LOOP.md)** — Full workflow including post-MINI steps

---

## Learning Paths

### For New Contributors

1. Read [CHARTER.md](../CHARTER.md) — understand our principles
2. Read [CONTRIBUTING.md](../CONTRIBUTING.md) — learn our workflow
3. Run through [DEVELOPMENT.md](./DEVELOPMENT.md) — set up locally
4. Find an issue labeled `good first issue` — make your first contribution
5. See your work merged and in production — celebrate!

### For Architects

1. Read [MINI.md](./MINI.md) — Zero → MINI → expansion law
2. Read [MANIFEST.md](../MANIFEST.md) — understand the vision
3. Study [ARCHITECTURE.md](./ARCHITECTURE.md) — how components fit together
4. Review [VERIFICATION_LOOP.md](./VERIFICATION_LOOP.md) — full workflow
5. Explore the codebase and propose improvements only as earned `+` layers

### For Users

1. Read the README in the root — get oriented
2. Run the published image — see [Infrastructure](../infra/README.md)
3. Call the loop — see the [REST API reference](../apps/api/README.md)
4. Verify the artifact's provenance before trusting it

---

## API Reference

- **[REST API](../apps/api/README.md)** — every endpoint, with request and
  response shapes. A test asserts this document describes every route the
  API actually registers, so it cannot drift from the code.
- **[Infrastructure](../infra/README.md)** — the image, its environment
  variables, and what does not exist yet.

The first CLI slice exists as [`@omega-v/cli`](../packages/cli/README.md).
It provides `omega status`, `omega events`, and `omega runs` as read-only clients
for real runtime evidence contracts. The first typed SDK slice exists as
[`@omega-v/sdk`](../packages/sdk/README.md). Mobile and broader integrations
remain on the [roadmap](./ROADMAP.md).

---

## Deep Dives

### How Verification Works

- **[The verification loop](./VERIFICATION_LOOP.md)** — observe, verify,
  attest, act, learn, recompile
- **[Verification rules](../packages/verification/README.md)** — the rule
  engine and the evidence paths it produces
- **[Attestation](../packages/attestation/README.md)** — HMAC signing, key
  fingerprints, and why there is no default key

### Specifications

- **[Attestation Envelope v1](./spec/ATTESTATION-ENVELOPE.md)** — the signed
  payload, its exact byte serialisation, and how to verify one **without
  running any code from this project**. Ships a reference verifier in Python
  that imports nothing from here.
- **[Browser verifier walkthrough](./BROWSER-VERIFIER.md)** — generate a
  temporary Ed25519 key pair, create a real local attestation, and verify it
  in the dashboard without sending the check to the API.

### Decisions

- **[1. Serve the web client from the API's origin](./decisions/0001-single-origin-deployment.md)**
  — why one container rather than two, what it costs, and the alternative that
  is preserved on a branch rather than deleted

### System Design

- **[Observer](../packages/observer/README.md)** — capturing normalized
  observations
- **[Memory](../packages/remember/README.md)** — the append-only
  hash-chained record
- **[MINI kernel](../packages/mini/README.md)** — observer + verifier +
  evidence + memory composed into one cycle
- **[Architecture](./ARCHITECTURE.md)** — how the packages fit together

There is no compiler or IR, and no database: state is a JSON snapshot and
two append-only files on disk.

### Community

- **[Charter](../CHARTER.md)** — how we treat each other
- **[Contributing](../CONTRIBUTING.md)** — how to propose a change
- **[Roadmap](./ROADMAP.md)** — earned expansion phases

---

## FAQ

**Q: How do I get started?**  
A: Follow the [Development Setup](./DEVELOPMENT.md) guide, then read [CONTRIBUTING.md](../CONTRIBUTING.md).

**Q: How do I verify my changes work?**  
A: Run `pnpm verify` locally. Windows, macOS, and Linux use the same Node-based lifecycle helpers; CI additionally runs the full compatibility gate on `windows-latest`. See [CONTRIBUTING.md](../CONTRIBUTING.md#development-workflow) for details.

**Q: I found a bug. What do I do?**  
A: File an issue with reproduction steps. See [CONTRIBUTING.md](../CONTRIBUTING.md#bug-reports).

**Q: How do I suggest a feature?**  
A: Open an issue and describe the problem it solves. See [CONTRIBUTING.md](../CONTRIBUTING.md#feature-requests).

**Q: What if I disagree with a decision?**  
A: Provide evidence and propose alternatives. See [CHARTER.md](../CHARTER.md#how-we-make-decisions).

---

## Project Status

- **Current Phase**: MINI kernel (Observe → Verify → Remember)
- **Next Phase**: Earned expansions (`+ Attest`, interfaces) after MINI is proven
- **Stability**: Rapidly evolving — APIs may change

See [MINI.md](./MINI.md) and [ROADMAP.md](./ROADMAP.md).

---

## More Questions?

- **Technical questions**: Open an issue or discussion
- **Design questions**: Start a GitHub discussion
- **General questions**: Check [CHARTER.md](../CHARTER.md)

---

**Documentation Status**: Living — Zero → MINI → verified expansion  
**Last Updated**: 2026-08-16
