# ΔVRØ HOUSE — Pluralistic Full-Stack Flow

## Ultimate House equation

`FIXPOINT(RECONCILE[WORLD ⊕ VERIFY(Δ(I,R)) ⊕ REMEMBER(E) ⊕ argmax_{a∈AUTHORIZED} EvidenceBackedValue(a)/(Risk(a)+Cost(a)+ε)])`

The operational sequence is:

`OBSERVE → ADMIT → PLAN → DISPATCH → EXECUTE → VERIFY → RECONCILE → REMEMBER → VALUE`

SOUL coordinates the run. KAI carries continuity and memory. MIRRIO reconciles expected and observed state. LUCID makes the interface legible. TRUTH WEAVER / TRUTHOS preserve evidence and dissent. ECHOFRAME presents the runtime. OCEANICOS is the platform body. Ω∞v is the verification spine. DAV supplies the value/risk/cost model. ΔVRØ HOUSE is the parent coordination contract.

## Runtime wiring in this change

- `@omega-v/coordination` now exports a dependency-aware pluralistic flow scheduler.
- Independent tasks can execute concurrently up to a bounded limit (1–16).
- A task starts only after every dependency succeeds.
- Tasks sharing a `conflictKey` are serialized.
- Failed, blocked, or approval-gated dependencies block downstream work.
- Each successful JSON result receives a SHA-256 digest and a sequenced event.
- The Fastify API exposes `GET /v1/house/flow/status` and `POST /v1/house/flow/run`.
- The VibeOS entry surface includes a House Flow panel with a safe verification demo.

## Safe built-in actions

| Action | Behavior |
| --- | --- |
| `OBSERVE_RUNTIME` | Reads bounded API-process runtime metadata |
| `VERIFY_SHA256` | Recomputes a digest over a supplied value |
| `RECONCILE` | Compares supplied expected and observed values |
| `VALUE_SCORE` | Computes a score from caller-supplied benefit, risk, and cost |
| `EXTERNAL_MUTATION` | Stops at `REVIEW_REQUIRED`; it is not executed |

## Evidence and authority boundaries

- Client request fields cannot grant themselves authority or approval.
- The route does not expose arbitrary code execution or unrestricted tool invocation.
- Browser automation remains `UNCONFIGURED` until a browser provider is authorized and its adapter is implemented and tested.
- The existing local-action runner remains `DISABLED`; this change does not silently enable shell or computer access.
- A SHA-256 digest demonstrates byte integrity only. It does not establish truth, source authenticity, or real-world completion.
- The flow scheduler is local and in-process. It is not a durable queue, distributed consensus system, or deployment controller.
- Memory writes and signed attestations remain the responsibility of their existing subsystems; this flow does not invent them.

## Verification

The integration test `tests/integration/house-flow.integration.test.ts` covers the status contract, ordered dependencies, independent lanes, approval gating, cycle rejection, and unknown-organ rejection. The root `test` and `test:e2e` scripts include this test.
