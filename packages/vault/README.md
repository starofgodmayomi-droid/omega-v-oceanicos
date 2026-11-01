# @omega-v/vault

Cryptographic State Vault, Checkpoint Backup & Disaster Recovery Engine for Ω∞v Oceanicos

## Overview

Ecosystem package for the Ω∞v Oceanicos platform.

## Public README alignment

- [README.md](../../README.md) — repo-wide mission and evidence-first system model
- [packages/store/README.md](../store/README.md) — append-only provenance backing this state layer
- [packages/attestation/README.md](../attestation/README.md) — proof layer over backed evidence and checkpoints
- [packages/security/README.md](../security/README.md) — security and authority boundaries that vault operations must respect

A vault is a protected storage and checkpoint boundary. It can preserve state, but it does not create trust, authority, or truth by itself.
