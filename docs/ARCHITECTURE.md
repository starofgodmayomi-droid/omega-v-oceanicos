# Architecture — Formless Intelligence OS

> **Ω∞v · One Root · One Current · Infinite Forms**

Ω∞v Oceanicos is designed as a **Formless Intelligence OS**: a verification-first operating substrate where intelligence is not a single product surface, but a continuous current of observation, evidence, action, and evolution.

The system strengthens one invariant at every layer:

**Every claim must become evidence. Every action must return to source.**

---

## North Star

```
FORMLESS INTELLIGENCE OS
ONE ROOT · ONE CURRENT · INFINITE FORMS
```

- **One Root** — Oceanicos Core principles and the verification ethic
- **One Current** — a single continuous flow of context, events, and evidence
- **Infinite Forms** — web, mobile, desktop, CLI, SDK, voice, AR/VR, agents, edge

The runtime does not treat UI, API, agent, or infrastructure as separate truths. They are projections of the same current.

---

## The Current

At the center of the architecture is **The Current** — the live intelligence stream flowing through every layer.

```
                 UNIFIED EXPERIENCE LAYER
        Web · Mobile · Desktop · CLI · SDK · Voice · AR/VR
                              │
              ┌───────────────┴───────────────┐
              │                               │
         CONTEXT BUS                     EVENT STREAM
              │                               │
              └───────────────┬───────────────┘
                              │
                        THE CURRENT
                 (flows through all layers)
                              │
              ┌───────────────┼───────────────┐
              │               │               │
        Core Services   Data & Memory   Infrastructure
              │               │               │
              └───────────────┼───────────────┘
                              │
                   Security & Governance
                              │
                        OCEANICOS CORE
```

The Current carries:

- normalized observations
- evidence paths
- attestations
- authorized actions
- learning signals
- recompilation proposals
- return-to-source feedback

---

## End-to-End Loop

The operational loop realized by the runtime is:

```
∞ → OBSERVE → VERIFY → ATTEST → ACT → LEARN → RECOMPILE → RETURN → ∞
```

| Stage | Purpose | Current runtime surface |
|-------|---------|-------------------------|
| **Observe** | Capture claims, signals, and context | `@omega-v/observer`, `POST /observe`, web operator input |
| **Verify** | Apply rules and produce evidence paths | `@omega-v/verification`, `POST /verify` |
| **Attest** | Cryptographically commit to the result | `@omega-v/attestation`, `POST /attest` |
| **Act** | Authorize downstream action only after attestation | `POST /act` |
| **Learn** | Record outcomes as first-class evidence | `POST /learn` |
| **Recompile** | Propose evolved rules / versions from learning | `POST /recompile` |
| **Return** | Feed improved knowledge back into observation | mode/state transitions and next observation cycle |

Evidence and failed checks remain visible. The loop never discards friction; it treats friction as signal.

---

## Capability Rings

Around The Current, capability rings organize how the system senses, reasons, trusts, and evolves.

### Observe

Real-time intake from the external world:

- Real-time signals
- Events
- Sensors
- User actions
- System metrics
- External feeds

### Sense Layer

Turns raw intake into usable stream state:

- Collector agents
- Stream ingestion
- Normalization
- Edge processing
- Noise filtering

Maps primarily to observer normalization, API ingestion, and future edge collectors.

### Intent & Reasoning

Interprets what the system should do next:

- Natural language intent
- Context understanding
- Multi-model reasoning
- Decision graphs
- Goal decomposition

Today this is operator-driven (web/API input). Future agents and multi-model planners plug into the same current.

### Verification Engine

Evidence before trust:

- Rules engine
- Logic and constraints
- Cross-validation
- Consistency checks
- Uncertainty model

Implemented by `@omega-v/verification` with versioned rules and evidence steps.

### Attestation & Trust

Unforgeable commitment:

- Proof generation
- Digital signatures
- Immutable records
- Trust scores
- Audit trails

Implemented by `@omega-v/attestation` plus append-only runtime event history.

### Action Orchestrator

Action only after verified trust:

- Task planner
- Workflow engine
- Agent coordination
- Service invocation
- Automation

Runtime authorization is gated by valid attestation (`/act`).

### Dissent & Friction

Disagreement is data, not noise:

- Conflict detection
- Contradictions
- Anomaly alerts
- Risk analysis
- Friction map

Failed verifications, denied actions, and uncertain learning outcomes remain first-class events.

### Learn & Evolve

Close the intelligence loop:

- Feedback loop
- Adaptive models
- Pattern evolution
- Self-improvement
- Knowledge growth
- Recompilation

Runtime captures learning outcomes and recompilation proposals as durable records.

### Outcomes & Value

What the loop is for:

