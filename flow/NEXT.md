# Next finite deltas

Ordered by what the singularity page and the repository already agree is next. One item at a time. Stop on missing authority, stale evidence, or a request to deploy, spend, publish secrets, or delete lineage.

Status vocabulary: `PROPOSED` means not yet admitted as work. `NOT_EXECUTED` means this file does not claim the work ran.

## 1. Re-anchor the handoff — `PROPOSED`

`docs/CONTINUATION_HANDOFF.md` still records local HEAD `fc3f8b665020fb56b8ed2ee2bd5242c20147ac7b` and dirty files. Remote `main` at inspection was `ff9c5f3ea9a02558f0665864b7d741f09f91487f`.

Acceptance:

- Re-read `git rev-parse HEAD` and `git status` on a fresh clone.
- Rewrite only the anchor table and status ledger so they match that observation.
- Do not copy stale "31/31" or worker-cycle claims forward unless those commands are re-run.

## 2. One provenance / replay invariant — `PROPOSED`

The handoff already names this as the next engineering slice: one missing invariant with a failing or absent test across API, MINI, causal-memory, attestation, or replay. No invariant is selected in this file. Selecting one is the gate before code changes.

Acceptance:

- Name the invariant, expected state, authority, stop condition, and rollback.
- Add or fix one focused test.
- Run that test, then the repo verify command the package already uses.

## 3. Notion evidence link, not a page move — `PROPOSED`

Keep entity pages where they are. When a repository transition finishes, write one evidence line back to the singularity page or the executive control plane: revision, command, result, limitation.

Singularity: https://app.notion.com/p/41949ca435a281398db3df67e702f876

Do not move, merge, or trash Notion pages unless a later message names the exact page IDs and says to move them.

## 4. Explicitly deferred

| Item | Why deferred |
| --- | --- |
| Deployment / production URL | Roadmap records artifact publication, not a running target |
| HSM/KMS, distributed revocation, full data-at-rest | Open on `docs/ROADMAP.md`; not the smallest Δ |
| Revenue ladder on Notion | Hypotheses until a transaction exists |
| Moving all entity pages under the singularity parent | Organization map rule is link + label; access inheritance changes on move |

## Compact

```text
Meaning: Notion singularity page (linked, not relocated).
Implementation: this repository.
This commit: documentation current only. No runtime change.
Next Δ: refresh CONTINUATION_HANDOFF against a fresh clone, then name one provenance/replay test.
```
