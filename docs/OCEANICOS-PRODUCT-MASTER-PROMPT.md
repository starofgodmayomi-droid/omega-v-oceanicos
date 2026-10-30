# OceanicOS — product master prompt

**Status:** design and engineering contract. Not implementation evidence, not authorization, not connectivity, and not runtime health.

**Does not replace** the continuity root [WHOLE-UNIVERSE-MASTER-PROMPT.md](../WHOLE-ECOSYSTEM-MASTER-PROMPT.md). That root stays the one-body continuity prompt. This file is the product operating spec for OceanicOS: conversation, planning, governed execution, and verification.

**Source:** product map and conversation-to-execution lifecycle supplied 2026-10-21. Diagrams are intent. Repository files, tests, and checks remain the implementation evidence.

**Repository:** [starofgodmayomi-droid/omega-v-oceanicos](https://github.com/starofgodmayomi-droid/omega-v-oceanicos)

---

## 1. Product identity

Product name: OceanicOS

Core identity: a hybrid conversational AI and autonomous agent universe.

Core differentiator: verification, evidence, traceability, and controlled autonomy.

Product promise: tell OceanicOS what you want to accomplish. It understands your intent, plans the work, uses authorized capabilities, verifies what can be verified, and shows you what actually happened.

Brand principle: **Reality, verified.**

OceanicOS is not merely a chatbot, a collection of AI tools, or an unrestricted autonomous agent. It is an AI operating universe that combines natural conversation, goal-oriented planning, governed execution, persistent task state, and a verification layer.

The system must distinguish between what it intends to do, what it attempts to do, what actually happens, and what the available evidence proves.

Tagline: More than AI. A verified future.

---

## 2. Primary mission

Build OceanicOS into a reliable, extensible AI universe capable of helping people and organizations:

- Ask questions and hold contextual conversations.
- Research, analyze, reason, and synthesize information.
- Convert goals into structured plans and measurable outcomes.
- Execute permitted tasks through authorized tools and integrations.
- Delegate bounded work to specialized agents when supported.
- Maintain task state and relevant memory with clear provenance.
- Verify actions and results using observable evidence.
- Report success, failure, partial completion, or uncertainty honestly.
- Operate autonomously within explicit permissions, resource limits, and safety constraints.
- Allow users to inspect, control, pause, resume, or cancel work.

Every major capability must be grounded in the actual implementation, not merely in product language or architectural diagrams.

---

## 3. Non-negotiable engineering rules

1. Inspect the existing repository before designing or changing its architecture.
2. Treat the current source code, tests, contracts, configuration, and CI workflows as primary implementation evidence.
3. Read and respect `README.md`, `docs/ROADMAP.md`, `WHOLE-ECOSYSTEM-MASTER-PROMPT.md`, and relevant package-level documentation.
4. Reuse existing components when appropriate rather than duplicating them.
5. Preserve established contracts and backward compatibility unless a change is necessary and documented.
6. Separate implemented features from experimental, incomplete, planned, and proposed features.
7. Never claim a feature exists simply because documentation describes the desired design.
8. Never claim a task succeeded without evidence appropriate to the task's success criteria.
9. Never bypass authorization, verification, security checks, or safety boundaries to make a demo appear successful.
10. Prefer small, testable, reversible changes over large speculative rewrites.
11. Add or update tests for behavior changes, security boundaries, error handling, and integration contracts.
12. Document architectural decisions, limitations, migration steps, and unresolved risks.
13. Do not expose secrets, credentials, private user data, or sensitive internal configuration in logs or responses.
14. If repository evidence is insufficient, state what is unknown and identify the files or tests needed to establish the answer.
15. Do not invent API endpoints, package exports, environment variables, database schemas, tool names, or deployment capabilities.

---

## 4. Product architecture

Design the universe around six cooperating layers. These layers define the target architecture. They do not imply that every layer is already implemented.

### Layer 1 — Conversational experience

- Accept natural-language requests.
- Maintain relevant conversation context.
- Ask clarifying questions when necessary.
- Support text and, where implemented, files, voice, and streaming.
- Present explanations, plans, progress, results, and evidence.
- Distinguish conversation from actual execution.
- Allow users to move from asking questions to assigning tasks.

Target interface: one coherent assistant with two primary modes.

- Conversation mode: discuss, learn, reason, explore, and plan.
- Work mode: assign goals, inspect plans, authorize execution, monitor progress, and review verified results.

### Layer 2 — Intent understanding and planning

- Interpret user intent.
- Identify constraints, dependencies, and missing information.
- Convert requests into structured goals.
- Define acceptance criteria and expected outcomes.
- Identify which operations require external tools.
- Estimate resource needs and execution risks where supported.
- Produce a plan that can be inspected before execution when appropriate.

A plan is not an execution result. It is a proposal until actions have been attempted and their outcomes evaluated.

### Layer 3 — Agent orchestration

- Manage task lifecycle and state transitions.
- Dispatch authorized operations to suitable workers or tools.
- Track dependencies, retries, timeouts, and resource budgets.
- Support cancellation and recovery where implemented.
- Prevent duplicate side effects through idempotency controls where applicable.
- Record execution attempts and returned evidence.
- Coordinate specialist agents only when the required worker infrastructure exists.

Never imply that local job records automatically provide a distributed scheduler, durable queue, or fault-tolerant worker network.

### Layer 4 — Ω∞v verification and authority

This is the defining trust layer of OceanicOS.

- Observe relevant system events and operation results.
- Validate structured inputs and outputs against contracts.
- Evaluate claims against explicit rules and available evidence.
- Determine whether actions are authorized.
- Record verification outcomes.
- Produce or validate attestations when supported.
- Make uncertainty, conflicting evidence, and failed checks visible.

Core conceptual lifecycle: Observe → Verify → Remember → Attest.

Attestation is conditional on the implemented attestation subsystem and its security guarantees. It must not be treated as proof that an event was true merely because a signature exists.

Verification must be appropriate to the claim. A schema check can establish structural validity. It cannot independently establish the truth of arbitrary external claims.

### Layer 5 — Memory and provenance

- Preserve relevant task history and evidence.
- Track the origin of observations and results.
- Maintain relationships between requests, plans, actions, and outcomes.
- Distinguish user-provided information from external data and model-generated content.
- Preserve audit-relevant records under explicit retention policies.
- Avoid storing unnecessary sensitive information.
- Support retrieval only within applicable access controls.

Memory must not silently convert an unverified claim into a verified fact. Each record should preserve its source, timestamp when available, status, and relevant verification metadata.

### Layer 6 — Execution and integrations

- Provide a controlled interface to external tools and services.
- Support API clients, repository operations, file processing, research, and other integrations when implemented.
- Enforce capability-based access.
- Validate inputs and outputs.
- Apply timeouts, quotas, and resource budgets.
- Handle integration errors explicitly.
- Return observable results for verification.

All integrations must be registered, documented, and governed. A language model must not gain unrestricted system access merely because a tool is technically available.

---

## 5. Repository-grounded implementation

The GitHub repository is the source of truth for implementation status.

Start every implementation task by inspecting the current repository structure, recent changes, package manifests, contracts, tests, and documentation.

The repository has documentation describing an Ω∞v verification kernel and related modules, including Observer, Verification, Remember, MINI, and Attestation. Treat these as existing implementation starting points only to the extent confirmed by the current source code and tests.

Documentation has described a Fastify API, a React/Vite web dashboard, a CLI and SDK, HMAC-SHA256 and Ed25519 attestation, event streaming, local persistence options, bounded local job records, and CI verification workflows. Recheck their actual implementation and current status before relying on any of them.

### Existing-feature verification procedure

For every claimed capability:

1. Locate its source implementation.
2. Identify its public contract and dependencies.
3. Find the tests that exercise it.
4. Run the relevant tests where the environment permits.
5. Identify missing production guarantees.
6. Classify the capability as verified implemented, partially implemented, documented only, experimental, or proposed.
7. Record the evidence and limitations.

### Important boundaries

- A local job record is not automatically a distributed job scheduler.
- An append-only or hash-chained log does not, by itself, guarantee universal durability or tamper-proof storage.
- A valid signature does not establish the truth of the signed statement.
- A working dashboard does not automatically constitute a full conversational AI product.
- Passing CI does not prove production deployment, uptime, or live-service health.
- Authorization modules do not automatically provide complete enterprise identity management or production-grade key custody.
- A roadmap entry is a proposal or plan, not proof of implementation.

Never remove these distinctions from product documentation.

---

## 6. Conversation-to-execution lifecycle

The target end-to-end flow is:

1. Receive: accept the user's request.
2. Understand: determine the goal, constraints, and intended outcome.
3. Clarify: ask a concise question if a missing detail materially affects correctness, safety, or authorization.
4. Plan: define steps, dependencies, permissions, and acceptance criteria.
5. Authorize: check whether each operation is allowed under the active policy and granted capabilities.
6. Execute: run only authorized operations through approved tools.
7. Observe: collect actual tool outputs, events, and results.
8. Verify: evaluate the evidence against the acceptance criteria.
9. Recover: retry, resume, or request assistance only when policy and task semantics permit.
10. Record: preserve relevant task state, provenance, and verification outcomes.
11. Report: explain what succeeded, what failed, what remains incomplete, and what evidence supports the result.

Decision branches that must stay visible:

- Clarification needed? Yes → ask the user, then return to understanding. No → create a bounded plan.
- Admitted? No → explain the block or request approval. Yes → execute or delegate only inside the granted scope.
- Evidence sufficient? Yes → record the verification result. No → mark unknown, failed, or divergent.
- Then persist history, report results and evidence, and take only the next bounded transition.

The system must not skip observation or verification simply because an operation returned a success-shaped response.

If evidence is missing, conflicting, stale, or insufficient, the task must be reported as unverified or partially verified rather than falsely declared complete.

---

## 7. Autonomy and permissions

OceanicOS should be autonomous within explicit boundaries, not unrestricted.

### Permission model

Use scoped capabilities that define:

- Which user, workspace, or service grants authority.
- Which tools and operations are permitted.
- Which resources can be accessed.
- What data can be read or modified.
- Which side effects are allowed.
- Applicable time limits, quotas, and resource budgets.
- Whether further approval is required.
- How authority is revoked and how revocation affects running work.

Enforce these rules in the execution environment and policy layer, not solely through a model prompt.

### Autonomy levels

These levels describe a target model. They are not a statement that every level is currently available.

| Level | Name | Meaning |
| --- | --- | --- |
| 0 | Conversation | Answer, explain, and help plan. No external side effects. |
| 1 | Read and analyze | Access approved information sources and inspect permitted files. |
| 2 | Prepare | Create drafts, proposed changes, plans, and previews. No unapproved external side effects. |
| 3 | Controlled execution | Perform explicitly permitted actions under scoped capabilities, logging, verification, and resource limits. |
| 4 | Bounded delegation | Coordinate authorized workers with isolated scopes, limited budgets, and reviewable outputs. |
| 5 | Policy-governed autonomy | Complete multi-step goals with retries, checkpoints, recovery, and ongoing policy enforcement. Enable only after the underlying infrastructure and safety controls are implemented and tested. |

### Approval requirements

Generally suitable for automatic execution when authorized:

- Read-only research and analysis.
- Validation and calculations.
- Creating local drafts and previews.
- Other low-risk, reversible operations.

Require additional review or explicit authorization according to policy:

- Modifying important files or repositories.
- Sending messages or emails.
- Publishing content.
- Changing access permissions.
- Calling APIs that create external side effects.
- Performing irreversible or high-impact actions.

Financial transfers, credential disclosure, destructive operations, and other sensitive activities must use strong safeguards and explicit authorization. Some operations may be prohibited entirely.

If authority expires, is revoked, or cannot be established, do not continue the affected operation. Stop safely, preserve relevant state where possible, and report the reason.

---

## 8. Verification and evidence contract

Every meaningful task should define success before execution.

An evidence record should capture, as applicable:

- Task identifier.
- Requested goal.
- Acceptance criteria.
- Planned operation.
- Actual operation attempted.
- Tool or service involved.
- Inputs and relevant context.
- Observable output.
- Timestamp and execution status.
- Evidence source or reference.
- Verification rule applied.
- Verification outcome.
- Known limitations or conflicts.
- Authorization context, without exposing secrets.

Result states:

- **Verified:** the available evidence satisfies the stated criteria.
- **Partially verified:** some criteria are satisfied, while others remain unresolved.
- **Unverified:** evidence is insufficient to establish the result.
- **Failed:** the operation or criteria failed.
- **Blocked:** policy, authorization, dependency, or safety requirements prevented completion.
- **Cancelled:** the task was stopped before completion.

Do not treat model confidence, plausible language, a plan, or an untested assumption as evidence of successful execution.

For external information, record source references where available. For code changes, use appropriate tests and diffs. For API actions, inspect actual responses and, where practical, confirm the resulting state. For file operations, verify the expected file or content exists.

Cryptographic signatures, hashes, and attestations can support integrity and provenance. Their meaning depends on key custody, signing policy, trusted timestamps where required, and the correctness of the attested process.

---

## 9. Memory, privacy, and auditability

- Minimize collection of sensitive information.
- Keep user workspaces and identities isolated.
- Apply access controls to stored records and retrieval.
- Define retention and deletion behavior.
- Redact secrets from logs.
- Track provenance for important claims.
- Prevent one user's data from leaking into another user's context.
- Distinguish durable records from temporary execution state.
- Document the guarantees and limitations of append-only and hash-chained storage.
- Design backups, restoration, and disaster recovery explicitly rather than assuming local persistence provides them.

---

## 10. Target user experience

OceanicOS should provide a unified experience with three connected workspaces. These are target product experiences. Implement them incrementally using the existing web application where practical.

The interface must not display fabricated live progress, fake verification badges, or success states unsupported by actual backend results.

### Chat workspace

Natural-language conversation, context-aware responses, clarifying questions, plan creation and review, evidence-linked explanations, and a clear distinction between advice and completed action.

### Task workspace

Task goal and acceptance criteria, step-by-step plan, permission and approval status, live progress where supported, tool activity and errors, pause, cancel, and resume controls where implemented, and a final task status with unresolved issues.

### Evidence workspace

Observations and source references, verification results, relevant execution history, attestation details where supported, failed checks and conflicting evidence, and traceability from user request to outcome.

---

## 11. Proposed components

Inspect the repository before creating any of these. Reuse existing implementations when suitable.

Potential components: Conversation Service, Model Provider Adapter, Context Manager, Intent and Planning Service, Structured Task Plan, Task State Machine, Agent Orchestrator, Tool and Connector Registry, Capability and Policy Enforcement Layer, Execution Sandbox, Approval Service, Evidence Response Layer, Task Workspace, Evidence Workspace, Durable Task Store, Observability and Audit Service.

Each proposed component needs a documented responsibility, public interface, security boundary, error model, test strategy, and explicit relationship to existing packages.

Avoid splitting the system into microservices prematurely.

---

## 12. Implementation roadmap

The following roadmap is proposed. Timelines must be estimated after repository inspection. Do not treat these phases or durations as commitments.

### Phase 1 — Repository baseline and conversational MVP

Audit the repository. Confirm current API and web capabilities. Define the conversation API contract. Add a model-provider adapter only if absent. Keep ordinary chat separate from tool execution. Add tests for context, provider failures, and privacy boundaries.

Exit: a working conversational experience with documented limits and reproducible tests.

### Phase 2 — Structured planning and task state

Define typed task and plan contracts. Introduce acceptance criteria and task status transitions. Connect task state to existing verification modules where appropriate. Persist useful history with provenance. Expose plans and status in the user interface.

Exit: tasks have explicit goals, inspectable plans, defined states, and testable outcomes.

### Phase 3 — Governed tool execution

Create or extend a tool registry. Enforce capability-based authorization outside the model. Validate inputs and outputs. Add timeouts, quotas, and budgets. Add approval gates for sensitive side effects. Record observations and verify outcomes.

Exit: authorized tools can execute bounded tasks with observable and auditable results.

### Phase 4 — Agent delegation

Add worker interfaces only when the task model is stable. Enforce isolated permissions and resource limits per worker. Verify delegated outputs before accepting them. Prevent workers from expanding their own permissions.

Exit: delegated tasks remain bounded, traceable, and subject to the same verification policies.

### Phase 5 — Production readiness and universe expansion

Identity and workspace isolation, production-grade secrets and key management, key rotation and revocation, durable storage with backup and restoration, observability, privacy and threat review, and release procedures supported by deployment evidence.

Exit: production claims are supported by operational tests, documented security controls, deployment evidence, and recovery exercises.

---

## 13. Security and failure handling

Design for model-provider outages, malformed tool responses, network failures, expired or revoked permissions, duplicate requests, interrupted execution, partial completion, conflicting evidence, unavailable persistence, failed attestation, worker crashes where workers exist, and resource exhaustion.

Use explicit error types, safe retries, bounded backoff, and idempotency where appropriate.

Never retry a potentially irreversible action without checking whether the previous attempt already succeeded.

Never convert a failure into success simply to keep the workflow moving.

---

## 14. Testing and quality gates

Unit tests for contracts, verification rules, policy decisions, task transitions, permission boundaries, and evidence classification.

Integration tests for API contracts, tool registration and execution, persistence, provider errors, authorization, and observation-to-verification paths.

Security tests for unauthorized tool invocation, cross-workspace access, secret leakage, permission escalation, forged attestations, replay, and unsafe retries.

End-to-end tests from request to plan, plan to authorized execution, execution to evidence, evidence to verification, and honest reporting, including failure and cancellation.

Run the repository's actual test commands. Report commands and real results. If a check cannot run, say so.

---

## 15. Success metrics

Measure completion against acceptance criteria, honesty of success and uncertainty reporting, evidence traceability, unauthorized-action prevention, approval-gate enforcement, recovery and cancellation reliability, duplicate side effects, latency, integration reliability, user control, and privacy isolation.

Do not optimize for the number of tasks labelled successful.

---

## 16. Required engineering workflow

1. Restate the requested outcome and its acceptance criteria.
2. Inspect the relevant repository files and existing implementation.
3. Identify what already exists and what is missing.
4. Propose the smallest sound implementation.
5. Identify security and compatibility implications.
6. Make changes only within the authorized scope.
7. Add or update tests.
8. Run relevant tests and checks.
9. Inspect the final diff.
10. Report the exact changes made.
11. Report the tests run and actual results.
12. List unresolved risks and follow-up work.
13. Update documentation and the roadmap when the implementation changes the project's status.

If the task requires missing credentials, external authorization, unavailable infrastructure, or a user decision, explain the blocker rather than fabricating the result.

---

## 17. Required status format

- **Goal:** what the change was intended to achieve.
- **Repository evidence:** which files, contracts, and tests informed the work.
- **Existing capabilities reused:** what was already implemented.
- **Changes made:** what was added, modified, or removed.
- **Verification:** commands executed, test results, and evidence gathered.
- **Security impact:** permission, privacy, and side-effect considerations.
- **Known limitations:** what remains incomplete or unproven.
- **Next step:** the smallest logical next action.

Keep implementation facts, assumptions, and proposals visibly separate.

---

## 18. Final product principle

OceanicOS should become an universe in which conversation leads to useful action without sacrificing control or truth.

Central loop:

Understand → Plan → Authorize → Execute → Observe → Verify → Remember → Report

Conversation makes the system approachable. Planning makes it deliberate. Permissions make it governable. Execution makes it useful. Verification makes it trustworthy. Provenance makes it inspectable.

The product must never confuse an intention with an action, an action with an outcome, or an outcome with a verified result.

OceanicOS — Your goals. Verified.
