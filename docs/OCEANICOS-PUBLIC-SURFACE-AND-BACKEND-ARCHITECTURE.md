# OceanicOS Public Surface and Full-Stack Backend Architecture

**Status:** target architecture and implementation contract. This document does not claim every component is implemented or production-ready.

## 1. Product thesis

**OceanicOS is the approachable public surface. OMEGA × OceanicOS is the coordinated capability body behind it. Ω∞v is the evidence and verification discipline across the flow.**

People should be able to ask, explore, create, build, connect, inspect, or improve in natural language without needing to understand the whole repository. The system translates intent into a bounded, permission-aware task, routes it through capabilities that really exist, exposes truthful progress, and returns a result with evidence and limitations.

## 2. The ocean is a system contract

- **Surface:** task composer, workspace, results, history, approvals, evidence view.
- **Currents:** bounded task graph, dependencies, retries, cancellation, actual lifecycle state.
- **Confluence:** combine named results under a recorded merge rule.
- **Depth:** permitted context with source-linked provenance.
- **Pressure core:** policy/admission, contract checks, tests, expected-versus-observed comparison.
- **Evidence ocean:** task/run/event IDs, timestamps, source references, changed artifacts, checks, uncertainty.
- **Containment:** identity, workspace isolation, least privilege, quotas, secret protection, approvals.
- **Reflection:** compare outcomes with acceptance criteria and choose the next finite improvement.

Missing signals stay UNKNOWN or UNAVAILABLE. Simulations are labeled. Animation and model output are not proof.

## 3. Public-facing experience

1. **Intent entry:** one natural-language composer, optional attachments, simple modes such as Ask, Explore, Create, Build, Improve.
2. **Plan preview:** objective, steps, affected resources, required connections, acceptance criteria, risks.
3. **Authorization:** proceed only within existing grants; require explicit approval for consequential writes. Let users edit or cancel.
4. **Live task view:** ordered events and actual statuses; pause/cancel only where supported.
5. **Result workspace:** deliverables, changed files, findings, source links.
6. **Evidence drawer:** checks performed, pass/fail, supporting commits/runs, unknowns.
7. **History and reuse:** access-filtered receipts and reusable workflows.
8. **Feedback/value:** corrections, usefulness, completion, and time saved only when measured.

Keep the default experience simple; make technical detail inspectable rather than hidden or falsely simplified.

## 4. Backend capability body

| Layer | Responsibility | Required contract |
| --- | --- | --- |
| Identity and tenancy | Establish actor, workspace, resource boundary | Principal and scope |
| Intent/context | Interpret request and retrieve permitted context | Typed intent, source links, uncertainty |
| Planner | Produce bounded steps and acceptance criteria | Plan schema, dependencies, risk/budget |
| Policy/admission | Decide if exact operation is allowed | Policy version, decision, reasons, approval need |
| Capability registry | Advertise only real available actions | ID/version, schemas, scopes, availability |
| Orchestrator | Coordinate steps, retries, timeout, cancellation | Task/run/event state machine |
| Connector gateway | GitHub, Notion, Composio, future adapters | Least privilege, normalized errors |
| Execution workers | Run bounded isolated jobs | Job ID, limits, timeout, result |
| State/event ledger | Preserve state and ordered events | Durable IDs, timestamps, auditable history |
| Evidence/verification | Reconcile outcome against criteria | Per-check status and evidence references |
| Knowledge/memory | Store decisions and lessons with provenance | Freshness, access, retention/correction rules |
| Operations | Monitor and recover | Health, logs, alerts, rollback |
| Value measurement | Evaluate usefulness and economics | Baseline, metric, cost, observed outcome |

These are responsibility boundaries, not a claim that every layer must be a separate deployed service. Start with modular boundaries in the existing codebase and split services only when measured need justifies it.

## 5. One request, one verifiable flow

```text
PERSON → INTENT → IDENTITY/WORKSPACE → PERMITTED CONTEXT
→ PLAN + ACCEPTANCE CRITERIA → POLICY/ADMISSION
→ APPROVAL IF REQUIRED → TASK/RUN/EVENT IDS
→ BOUNDED EXECUTION → OBSERVE REAL RESULTS
→ VERIFY CRITERIA → RECONCILE EXPECTED VS ACTUAL
→ EVIDENCE RECEIPT → RESULT + LIMITATIONS
→ LEARN → NEXT FINITE CHANGE
```

Every stage needs a real state transition and a failure path. A plan never run remains NOT_EXECUTED. A tool response does not prove a downstream side effect until observed. A test proves only what its scope covers.

## 6. Task and evidence receipt

Where applicable, record task_id, run_id, correlation_id, event_id, actor/workspace scope, capability ID/version, intent and plan version, acceptance criteria, policy decision, state/timestamps, dependencies, idempotency key, source references, step outcomes, retries/timeouts/cancellation, changed artifacts, per-check verification, approval records, and observed costs. Never log secrets.

