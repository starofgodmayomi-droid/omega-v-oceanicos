# Lucid Field × Water Current — UI Contract

**Status:** feature-branch implementation proposal  
**Product surface:** `apps/web`  
**Authority boundary:** view-local evidence only

## Intent

Unify the existing Lucid Field signal summary and Water Flow trace into one legible surface. This is a composition of existing contracts, not a second command dashboard and not a whole-reality scan.

The two supplied skill packages inform the implementation in complementary ways:

- **The Voice Bridge:** preserve human authorship; express meaning warmly without inventing identity, intimacy, personal experience, memory, or supernatural access. Use symbolism as language, not authority.
- **Starofgodmayomi:** inspect before changing; keep reality/evidence/authority distinct; take the smallest reviewable delta; test and record what remains unknown.

## UI contract

- **Field:** show only the signals supplied by the existing dashboard evidence array. Each row carries a source and a normalized state.
- **Water:** show the finite `REALITY → ATTENTION → INTENTION → ACTION → CONSEQUENCE → OBSERVATION → LEARNING → RETURN` contract. A stage is marked `IN TRACE` only when a supplied frame names that stage.
- **No receipt:** absence of a frame list remains `NOT_EXECUTED`; the path is still a documented contract, not telemetry.
- **Unknown stays unknown:** unrecognized states are normalized to `UNKNOWN`, never promoted to `VERIFIED`.
- **Human action:** `PLAN REVIEW` only prepares a bounded intent for the existing input. It does not approve, execute, attest, or deploy anything.
- **Semantic color:** use the existing token system for verified, unknown, divergent, and not-executed statuses. No status color is decoration.
- **Responsive and accessible:** keyboard-visible focus, text labels alongside color, readable small-screen layout, and reduced-motion support.
- **Visual language:** abyssal glass, current-cyan, restrained violet depth, fine connected nodes. Water means continuity, memory, adaptation, and connection—not literal liquid computation or proof.

## Evidence and acceptance

1. Existing `summarizeLucidField` determines the view-local summary.
2. Existing `summarizeWaterFlow` determines trace status from supplied frames; an absent receipt stays `NOT_EXECUTED`.
3. The UI labels scope and source; no whole-system counts or external connection status are invented.
4. Existing model tests cover unknown normalization, field summaries, and bounded water-flow states.
5. This branch must pass the repository web build/typecheck and applicable CI before the change is considered verified. A green build does not establish deployment or runtime health.

## Next finite delta

Review the rendered surface and CI output. Reconcile actual failures only; keep the change on this feature branch until review. Do not merge or claim deployment without explicit review and supporting evidence.
