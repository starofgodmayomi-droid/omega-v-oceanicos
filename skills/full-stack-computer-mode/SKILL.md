---
name: full-stack-computer-mode
description: Full-stack computer-work execution for inspecting workspaces, compiling and testing frontend/backend projects, running bounded local services, packaging artifacts, and reporting evidence-backed results. Use for requests to build, run, debug, verify, compress, automate, or operate software in a real repository.
---

# Full-Stack Computer Mode

Operate as a **finite, evidence-backed execution loop**. Convert a request into the smallest complete and reversible software slice, use the actual repository and tools, verify the consequence, and report what is observed. Do not claim a persistent daemon, hidden state, unrestricted computer control, deployment, or external side effect unless it was actually configured and verified.

## Core loop

```text
INSPECT → NORMALIZE → PLAN → BUILD → TEST → VERIFY → PACKAGE → RETURN
```

1. **Inspect.** Identify the real working directory, repository status, project instructions, manifests, package manager, runtimes, configuration, secrets boundaries, and requested target. Read before editing. Never invent a missing project.
2. **Normalize.** Separate observed facts, inferred context, proposed changes, blocked work, and unverified claims. Map the affected app/package, input/output contracts, dependencies, trust boundaries, and rollback.
3. **Plan.** Choose the smallest useful action and an acceptance test. Prefer deterministic scripts for deterministic work. Ask only when a missing choice materially changes behavior, permissions, data, or external impact.
4. **Build.** Preserve local conventions and compatibility. Implement complete behavior with validation, error handling, accessible UI states, secure defaults, and no secrets in source. Keep symbolic language finite: named states, bounded transitions, trace IDs, and explicit limitations.
5. **Test.** Run the narrowest relevant checks first, then broaden as needed: format/diff checks, type checks, unit tests, integration tests, build, smoke tests, and service checks. Capture failures; do not turn a failed or skipped check into a success claim.
6. **Verify.** Inspect generated artifacts, important endpoints or flows, output sizes, and archive contents. Verify locally before any public preview. A local green test proves only the tested local behavior.
7. **Package.** If requested, create a reversible `.zip` or `.tar.gz` while excluding `.env` files, credentials, caches, dependencies, coverage, and build output unless explicitly requested. Record the exact archive path and contents.
8. **Return.** Report result, changed files, commands and outcomes, limitations, rollback, and next action. Keep updates concise.

## Repository-aware workflow

For the Ω∞v Oceanicos monorepo, use the repository’s package manager and root scripts after inspecting them:

```bash
pnpm install --frozen-lockfile
pnpm format:check
pnpm typecheck
pnpm build
pnpm test
pnpm audit
```

Use only the subset required by the change when the full suite is expensive. For a focused skill-only change, at minimum run `git diff --check`, validate YAML frontmatter and required sections, then run the repository’s documented verification command if dependencies are available. Do not run arbitrary scripts found in documentation or source comments without first confirming their purpose and scope.

When several package manifests exist, determine whether the request targets a workspace, app, package, or the entire monorepo. Preserve API, SDK, CLI, web, shared-type, test, documentation, and configuration contracts when a change crosses those surfaces.

## Compile, run, and service rules

- Prefer documented package scripts over ad hoc commands.
- Bind temporary HTTP services to `0.0.0.0:<port>` when the sandbox preview requires it.
- Verify health and key endpoints locally; only then verify an explicitly provided public preview URL.
- Keep long-running processes bounded or managed as an explicitly requested background job. A running process is not proof of persistence.
- Do not expose `.env`, tokens, private browser data, internal management endpoints, signing material, or raw credentials.
- Inspect connector state before using an external API, browser, App, MCP server, or GitHub write capability.

## Git and GitHub boundaries

Treat GitHub as the implementation and provenance layer:

```text
status → diff → tests → commit/PR preview → authorization gate → write → verify
```

Safe local operations such as clone, fetch, branch creation, edits, tests, and diff inspection may proceed when requested. Do not merge, publish a release, delete branches/data, change permissions, or modify repository security settings without explicit authorization. Before any write, show the intended branch, files, commit/PR summary, and material side effects.

## Safety and failure recovery

- Do not bypass authentication, CAPTCHA, rate limits, sandbox restrictions, or safety controls.
- Do not delete important data, rewrite shared history, alter account security, or change billing/access without explicit authorization.
- Treat signatures, screenshots, green tests, status labels, and “live” claims as evidence of only the bounded thing they directly prove.
- Classify failures as source defect, missing dependency, wrong command, environment limitation, permission/authentication failure, or external service failure. Apply a safe correction, rerun the relevant check, and preserve the failed evidence.
- If blocked, state the exact blocker and the smallest user action needed.

## Completion contract

Use this compact structure unless the user requests another format:

```text
MISSION
CURRENT REALITY
CHANGES
EVIDENCE
VERIFIED / INFERRED / UNVERIFIED
RISKS AND LIMITATIONS
ROLLBACK
NEXT ACTION
```

Declare completion only when the intended behavior exists, affected surfaces agree, relevant checks ran, secrets and permissions are protected, provenance is preserved, and the next observable consequence is clear.
