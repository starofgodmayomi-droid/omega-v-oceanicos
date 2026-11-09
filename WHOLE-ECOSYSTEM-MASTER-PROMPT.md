# OCEANICOS — WHOLE ECOSYSTEM MASTER PROMPT

## 1. PRODUCT IDENTITY
* **Product name:** OceanicOS
* **Core identity:** A hybrid conversational AI and autonomous agent ecosystem.
* **Core differentiator:** Verification, evidence, traceability, and controlled autonomy.
* **Product promise:** Tell OceanicOS what you want to accomplish. It understands your intent, plans the work, uses authorized capabilities, verifies what can be verified, and shows you what actually happened.
* **Brand principle:** Reality, verified.

OceanicOS is not merely a chatbot, a collection of AI tools, or an unrestricted autonomous agent. It is an AI operating ecosystem that combines natural conversation, goal-oriented planning, governed execution, persistent task state, and a verification layer.

The system must distinguish between what it intends to do, what it attempts to do, what actually happens, and what the available evidence proves.

---

## 2. THE PRIMARY MISSION
Build OceanicOS into a reliable, extensible AI ecosystem capable of helping people and organizations:
1. Ask questions and hold contextual conversations.
2. Research, analyze, reason, and synthesize information.
3. Convert goals into structured plans and measurable outcomes.
4. Execute permitted tasks through authorized tools and integrations.
5. Delegate bounded work to specialized agents when supported.
6. Maintain task state and relevant memory with clear provenance.
7. Verify actions and results using observable evidence.
8. Report success, failure, partial completion, or uncertainty honestly.
9. Operate autonomously within explicit permissions, resource limits, and safety constraints.
10. Allow users to inspect, control, pause, resume, or cancel work.

Every major capability must be grounded in the actual implementation, not merely in product language or architectural diagrams.

---

## 3. NON-NEGOTIABLE ENGINEERING RULES
* Inspect the existing repository before designing or changing its architecture.
* Treat the current source code, tests, contracts, configuration, and CI workflows as primary implementation evidence.
* Read and respect `README.md`, `docs/ROADMAP.md`, `WHOLE-ECOSYSTEM-MASTER-PROMPT.md`, and relevant package-level documentation.
* Reuse existing components when appropriate rather than duplicating them.
* Preserve established contracts and backward compatibility unless a change is necessary and documented.
* Separate implemented features from experimental, incomplete, planned, and proposed features.
* Never claim a feature exists simply because documentation describes the desired design.
* Never claim a task succeeded without evidence appropriate to the task's success criteria.
* Never bypass authorization, verification, security checks, or safety boundaries to make a demo appear successful.
* Prefer small, testable, reversible changes over large speculative rewrites.
* Add or update tests for behavior changes, security boundaries, error handling, and integration contracts.
* Document architectural decisions, limitations, migration steps, and unresolved risks.
* Do not expose secrets, credentials, private user data, or sensitive internal configuration in logs or responses.
* If repository evidence is insufficient, state what is unknown and identify the files or tests needed to establish the answer.
* Do not invent API endpoints, package exports, environment variables, database schemas, tool names, or deployment capabilities.

---

## 4. THE PRODUCT ARCHITECTURE
Design the ecosystem around six cooperating layers. These layers define the target architecture; they do not imply that every layer is already implemented.

### Layer 1 — Conversational Experience
Responsibilities:
* Accept natural-language requests.
* Maintain relevant conversation context.
* Ask clarifying questions when necessary.
* Support text and, where implemented, files, voice, and streaming.
* Present explanations, plans, progress, results, and evidence.
* Distinguish conversation from actual execution.
* Allow users to move from asking questions to assigning tasks.

Target interface: one coherent assistant with two primary modes:
* **Conversation mode:** Discuss, learn, reason, explore, and plan.
* **Work mode:** Assign goals, inspect plans, authorize execution, monitor progress, and review verified results.

### Layer 2 — Intent Understanding and Planning
Responsibilities:
* Interpret user intent.
* Identify constraints, dependencies, and missing information.
* Convert requests into structured goals.
* Define acceptance criteria and expected outcomes.
* Identify which operations require external tools.
* Estimate resource needs and execution risks where supported.
* Produce a plan that can be inspected before execution when appropriate.

A plan is not an execution result. It is a proposal until actions have been attempted and their outcomes evaluated.

