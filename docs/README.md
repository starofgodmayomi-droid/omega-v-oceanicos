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
- **[Architecture](./ARCHITECTURE.md)** — Formless Intelligence OS layers, The Current, and component map
- **[Verification Loop](./VERIFICATION_LOOP.md)** — Observe → Verify → Attest → Act → Learn → Recompile → Return

---

## Learning Paths

### For New Contributors
1. Read [CHARTER.md](../CHARTER.md) — understand our principles
2. Read [CONTRIBUTING.md](../CONTRIBUTING.md) — learn our workflow
3. Run through [DEVELOPMENT.md](./DEVELOPMENT.md) — set up locally
4. Find an issue labeled `good first issue` — make your first contribution
5. See your work merged and in production — celebrate!

### For Architects
1. Read [MANIFEST.md](../MANIFEST.md) — understand the vision
2. Study [ARCHITECTURE.md](./ARCHITECTURE.md) — how components fit together
3. Review [VERIFICATION_LOOP.md](./VERIFICATION_LOOP.md) — the core algorithm
4. Explore the codebase and propose improvements

### For Users
1. Read the README in the root — get oriented
2. Start with quickstart examples (coming soon)
3. Explore the CLI or SDK for your language
4. Join the community discussion

---

## API Reference

- **[REST API](./api/REST.md)** (coming soon)
- **[SDK Documentation](./sdk/README.md)** (coming soon)
- **[CLI Reference](./cli/README.md)** (coming soon)

---

## Deep Dives

### How Verification Works
- **[Verification Rules](./verification/RULES.md)** — How to write and test rules
- **[Evidence Paths](./verification/EVIDENCE.md)** — How verification produces provable results
- **[Attestation](./verification/ATTESTATION.md)** — Cryptographic signing and trust chains

### System Design
- **[Observer Pattern](./system/OBSERVER.md)** — Capturing verifiable observations
- **[Compiler & IR](./system/COMPILER.md)** — Rule language and bytecode
- **[Database & Provenance](./system/DATABASE.md)** — Append-only event store

### Community
- **[Code of Conduct](../CHARTER.md#code-of-conduct)** — How we treat each other
- **[Release Process](./RELEASES.md)** — How we publish versions (coming soon)
- **[Roadmap](./ROADMAP.md)** — What we're building next

---

## FAQ

**Q: How do I get started?**  
A: Follow the [Development Setup](./DEVELOPMENT.md) guide, then read [CONTRIBUTING.md](../CONTRIBUTING.md).

**Q: How do I verify my changes work?**  
A: Run `npm run verify` locally. See [CONTRIBUTING.md](../CONTRIBUTING.md#development-workflow) for details.

**Q: I found a bug. What do I do?**  
A: File an issue with reproduction steps. See [CONTRIBUTING.md](../CONTRIBUTING.md#bug-reports).

**Q: How do I suggest a feature?**  
A: Open an issue and describe the problem it solves. See [CONTRIBUTING.md](../CONTRIBUTING.md#feature-requests).

**Q: What if I disagree with a decision?**  
A: Provide evidence and propose alternatives. See [CHARTER.md](../CHARTER.md#how-we-make-decisions).

---

## Project Status

- **Current Phase**: Runtime (Phase 3) — loop is executable locally
- **Architecture**: Formless Intelligence OS documented in [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Next Phase**: Verification engine depth + durable memory/ledger
- **Stability**: Rapidly evolving — APIs may change

See [ROADMAP.md](./ROADMAP.md) and [MANIFEST.md](../MANIFEST.md#verification-roadmap) for the full roadmap.

---

## More Questions?

- **Technical questions**: Open an issue or discussion
- **Design questions**: Start a GitHub discussion
- **General questions**: Check [CHARTER.md](../CHARTER.md)

---

**Documentation Status**: Living — Evolves as the project grows  
**Last Updated**: 2026-08-14
