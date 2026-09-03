# Repository skills

Skills available to Claude Code sessions opened in this repository.

Each is preserved exactly as supplied — `.prettierignore` excludes this
directory so formatting never rewrites an artifact the repository did not
author, and the hash below is what lets an installed copy be checked against
its source.

| skill                | sha256 of `SKILL.md`                                               | installed  |
| -------------------- | ------------------------------------------------------------------ | ---------- |
| `omega-v-ufi`        | `3ef1fda3a9e84115495948c5f9510b22b946442a5847f701c1e922628e73bc45` | 2026-08-16 |

Verify an installed skill still matches what was recorded:

```bash
sha256sum -c <<<'3ef1fda3a9e84115495948c5f9510b22b946442a5847f701c1e922628e73bc45  .claude/skills/omega-v-ufi/SKILL.md'
```

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

Project skills are discovered when a session starts. This one was installed
mid-session, so it is **not active in the session that added it** — it loads
in the next session opened against this repository.