### Layer 3 — Agent Orchestration
Responsibilities:
* Manage task lifecycle and state transitions.
* Dispatch authorized operations to suitable workers or tools.
* Track dependencies, retries, timeouts, and resource budgets.
* Support cancellation and recovery where implemented.
* Prevent duplicate side effects through idempotency controls where applicable.
* Record execution attempts and returned evidence.
* Coordinate specialist agents only when the required worker infrastructure exists.

Never imply that local job records automatically provide a distributed scheduler, durable queue, or fault-tolerant worker network.

### Layer 4 — Ω∞v Verification and Authority
This is the defining trust layer of OceanicOS.
Responsibilities:
* Observe relevant system events and operation results.
* Validate structured inputs and outputs against contracts.
* Evaluate claims against explicit rules and available evidence.
* Determine whether actions are authorized.
* Record verification outcomes.
* Produce or validate attestations when supported.
* Make uncertainty, conflicting evidence, and failed checks visible.

Core conceptual lifecycle:
$$\text{Observe} \longrightarrow \text{Verify} \longrightarrow \text{Remember} \longrightarrow \text{Attest}$$

Attestation is conditional on the implemented attestation subsystem and its security guarantees. It must not be treated as proof that an event was true merely because a signature exists.

Verification must be appropriate to the claim. A schema check can establish structural validity; it cannot independently establish the truth of arbitrary external claims.

### Layer 5 — Memory and Provenance
Responsibilities:
* Preserve relevant task history and evidence.
* Track the origin of observations and results.
* Maintain relationships between requests, plans, actions, and outcomes.
* Distinguish user-provided information from external data and model-generated content.
* Preserve audit-relevant records under explicit retention policies.
* Avoid storing unnecessary sensitive information.
* Support retrieval only within applicable access controls.

Memory must not silently convert an unverified claim into a verified fact. Each record should preserve its source, timestamp when available, status, and relevant verification metadata.

### Layer 6 — Execution and Integrations
Responsibilities:
* Provide a controlled interface to external tools and services.
* Support API clients, repository operations, file processing, research, and other integrations when implemented.
* Enforce capability-based access.
* Validate inputs and outputs.
* Apply timeouts, quotas, and resource budgets.
* Handle integration errors explicitly.
* Return observable results for verification.

All integrations must be registered, documented, and governed. A language model must not gain unrestricted system access merely because a tool is technically available.

---

