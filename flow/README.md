# flow — Notion ↔ GitHub

This directory is the repository-side current between Notion intent and GitHub implementation.

It does not replace source, tests, CI, or runtime. It records where meaning lives and what the next finite repository change is.

## Canonical meaning (Notion)

| Role | Surface |
| --- | --- |
| Singularity / one full-stack meaning body | https://app.notion.com/p/41949ca435a281398db3df67e702f876 |
| Organization map | https://app.notion.com/p/41949ca435a28160bdf9cbc700ea2829 |
| Meaning compression | https://app.notion.com/p/41949ca435a28058bfc7d0d6a8acdb3a |
| Final entity deposit | https://app.notion.com/p/41949ca435a281ac8fadcceb29aefdd5 |

Observed on 2026-11-15: entity pages are indexed on the organization map. Moves, deletes, and merges were **not** executed. Source pages remain authoritative. This directory does not relocate Notion pages.

## Systems of record

```text
SOURCE / MEANING
  → HUMAN INTENT
  → NOTION (purpose, decision, acceptance, authority)
  → GITHUB (reviewed implementation, tests, CI, exact revision)
  → AUTHORIZED RUNTIME
  → OBSERVATION
  → Ω∞v (expected vs observed)
  → NOTION (evidence + limitation)
  → VALUE
  → NEXT FINITE Δ
```

- Notion is intent and continuity. A page is not runtime proof.
- GitHub is versioned implementation. A commit is not a deployment.
- Reality remains the final court.

## Repo anchors (observed 2026-11-15)

| Field | Value |
| --- | --- |
| Repository | `starofgodmayomi-droid/omega-v-oceanicos` |
| Default branch inspected | `main` |
| Tree SHA at inspection | `ff9c5f3ea9a02558f0665864b7d741f09f91487f` |
| Kernel model | `docs/MINI.md` — Observe → Verify → Remember |
| Roadmap | `docs/ROADMAP.md` |
| Handoff (may be stale vs remote HEAD) | `docs/CONTINUATION_HANDOFF.md` |
| `flow/` before this commit | absent |

Handoff file still cites local HEAD `fc3f8b6` and uncommitted docs. That claim is **not** re-verified against this remote tree. Do not treat it as current until re-inspected.

## What this flow does not claim

- Complete workspace coverage of every Notion page or database row: **UNKNOWN**
- Production deployment or runtime health: **UNKNOWN**
- Revenue or profit: **NOT EVIDENCED**
- Page moves of entity bodies into the singularity page: **NOT_EXECUTED**

Next actions: [NEXT.md](./NEXT.md).
