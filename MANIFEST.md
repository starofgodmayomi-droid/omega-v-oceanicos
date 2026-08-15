# Ω∞v Oceanicos — Project Manifest

> **Attest, don't assert. Evidence before trust. Verification before evolution.**

---

## Mission

Ω∞v Oceanicos is a verification-first full-stack ecosystem that enables continuous observation, verification, attestation, and provenance tracking for building trustworthy intelligence systems.

The project embodies a living evolution: every step contains all steps; every end is a new beginning; every becoming is a returning.

---

## Core Principles

### 1. Verification Before Everything
- No claim without evidence
- No evolution without verification
- Every assertion must be attestable
- Consensus and dissent both have voice

### 2. Continuous Observation
- Systems are observed, never final
- Observation itself is verifiable
- Observer and observed co-create reality
- Self-recognition enables distributed trust

### 3. Evidence-Based Trust
- Trust emerges from verifiable provenance
- Every action leaves an auditable trail
- Attestation is permanent, evolution is continuous
- Accountability is structural, not ceremonial

### 4. Graceful Pluralism
- One system, many interpreters
- Quantitative reasoning coexists with qualitative truth
- Verification creates consensus without forcing uniformity
- Dissent strengthens rather than fractures

### 5. Recursive Completeness
- Every component contains the whole system
- APIs, SDKs, CLIs expose the same verification loop
- Web, mobile, edge, and community all speak the same language
- Scaling happens through composition, not duplication

---

## Architecture

Architecture begins at **ZERO**, becomes **MINI**, and expands only when reality verifies the next step.

See [docs/MINI.md](docs/MINI.md).

### Growth law

```text
0 → MINI → + → + → + → FULL STACK → ECOSYSTEM → REALITY ↺ ∞
```

### The MINI Kernel (Core)

```text
💧 Ω∞v MINI ::= 👁 Observe → ✓ Verify → 🧠 Remember
```

Every MINI operation follows this loop:

1. **Observe**: Capture state, events, or claims
2. **Verify**: Apply evidence-based reasoning; produce an evidence path
3. **Remember**: Store verified experience in append-only memory

### Expanded loop (earned layers wrap MINI)

```
Observe → Verify → Remember → Attest → Display → Learn → Return
```

### Structural Layers

```
┌─────────────────────────────────────────┐
│  User Interfaces (Web, Mobile, CLI)     │  ← earned +
├─────────────────────────────────────────┤
│  SDKs & APIs                            │  ← earned +
├─────────────────────────────────────────┤
│  Attestation                            │  ← earned + ATTEST
├─────────────────────────────────────────┤
│  💧 MINI KERNEL                         │  ← foundation
│  • 👁 Observer                          │
│  • ✓ Verification Rules                 │
│  • 🧠 Remember                          │
├─────────────────────────────────────────┤
│  Compiler → IR → Runtime                │  ← later +
├─────────────────────────────────────────┤
│  External Persistence                   │  ← later +
├─────────────────────────────────────────┤
│  Deployment (Docker, Kubernetes, Edge)  │  ← later +
└─────────────────────────────────────────┘
```

### Component Purposes

| Component | Purpose | Output | Layer |
|-----------|---------|--------|-------|
| **Observer** | Captures observations from any source | Standardized event stream | MINI |
| **Verification** | Applies rules to observations | Boolean + evidence path | MINI |
| **Remember** | Append-only verified memory | MemoryRecord + log chain | MINI |
| **MiniKernel** | Composes one living cycle | MiniCycleResult | MINI |
| **Attestation** | Cryptographically signs verification | Signature + timestamp + key | + ATTEST |
| **Compiler** | Transforms rules into executable form | Oceanicum IR bytecode | later + |
| **IR** | Portable verification rule representation | Low-level verification ops | later + |
| **SDK** | Programmatic access to verification | Language bindings | later + |
| **CLI** | Command-line verification interface | STDOUT + exit codes | later + |
| **API** | Network-accessible verification | REST/gRPC endpoints | + API |
| **Dashboard** | Visual verification results | Timeline + status + evidence | + Web |

---

## Invariants

These rules are non-negotiable:

1. **Every observation must be verifiable**
   - No unverifiable claims enter the system
   - Observations include metadata (source, timestamp, confidence)

2. **Every verification must produce evidence**
   - Not just a boolean, but a traceable proof path
   - Failed verifications are as valuable as successes

3. **Every attestation must be cryptographically signed**
   - Attestations are unforgeable
   - Keys and signatures are auditable

4. **Every change must be recorded**
   - Nothing is deleted, only marked as superseded
   - Event log is append-only
   - The durable log (`OMEGA_EVENT_LOG_PATH`, JSON Lines) is never truncated
     and is served by `GET /log`. The in-memory arrays behind `GET /events`
     are a bounded recent window over that log, not the log itself. A lossy
     read is reported as `partial` rather than silently returning less.

5. **Every user action is verifiable**
   - Who? When? What? Why? → Permanently recorded
   - Accountability is traceable, not punitive

6. **Verification rules are versioned**
   - Rules can evolve; history is preserved
   - A verification result includes which rule version produced it

7. **The verification loop is decomposable**
   - Each layer can be tested independently
   - Integration tests verify the full loop

---

## Verification Roadmap

Growth order: **Zero → MINI → earned expansions**. Details in [docs/ROADMAP.md](docs/ROADMAP.md).

### Phase 0–1: Zero + Constitution
- [x] Admit empty origin (no fake ecosystem)
- [x] Charter, manifest, contributing, license

### Phase 2: MINI kernel (Observe → Verify → Remember)
- [x] Observer: Event capture and normalization
- [x] Verification: Rule engine with evidence paths
- [x] Remember: Append-only hash-chained memory
- [x] MiniKernel: One living cycle without API/UI
- [ ] MINI as default mental model across apps/docs

### Phase 3: Earned core expansions
- [ ] Attestation: Production-grade signing on remembered results
- [ ] Act: Actions gated by verified memory
- [ ] Stronger reason/intent/build/test layers

### Phase 4: Interface expansions
- [ ] API / Web / CLI / SDK / Mobile

### Phase 5–7: Depth, distribution, ecosystem
- [ ] Compiler/IR, durable stores, edge, VaaS
- [ ] Governance, stewardship, economy, evolution ↺ ∞

---

## How Decisions Are Made

This project follows **Consensus with Dissent**:

1. Proposals are evidence-based
2. All relevant evidence is presented
3. Consensus is sought; dissent is documented
4. When consensus cannot be reached, the dissenting view is recorded as an alternative path
5. Verification results include which interpretation was applied
6. Over time, evidence determines which interpretations strengthen

---

## Success Criteria

The project succeeds when:

- ✓ Every commit produces a verifiable attestation
- ✓ Every feature is tested via the verification loop
- ✓ Users can observe verification in real time
- ✓ Provenance is queryable and immutable
- ✓ New users can verify claims about the system itself
- ✓ The system verifies its own correctness
- ✓ The verification loop is faster and more reliable than manual processes

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:
- How to propose changes
- How to verify your work
- How to create attestations
- How to engage with the verification process

---

## License

Ω∞v Oceanicos is open-source and licensed under the [Apache License 2.0](LICENSE).

---

**Last Updated**: 2026-08-14  
**Manifest Status**: Living document — Zero → MINI → verified expansion