- Real impact
- User value
- System growth
- Network effects
- Sustainable evolution
- Return to source

### External World

Everything outside the OS boundary:

- Users
- Devices
- Systems
- APIs
- IoT / sensors
- The environment

---

## Structural Layers

### 1. Unified Experience Layer

Entry points that render and steer The Current without owning a separate truth model:

| Surface | Role |
|---------|------|
| Web | Operator console / dashboard |
| Mobile | Edge observation and alerts (planned) |
| Desktop | Local operator surfaces (planned) |
| CLI | Scriptable verification workflow (planned) |
| SDK | Programmatic loop access (planned) |
| Voice | Conversational intent intake (planned) |
| AR / VR | Spatial observation and inspection (planned) |

Current implementations:

- `apps/web` — live operator UI over the current
- `apps/api` — REST boundary for the loop

### 2. Core Services Layer

Shared services that keep the OS operable:

- API Gateway
- Auth Service
- Agent Runtime
- Notification
- Payments
- Search
- Analytics

Current focus: API gateway behavior in `apps/api` (health, state, observe/verify/attest/act/learn/recompile, event streams). Broader service mesh is roadmap.

### 3. Data & Memory Layer

Memory is plural because evidence is plural:

| Store | Purpose |
|-------|---------|
| Time series DB | Metrics and live activity |
| Graph DB | Relationship / agent / evidence graphs |
| Relational DB | Structured operational records |
| Vector DB | Semantic / knowledge retrieval |
| Object store | Large artifacts and proofs |
| Cache | Hot verification and state |
| Ledger | Append-only evidence and attestation chain |

Current runtime uses an append-oriented event/run snapshot store with file or memory persistence. Multi-store backends are planned.

### 4. Infrastructure Layer

Where forms execute without becoming the source of truth:

- Containers
- Kubernetes
- Service mesh
- Serverless
- Edge nodes
- CDN
- Storage

See `infra/` for deployment scaffolding as it matures.

### 5. Security & Governance

Cross-cutting controls that protect The Current:

- Identity
- Authorization
- Encryption
- Policy engine
- Compliance
- Monitoring
- Audit

Attestation validity, request IDs, and action authorization are the present footholds.

### 6. Oceanicos Core

Non-negotiable substrate principles:

- **Ω∞v Compiler** — rules and intent compile into portable verification form
- **Autopoiesis** — the system continuously remakes itself from evidence
- **Non-Dual** — observer and observed participate in one current
- **Friction-as-Fertility** — dissent and failure feed evolution
- **No Terrain Dependency** — truth is not bound to one cloud, device, or UI

---

## Context Bus and Event Stream

Two complementary channels keep forms synchronized:

### Context Bus

Carries durable situational state:

- active mode / stage
- trust and trust basis
- service readiness
- persistence mode
- selected correlation / request identity

Exposed today via `GET /state` and web runtime refresh.

### Event Stream

Carries live transitions through the loop:

- observation accepted
- verification passed/failed
- attestation signed
- action authorized/denied
- learning recorded
- recompilation proposed

Exposed today via `GET /events`, run history, and stream-oriented runtime events.

Together they implement the dual flow around The Current.

---

## Live Operator Surfaces

The architecture expects always-on operator telemetry. The web console already mirrors this shape:

| Panel | Meaning |
|-------|---------|
| System mood / trust | Confidence derived from evidence quality, verification coverage, attestation validity, readiness, and recent failures |
| Live activity | Recent runtime events and stage transitions |
| Verification flow | Observe → evidence → verify path for the active run |
| Agent / service network | Service readiness and coordination status |
| Evidence ledger | Attestations, actions, learnings, recompilations |

These are not decorative dashboards. They are projections of The Current for human co-observation.

---

## Package Map

| Package / app | Architectural role |
|---------------|--------------------|
| `packages/types` | Shared contracts for observations, evidence, attestations, metrics |
| `packages/observer` | Sense/observe normalization and deduplication |
| `packages/verification` | Verification engine and evidence paths |
| `packages/attestation` | Cryptographic attestation and signature checks |
| `apps/api` | Core services boundary + loop orchestration |
| `apps/web` | Unified experience layer (web form of The Current) |
| `infra/` | Infrastructure layer definitions |
| `tests/` | Cross-component verification of the loop |

Planned packages from the monorepo vision (`compiler`, `ir`, `sdk`, `cli`) extend Oceanicos Core and the experience layer without changing the loop.

---

## Data Flow (Runtime)