## 5. REPOSITORY-GROUNDED IMPLEMENTATION
The GitHub repository is the source of truth for implementation status:  
[https://github.com/starofgodmayomi-droid/omega-v-oceanicos](https://github.com/starofgodmayomi-droid/omega-v-oceanicos)

Start every implementation task by inspecting the current repository structure, recent changes, package manifests, contracts, tests, and documentation.

The repository has documentation describing an Ω∞v verification kernel and related modules, including:
* Observer (`@omega-v/observer`)
* Verification (`@omega-v/verification`)
* Remember (`@omega-v/remember`)
* MINI (`@omega-v/mini`)
* Attestation (`@omega-v/attestation`)

Treat these as existing implementation starting points only to the extent confirmed by the current source code and tests.

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
* A local job record is not automatically a distributed job scheduler.
* An append-only or hash-chained log does not, by itself, guarantee universal durability or tamper-proof storage.
* A valid signature does not establish the truth of the signed statement.
* A working dashboard does not automatically constitute a full conversational AI product.
* Passing CI does not prove production deployment, uptime, or live-service health.
* Authorization modules do not automatically provide complete enterprise identity management or production-grade key custody.
* A roadmap entry is a proposal or plan, not proof of implementation.

Never remove these distinctions from product documentation.

---

## 6. CONVERSATION-TO-EXECUTION LIFECYCLE
The target end-to-end flow is:
$$\text{Receive} \longrightarrow \text{Understand} \longrightarrow \text{Clarify} \longrightarrow \text{Plan} \longrightarrow \text{Authorize} \longrightarrow \text{Execute} \longrightarrow \text{Observe} \longrightarrow \text{Verify} \longrightarrow \text{Recover} \longrightarrow \text{Record} \longrightarrow \text{Report}$$

1. **Receive:** Accept the user's request.
2. **Understand:** Determine the goal, constraints, and intended outcome.
3. **Clarify:** Ask a concise question if a missing detail materially affects correctness, safety, or authorization.
4. **Plan:** Define steps, dependencies, permissions, and acceptance criteria.
5. **Authorize:** Check whether each operation is allowed under the active policy and granted capabilities.
6. **Execute:** Run only authorized operations through approved tools.
7. **Observe:** Collect actual tool outputs, events, and results.
8. **Verify:** Evaluate the evidence against the acceptance criteria.
9. **Recover:** Retry, resume, or request assistance only when policy and task semantics permit.
10. **Record:** Preserve relevant task state, provenance, and verification outcomes.
11. **Report:** Explain what succeeded, what failed, what remains incomplete, and what evidence supports the result.

The system must not skip observation or verification simply because an operation returned a success-shaped response. If evidence is missing, conflicting, stale, or insufficient, the task must be reported as unverified or partially verified rather than falsely declared complete.

---

## 7. AUTONOMY AND PERMISSIONS
OceanicOS should be autonomous within explicit boundaries, not unrestricted.

### Permission model
Use scoped capabilities that define:
* Which user, workspace, or service grants authority.
* Which tools and operations are permitted.
* Which resources can be accessed.
* What data can be read or modified.
* Which side effects are allowed.
* Applicable time limits, quotas, and resource budgets.
* Whether further approval is required.
* How authority is revoked and how revocation affects running work.

Enforce these rules in the execution environment and policy layer, not solely through a model prompt.

### Autonomy levels
* **Level 0 — Conversation:** Answer questions, explain concepts, and help plan. No external side effects.
* **Level 1 — Read and analyze:** Access approved information sources, inspect permitted files, and perform analysis within granted permissions.
* **Level 2 — Prepare:** Create drafts, proposed changes, plans, and previews. Do not perform unapproved external side effects.
* **Level 3 — Controlled execution:** Perform explicitly permitted actions under scoped capabilities, logging, verification, and resource limits.
* **Level 4 — Bounded delegation:** Coordinate authorized workers or specialist agents with isolated scopes, limited budgets, clear responsibilities, and reviewable outputs.
* **Level 5 — Policy-governed autonomy:** Complete multi-step goals with controlled retries, checkpoints, recovery, and ongoing policy enforcement. Enable only after the underlying infrastructure and safety controls are implemented and tested.

These levels describe a target model. They are not a statement that every level is currently available.

### Approval requirements
Generally suitable for automatic execution when authorized:
* Read-only research and analysis.
* Validation and calculations.
* Creating local drafts and previews.
* Other low-risk, reversible operations.

Require additional review or explicit authorization according to policy:
* Modifying important files or repositories.
* Sending messages or emails.
* Publishing content.
* Changing access permissions.
* Calling APIs that create external side effects.
* Performing irreversible or high-impact actions.

Financial transfers, credential disclosure, destructive operations, and other sensitive activities must use strong safeguards and explicit authorization. Some operations may be prohibited entirely.

If authority expires, is revoked, or cannot be established, do not continue the affected operation. Stop safely, preserve relevant state where possible, and report the reason.

---

## 8. VERIFICATION AND EVIDENCE CONTRACT
Every meaningful task should define success before execution.

An evidence record should capture, as applicable:
* Task identifier.
* Requested goal.
* Acceptance criteria.
* Planned operation.
* Actual operation attempted.
* Tool or service involved.
* Inputs and relevant context.
* Observable output.
* Timestamp and execution status.
* Evidence source or reference.
* Verification rule applied.
* Verification outcome.
* Known limitations or conflicts.
* Authorization context, without exposing secrets.

### Result states
* **Verified:** The available evidence satisfies the stated criteria.
* **Partially verified:** Some criteria are satisfied, while others remain unresolved.
* **Unverified:** Evidence is insufficient to establish the result.
* **Failed:** The operation or criteria failed.
* **Blocked:** Policy, authorization, dependency, or safety requirements prevented completion.
* **Cancelled:** The task was stopped before completion.

Do not treat model confidence, plausible language, a plan, or an untested assumption as evidence of successful execution.

---

## 9. MEMORY, PRIVACY, AND AUDITABILITY
Memory must be useful, bounded, and governed.

Required principles:
* Minimize collection of sensitive information.
* Keep user workspaces and identities isolated.
* Apply access controls to stored records and retrieval.
* Define retention and deletion behavior.
* Redact secrets from logs.
* Track provenance for important claims.
* Prevent one user's data from leaking into another user's context.
* Distinguish durable records from temporary execution state.
* Document the guarantees and limitations of append-only and hash-chained storage.
* Design backups, restoration, and disaster recovery explicitly rather than assuming local persistence provides them.

Auditability should help explain what happened without exposing credentials or unnecessary private information.

---

## 10. TARGET USER EXPERIENCE
OceanicOS should provide a unified experience with three connected workspaces:
* **A. Chat Workspace:** Natural-language conversation, context-aware responses, clarifying questions, plan review, evidence-linked explanations.
* **B. Task Workspace:** Task goal, acceptance criteria, step-by-step plan, permission/approval status, live progress, tool activity, pause/cancel/resume controls.
* **C. Evidence Workspace:** Observations, source references, verification results, execution history, attestation details, failed checks and conflicting evidence.

---

## 11. PROPOSED COMPONENTS
* Conversation Service
* Model Provider Adapter
* Context Manager
* Intent and Planning Service
* Structured Task Plan
* Task State Machine
* Agent Orchestrator
* Tool and Connector Registry
* Capability and Policy Enforcement Layer
* Execution Sandbox
* Approval Service
* Evidence Response Layer
* Task Workspace
* Evidence Workspace
* Durable Task Store
* Observability and Audit Service

Each component requires a documented responsibility, public interface, security boundary, error model, test strategy, and explicit relationship to existing packages.

---

## 12. IMPLEMENTATION ROADMAP
* **Phase 1 — Repository Baseline and Conversational MVP:** Audit baseline, confirm API/web, conversation API contract, contextual conversation, error handling.
* **Phase 2 — Structured Planning and Task State:** Typed task/plan contracts, acceptance criteria, task transitions, verification module integration.
* **Phase 3 — Governed Tool Execution:** Tool registry, capability-based auth, inputs/outputs validation, sandboxing, approval gates.
* **Phase 4 — Agent Delegation:** Worker interfaces, bounded delegation, isolated scopes, recovery behavior, verified outputs.
* **Phase 5 — Production Readiness and Ecosystem Expansion:** Identity/workspace isolation, secrets/key management, durable storage, backups, threat models.

---

## 13. SECURITY AND FAILURE HANDLING
Design for failures rather than assuming every component is available. The system must handle:
* Model-provider outages.
* Invalid or malformed tool responses.
* Network failures and timeouts.
* Expired or revoked permissions.
* Duplicate requests.
* Interrupted execution.
* Partial completion.
* Conflicting evidence.
* Corrupted or unavailable persistence.
* Failed attestation or signature verification.
* Worker crashes.
* Resource exhaustion and rate limiting.

Never retry a potentially irreversible action without checking whether the previous attempt already succeeded. Never convert a failure into success simply to keep the workflow moving.

---

## 14. TESTING AND QUALITY GATES
* **Unit tests:** Typed contract validation, verification rules, policy decisions, task state transitions.
* **Integration tests:** API-to-service contracts, tool registration/execution, persistence, model-provider errors, auth flows.
* **Security tests:** Unauthorized tool invocation, cross-workspace access, secret leakage, permission escalation.
* **End-to-end tests:** User request to plan, plan to execution, execution to evidence, evidence to verification, verification to honest report.

---

## 15. SUCCESS METRICS
* Task completion rate against defined acceptance criteria.
* Accuracy of success, failure, and uncertainty reporting.
* Quality and traceability of evidence.
* Unauthorized action prevention.
* Correct approval-gate enforcement.
* Recovery and cancellation reliability.
* Latency and resource usage.
* User ability to inspect and control autonomous work.

---

## 16. REQUIRED ENGINEERING WORKFLOW
1. Restate the requested outcome and its acceptance criteria.
2. Inspect the relevant repository files and existing implementation.
3. Identify what already exists and what is missing.
4. Propose the smallest sound implementation.
5. Identify security and compatibility implications.
6. Make changes only within the authorized scope.
7. Add or update tests.
8. Run relevant tests and checks.
9. Inspect the final diff.
10. Report the exact changes made and actual test results.

---

## 17. REQUIRED STATUS FORMAT
* **Goal:** What the change was intended to achieve.
* **Repository evidence:** Which files, contracts, and tests informed the work.
* **Existing capabilities reused:** What was already implemented.
* **Changes made:** What was added, modified, or removed.
* **Verification:** Commands executed, test results, and evidence gathered.
* **Security impact:** Permission, privacy, and side-effect considerations.
* **Known limitations:** What remains incomplete or unproven.
* **Next step:** The smallest logical next action.

---

## 18. FINAL PRODUCT PRINCIPLE
OceanicOS should become an ecosystem in which conversation leads to useful action without sacrificing control or truth.

Its central loop is:
$$\text{Understand} \longrightarrow \text{Plan} \longrightarrow \text{Authorize} \longrightarrow \text{Execute} \longrightarrow \text{Observe} \longrightarrow \text{Verify} \longrightarrow \text{Remember} \longrightarrow \text{Report}$$

**OceanicOS — Your goals. Verified.**  
*More than AI. A verified future.*
