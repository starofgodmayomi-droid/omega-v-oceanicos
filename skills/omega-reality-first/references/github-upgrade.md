# GitHub Repository Upgrade Workflow

Use this reference when the task involves a repository, branch, issue, pull request, CI, release, deployment, or runtime upgrade.

## Sequence

1. **Inspect reality**: identify repository, current branch, clean/dirty state, recent history, open work, package/runtime versions, CI configuration, deployment configuration, and available checks. Do not infer repository state from a prompt.
2. **Define the transition**: state the requested upgrade, compatibility boundary, affected components, expected behavior, risk, rollback, and acceptance evidence.
3. **Check authority**: confirm the user’s intended scope and ensure the current credentials permit the needed GitHub operation. Create/edit branches, issues, drafts, and PRs when requested; pause for high-impact publication, access/security changes, deletion, billing, or official submissions.
4. **Isolate work**: use a dedicated branch or worktree when appropriate. Keep ownership and file scope disjoint for parallel work. Serialize shared contracts, migrations, lockfiles, merges, releases, and deployment.
5. **Implement minimally**: preserve APIs and data unless the upgrade requires a documented change. Avoid unrelated cleanup. Record assumptions and compatibility decisions.
6. **Validate progressively**: run formatting/lint, unit/integration tests, type checks, build, package/audit checks, and targeted smoke tests as applicable. Record failures rather than masking them.
7. **Inspect the diff**: review changed files, generated artifacts, dependency changes, lockfiles, secrets, permissions, migrations, and destructive operations. Confirm no unrelated or sensitive changes leaked.
8. **Commit and collaborate**: use a descriptive commit only when requested or useful. Push and open/update a PR when within scope. Treat CI as evidence about CI, not runtime reality.
9. **Deploy only if authorized**: state the target environment and expected effect; use bounded timeouts and a recovery path. Never imply deployment from a merge alone.
10. **Observe and reconcile**: inspect the actual remote, deployed, and runtime state. Compare expected versus actual behavior and assign a verification status.
11. **Report**: include repository/branch/commit/PR identifiers, commands and results, deployment/runtime evidence, divergences, blockers, and the next safe transition.

## Upgrade acceptance matrix

| Layer | Evidence | What it proves | What it does not prove |
|---|---|---|---|
| Source | Diff, review, commit | Intended code changed | Runtime behavior |
| Tests | Test output and environment | Tested cases passed | Untested cases or production reality |
| Build | Reproducible build output | Build completed | Deployment or health |
| CI | Run URL, status, logs | CI workflow result | Current runtime correctness |
| Deployment | Provider receipt/ID | Deployment was attempted or accepted | Healthy behavior |
| Runtime | Current logs, probes, user-visible checks | Observed runtime behavior | Broad correctness without coverage |
| Reconciliation | Expected/actual comparison | Specific claim is verified or divergent | Universal truth |

## Stop conditions

Stop and report `REVIEW`, `DENIED`, or `UNKNOWN` rather than guessing when the target repository/environment is unclear, authority is missing, credentials are insufficient, a migration is irreversible, a secret would be exposed, a destructive command is required, or expected and actual state cannot be reconciled.

## Full-stack traceability bridge

For a change spanning planning, code, and runtime, preserve this lineage:

`NOTION INTENT → ΩIR → GITHUB ISSUE/BRANCH → IMPLEMENTATION → PR → CI/EVIDENCE → PROTECTED MAIN → RUNTIME → OBSERVATION → RECONCILIATION → MEMORY → NEXT Δ`

Use Notion for intent/design/context, GitHub for implementation/history/CI, runtime for execution, and VaaS or an equivalent verifier for reconciliation. Each handoff must carry the transition ID, expected state, authority/policy, evidence, and provenance. A Notion page does not prove runtime behavior; a GitHub commit or CI run does not prove deployment health; an attestation does not substitute for authorization.