Suggested states: PROPOSED, NEEDS_APPROVAL, AUTHORIZED, RUNNING, SUCCEEDED, VERIFIED, REJECTED, CANCELLED, FAILED, DIVERGENT, UNKNOWN, NOT_EXECUTED. Preserve mixed per-step outcomes instead of collapsing them into one green status.

A receipt must answer: what was requested, allowed, actually run, changed, checked, passed, failed, and remains unknown?

## 7. Capability registry

The UI should query a trusted API for the real capability catalogue, not hard-code fictional powers. Each capability declares stable ID, description, availability/version, typed input/output schema, required scopes, data classification, read/write behavior, approval/reversibility, timeout/retry/idempotency/resource limits, and verification strategy.

Only advertise capabilities the current user may discover and invoke. A connected account does not authorize every operation. Connector tokens stay server-side and never appear in browser code or receipts.

## 8. Public-use security boundary

Before general public access, establish and test:

1. Authentication and workspace/tenant ownership.
2. Authorization for every API read/write, event stream, evidence link, and artifact download.
3. Separate read, execute, admin, and secret-management permissions.
4. Server-side credentials, redaction, rotation, and revocation.
5. Rate, concurrency, runtime, storage, and cost limits.
6. Prompt-injection boundaries: retrieved documents and tool outputs are data, not policy.
7. Human approval for publishing, spending, deletion, signing, scope changes, and other consequential actions.
8. Audit records without secrets or unnecessary private content.
9. Data retention, export, correction, and deletion rules.
10. Idempotent retries, cancellation, failure recovery.

Do not expose a local-development or trusted-admin API directly as a public multi-user service. Review authentication, CORS, browser/API boundaries, and per-resource authorization before public access is enabled.

## 9. Repository-grounded starting point

Source inspection of main found:
- A web app under apps/web and an API under apps/api.
- GET /v1/ecosystem/status is a read-only, evidence-bearing adapter. Its contract avoids claiming deployment or turning architecture labels into verified status.
- POST /v1/pipeline is rate-limited to 10/minute and requires compile, admission, authority, and policy inputs.
- The local job ledger already models a bounded synthetic-observe job with job ID, idempotency key, state, event IDs/sequences, timestamps, and provenance. It is not arbitrary task execution.
- OMEGA_AUTH_MODE supports local|required. If unset, the API defaults to local outside production and required in production; required mode expects distinct read/admin bearer tokens and explicit CORS origins.
- Governance documents legacy unauthenticated write endpoints intended to sit behind an authenticating gateway. Route-level behavior must be tested rather than inferred from configuration alone.
- Current water-intelligence work adds read-only runtime observation; it is not a complete public task platform.
- GitHub integration write attempts may fail because of the connected account's authorization; never claim an uncommitted file exists.

## 10. Staged vertical-slice roadmap

### Slice 1 — one trustworthy read-only public task
Use an existing safe endpoint, preferably GET /v1/ecosystem/status unless route inspection shows a better fit. Display real evidenceStatus, source, scope, policy, provenance, limitations, and explicit loading/error/unavailable/stale states.

**Exit:** a user submits intent, sees a truthful response, and can inspect what the response supports.

### Slice 2 — capability catalogue and approvals
Expose actual schemas/scopes; keep unsupported actions unavailable; add approval records for mutating/consequential actions.

### Slice 3 — evidence drill-down and continuity
Link statuses to source events, commits, checks, and permitted Notion records. Preserve freshness, provenance, and corrections.

### Slice 4 — multi-user security
Validate tenant isolation, per-resource authorization, quotas, audit, retention, recovery, and hostile cross-tenant tests.

### Slice 5 — controlled integrations
Connect services through least-privilege adapters. Record invocations and downstream observations; test idempotency and partial-failure recovery.

### Slice 6 — measure usefulness
Test real workflows. Measure completion, time-to-result, error/rework, per-task cost, and reported usefulness. Revenue remains a hypothesis until customer behavior validates it.

## 11. First implementation contract

**Objective:** one end-to-end read-only user intent backed by real API response and inspectable evidence.

Acceptance criteria:
- the request reaches an existing supported API capability;
- auth and route boundaries are tested;
- UI state derives from actual response data;
- source, provenance, scope, policy, limitations and uncertainty remain visible;
- missing data stays UNKNOWN/UNAVAILABLE;
- no fake execution progress or fabricated task is shown;
- tests cover valid, missing, denied, invalid, and unavailable responses;
- evidence links to exact source commit/checks;
- deployment remains unknown unless separately observed.

**Not in scope:** unrestricted autonomy, arbitrary execution for anonymous users, public access to every connector, self-modifying production code, guaranteed revenue, or a claim of production readiness.

## Definition of done

Code/contracts exist, relevant tests pass, authorization holds, actual outcomes are observed, evidence and limitations are visible, and the next step follows from the observed gap.

**The surface makes the ecosystem approachable. The backend makes it capable. The verification spine makes its claims accountable.**