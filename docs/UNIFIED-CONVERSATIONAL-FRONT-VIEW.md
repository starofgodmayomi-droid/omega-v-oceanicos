# Unified Conversational Front View — OMEGA × OCEANICOS

**Status:** reviewable dashboard UI increment  
**Canonical companion:** [WHOLE-ECOSYSTEM-MASTER-PROMPT.md](../WHOLE-ECOSYSTEM-MASTER-PROMPT.md)

## Purpose

The front view is the single conversational entry to the whole ecosystem body. It compresses the system's meaning into one usable surface without pretending every named component is running or connected.

**OceanicOS is the experience and ecosystem body. Ω∞v is the verification discipline. ΩIR is the change language.** The interface lets a person talk naturally while keeping intent, context, authorization, action, observation, verification, memory, and value distinct.

It mirrors known and unknown state; it is not a claim of total awareness of every repository, connector, runtime, or external service.

## Product rule

```text
ONE CONVERSATION = INTENT + RELEVANT CONTEXT + BOUNDED PLAN
+ AUTHORITY CHECK + EXECUTION RECEIPT + OBSERVATION
+ VERIFICATION + CONTINUITY + MEASURED VALUE
```

The conversation is the front door. The backend remains responsible for deciding which capabilities are available, checking authorization and policy, performing bounded actions, returning actual results, and preserving provenance. The UI cannot grant its own authority.

## Screen composition

### Header and mode
Show the product identity, runtime stream connectivity only when observed, and execution mode with conservative copy. A connected stream means only that the stream is connected. Simulation is not live execution.

### Conversational center
Provide one accessible message composer and a small set of prompt starters. Users can ask to map the body, inspect observed runtime state, trace GitHub × Notion × Composio, or identify the next finite/high-value transition.

Choosing an organ or starter only drafts text. Submission uses the existing OMEGA command proposal function and lifecycle UI rather than a parallel execution engine.

### Whole-body map
Expose the vocabulary—AI SOUL, MIRRIO, KAI, ƆREADE, TRUTHOS, ECHOFRAME, OCEANICOS, ΩIR, Ω∞v, workers, GitHub, Notion, and Composio—as discoverable prompts. Names do not imply that components are independently implemented, connected, or healthy.

### Evidence and current state
Show only the signals already supplied to the dashboard: stream connection, local ledger integrity, ecosystem-body API snapshot, current reality evidence, approval-gate requirement, and simulation mode. Missing data stays unavailable/unknown; failed ledger integrity stays divergent.

Do not show CI, external integration health, task totals, uptime, revenue, production health, or identity as confirmed metrics unless dedicated sources are queried and their scope is labelled.

### Operating current
The designed path is:

```text
INTENT → CONTEXT → PLAN → AUTHORITY → BOUND → EXECUTE
→ OBSERVE → VERIFY → REMEMBER → VALUE
```

This is a conceptual operating sequence, not a progress meter. A stage is complete only when a real source reports its state and the required evidence is available.

### Progressive disclosure
The conversation is the landing surface. Existing lifecycle, evidence, provenance, water-flow, agents/workers, divergence, value, connectors, and system controls remain available below it. Do not remove a working safety/evidence surface to simplify the landing view.

## Interaction and safety contract

- The composer uses existing app intent state.
- Organ selectors and prompt starters draft only.
- Empty or in-flight submissions are prevented.
- Submission routes to the existing OMEGA proposal handler.
- Current command state remains inspectable in the existing lifecycle flow.
- No model reply, live event, metric, integration health, task count, or success is fabricated.
- Unknown status strings normalize to UNKNOWN.
- Stream connectivity is not verification; request acceptance is not downstream completion.
- Consequential actions remain behind required human/policy gates.
- Focus, semantic labels, keyboard use, responsive layouts, and reduced motion are supported.

## Implementation mapping

| Concern | Target | Boundary |
| --- | --- | --- |
| Frontend request state | `apps/web/src/App.tsx` | Existing controlled intent and command state |
| Unified surface | `apps/web/src/UnifiedOceanicFrontView.tsx` | Presentation and draft interaction |
| Styles | `apps/web/src/unified-oceanic-front-view.css` | Visuals/accessibility only |
| Existing command flow | OMEGA proposal + `IntentFlow` | Backend admission/authorization remains authoritative |
| State signals | Existing dashboard/API values | No inferred external health |
| Tests | `apps/web/src/__tests__/unified-oceanic-front-view.test.tsx` | Draft, submit, busy, and unknown-state behavior |
| Master contract | `WHOLE-ECOSYSTEM-MASTER-PROMPT.md` | Meaning and governing rules |
| Notion continuity | Existing P0 queue and master blueprint | Planning, not implementation truth |

## Acceptance criteria

- [x] A unified conversational surface is wired as the primary dashboard front view.
- [x] Organ selections and starter prompts only draft intent.
- [x] Non-empty submissions call the existing command proposal handler.
- [x] Empty and in-flight submissions are prevented.
- [x] Unknown/missing signals remain unknown or unavailable.
- [x] Existing lifecycle, evidence, and deeper dashboard panels remain in place.
- [ ] New UI tests pass in the repository CI.
- [ ] Exact proposed commit's CI is reviewed.
- [ ] Deployment remains unclaimed until separately observed.

## Explicit non-goals

This increment does not add a new model provider or claim a general-purpose conversational runtime exists. It does not add arbitrary code execution, bypass command admission, infer integration health, or establish production deployment.

## Next finite changes

1. Review the PR and test results.
2. Bind extra body organs to real repository/API contracts, one at a time.
3. Design a true conversation-session backend only after its model/runtime, privacy/memory policy, cost boundary, authorization, and evidence contract are chosen.
4. Add CI, deployment, connector health, and value metrics only from verified source adapters.
