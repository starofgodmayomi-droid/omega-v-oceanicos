# @omega-v/consensus

Byzantine Fault Tolerant (BFT) State Machine Replication & Proof-of-Attestation Consensus Engine for Ω∞v Oceanicos — Quorum Certificates, Block Finality, Slashing

## Overview

Ecosystem package for the Ω∞v Oceanicos platform.

## Public README alignment

- [README.md](../../README.md) — repository mission and evidence-first operating posture
- [packages/verification/README.md](../verification/README.md) — the rule engine that produces evidence before any broader agreement layer can act
- [packages/attestation/README.md](../attestation/README.md) — the signed proof that a verification outcome can leave the local system
- [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md) — the wider architectural context for subsystem layering

Consensus is an earned ecosystem layer. It can aggregate agreement over evidence, but it does not replace verification, human authority, or the bounded reality of the local runtime.
