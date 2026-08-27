# Repository skills

Skills available to Claude Code sessions opened in this repository.

Each is preserved exactly as supplied — `.prettierignore` excludes this
directory so formatting never rewrites an artifact the repository did not
author, and the hash below is what lets an installed copy be checked against
its source.

| skill                                 | sha256 of `SKILL.md`                                               | installed  |
| ------------------------------------- | ------------------------------------------------------------------ | ---------- |
| `omega-v-ufi`                         | `3ef1fda3a9e84115495948c5f9510b22b946442a5847f701c1e922628e73bc45` | 2026-08-16 |
| `omega-global-good-fullstack`         | `094759e83a3aec27b6884c3b55e19b8021f8771a40d6f036e334c0e2e15af79b` | 2026-08-27 |
| `omega-global-good-fullstack-builder` | `96d5c00b13c80d343230f301c9c87b08f6d12278d541e06480db818749c40422` | 2026-08-27 |

Verify an installed skill still matches what was recorded:

```bash
sha256sum -c <<<'3ef1fda3a9e84115495948c5f9510b22b946442a5847f701c1e922628e73bc45  .claude/skills/omega-v-ufi/SKILL.md'
```

That command is the check a person can run. `tests/__tests__/skills.test.ts` runs the
same comparison for every row of the table above, because a recorded hash nobody
verifies is a claim rather than a control — and this table sat unchecked from the
day it was written.

## omega-v-ufi

Ω∞v Universal Formless Intelligence — the operating contract this repository
is built under, stated as a skill rather than left implicit in commit
messages.

Its invariants are the ones this codebase already enforces in code:

- **Reality before output** — inspect current state before proposing execution
- **Verification before confidence** — separate fact from assumption; verify
  consequential claims against observable evidence
- **Provenance and lineage** — never fabricate memory, execution, access, or
  results
- **Visible uncertainty** — state unknowns, failure modes, and what evidence
  would resolve them
- **Proactive but authorized** — anticipate and prepare, but do not silently
  take irreversible or externally visible action

One line from it is the rule the verification engine now implements
literally: *never report "green" without defining what was tested and what
was not.*

### Loading

Recorded at the time as: not active in the session that added it, loading
only in the next session opened against this repository.

That was not retested, and the two skills installed on 2026-08-27 both
became available immediately. Left here as the original record, with the
later observation noted, rather than silently rewritten.

## omega-global-good-fullstack

Supplied 2026-08-27. The same file is published at
`skills/omega-global-good-fullstack/SKILL.md`, added to `main` in `ad9a209`
and `65fbd57`. Installed here as well because `.claude/skills/` is the
directory this README describes as *"Skills available to Claude Code
sessions opened in this repository"* — a copy under `skills/` alone is a
published artifact, not a loadable one.

Both copies are byte-identical and share the hash recorded above, so the
duplication is checkable rather than a fork.

## omega-global-good-fullstack-builder

Supplied 2026-08-27. Narrower than the skill above and aimed at this
repository's own work: repository reality map first, then bounded
full-stack vertical slices with explicit evidence labels — `observed`,
`verified`, `inferred`, `unverified`, `blocked`, `not authorized`.

It states the rule this session kept rediscovering the hard way: *"Do not
claim a stage that was not observed."*

### Loading

Observed when these two were installed: both became available to the running
session immediately, without a restart.

That contradicts the note recorded for `omega-v-ufi` above, which says a
skill installed mid-session is not active until the next one. The note was
inherited rather than retested, and it is now known to be wrong at least for
this case — so it is corrected here rather than repeated.

The same observation settles where skills load from. Neither skill was
available while `skills/omega-global-good-fullstack/SKILL.md` was the only
copy in the tree; both appeared once written under `.claude/skills/`. A copy
under `skills/` alone is published, not loaded.