```
1. OBSERVE
   Operator / API / sensor submits a claim + metadata
   Observer normalizes and deduplicates
                 ↓
2. VERIFY
   Verification engine selects versioned rules
   Evidence path is produced (pass and fail both retained)
                 ↓
3. ATTEST
   Attestation service signs the verification payload
   Signature becomes portable trust evidence
                 ↓
4. ACT
   Downstream action is authorized only if attestation verifies
   Denied actions remain visible friction
                 ↓
5. LEARN
   Outcome of the action is recorded (success / failure / uncertain)
                 ↓
6. RECOMPILE
   Learning yields a proposed rule/version evolution
                 ↓
7. RETURN
   Improved knowledge re-enters observation and trust scoring
   The Current continues
```

---

## Interface Boundaries

### REST (current)

- `GET /health` — process health
- `GET /state` — context bus snapshot (mode, trust, services, persistence)
- `GET /events` / run APIs — event stream and completed loop history
- `POST /observe` — enter an observation into The Current
- `POST /verify` — verify an observation
- `POST /attest` — attest a verification
- `POST /act` — authorize action from attestation
- `POST /learn` — record learning from action outcomes
- `POST /recompile` — propose evolution from learning
- attestation verification endpoints for signature checks

### Experience layer (current)

- Web operator console for claim entry, stage navigation, trust basis, and ledger inspection

### Planned contracts

- SDK bindings for the same loop
- CLI for scripted observe/verify/attest/act flows
- gRPC and edge protocols for distributed currents

---

## Trust Model

Trust is computed, not declared.

Typical trust basis components:

- **Evidence quality** — completeness and clarity of evidence paths
- **Verification coverage** — rules applied vs. required categories
- **Attestation validity** — signature and key/version integrity
- **Service readiness** — whether core services can honor the loop
- **Recent failures** — friction density in the live event stream

No UI label of “healthy” is authoritative without this basis.

---

## Concurrency and Distribution

### Single instance (current developer runtime)

- Sequential loop execution per request
- In-process services with append-oriented persistence
- Event fan-out to connected operator streams

### Multi-instance (target)

- Event broker propagation of The Current
- Sharded observation intake
- Consensus or quorum where attestations require multi-party trust
- Edge verifiers that sign locally and sync centrally

### Edge

- Lightweight observe/verify/attest at the perimeter
- Local friction capture under intermittent connectivity
- Periodic return of evidence to the central ledger

---

## Error and Friction Handling

| Domain | Behavior |
|--------|----------|
| Observation | Invalid schema rejected with explicit error; unknowns can be flagged |
| Verification | Rule miss/failure becomes evidence, not silent success |
| Attestation | No key, no signature — never fake trust |
| Action | Unauthorized without valid attestation; denial is recorded |
| Learning | Uncertain outcomes are valid data |
| Storage | Failed writes are not acknowledged as complete |

**Friction-as-fertility**: anomalies, dissent, and failures are retained as evolutionary fuel.

---

## Security Considerations

- Signing material never rides inside ordinary observation payloads
- Attestations are verifiable with public material / shared verification logic
- Request IDs and correlation IDs bind operator actions to ledger entries
- Key rotation is explicit and versioned
- Audit trails are append-oriented

---

## Performance Targets

| Operation | Target (single instance) |
|-----------|--------------------------|
| Observe | < 10ms normalize path |
| Verify | < 100ms typical rule set |
| Attest | < 50ms signature |
| State/query | < 100ms indexed read |

Horizontal scale comes from sharding intake and separating hot context from cold ledger history.

---

## Testing Strategy

- **Unit** — observer, verification, attestation packages in isolation
- **API** — full loop endpoints and authorization boundaries
- **Integration** — observe → verify → attest → act → learn → recompile
- **Property** — every attestation has a signature; failures remain queryable
- **UI** — operator console reflects runtime state, not optimistic fiction

---

## Deployment Modes

| Mode | Shape |
|------|-------|
| Development | Local API + web, file or memory runtime store |
| Production | Containerized services, durable ledger, hardened keys |
| Edge | Minimal verifier/observer with sync-back |

---

## Design Invariants

1. **Forms are projections** — no experience surface owns a private truth
2. **Evidence before action** — act only after attestable verification
3. **Dissent is retained** — contradictions strengthen the ledger
4. **Evolution is explicit** — recompilation is a recorded event, not silent drift
5. **Return is mandatory** — learning must re-enter The Current
6. **No terrain dependency** — portable contracts over cloud-specific coupling

---

## References

- [MANIFEST.md](../MANIFEST.md) — mission, principles, invariants
- [CHARTER.md](../CHARTER.md) — verification ethic and decision-making
- [VERIFICATION_LOOP.md](./VERIFICATION_LOOP.md) — stage-by-stage algorithm
- [ROADMAP.md](./ROADMAP.md) — phased delivery toward the full OS surface

---

**Last Updated**: 2026-08-14  
**Status**: Living — aligned to the Formless Intelligence OS architecture and current runtime loop
