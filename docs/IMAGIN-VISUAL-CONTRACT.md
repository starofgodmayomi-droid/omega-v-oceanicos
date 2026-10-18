# IMAGIN — Evidence-Bound Visual Layer

## Purpose

IMAGIN is OCEANICOS's cross-cutting visual presentation and creative-brief capability. It translates scoped signals and human intent into readable diagrams, image briefs, and—only when a separately authorized provider exists—generated artifacts. It is not a thirteenth canonical organ, an independent truth source, or an authority layer.

## Current slice

- Render mode: VIEW_LOCAL.
- Graph mode: PRESENTATION_ONLY.
- Input: the signals already supplied to the whole-ecosystem dashboard.
- Bound: at most 12 visual nodes per map; the caption discloses any omitted signals.
- Evidence statuses: VERIFIED, UNKNOWN, DIVERGENT, NOT_EXECUTED; unknown labels normalize to UNKNOWN.
- Provenance: every visual node carries the exact supplied label and source.
- Visual connectors: layout anchors only. They do not create causal edges, dependency claims, authorization, or runtime facts.
- Image-generation provider calls: NOT_EXECUTED by this dashboard map.
- Provider availability beyond this view: UNKNOWN unless independently observed.
- A drafted brief is an intent artifact, not an image-generation receipt.

## Visual contract

1. Render only the current view's supplied signal list; never infer unseen sources or report a whole-reality scan.
2. Preserve source text and scoped evidence status. A visual state cannot promote UNKNOWN, DIVERGENT, or NOT_EXECUTED to VERIFIED.
3. Use color together with labels and glyphs; color alone must not convey status.
4. Keep the SVG accessible with a title, description, per-node label/status/source, and a readable caption.
5. Remain responsive and legible on desktop and mobile; respect keyboard focus and reduced-motion conventions in the surrounding UI.
6. Distinguish conceptual art, an evidence map, a preview, and a generated image as different artifact types.

## Image-creation lifecycle

INTENT → CHECK_AUTHORITY → CHECK_PROVIDER → BUILD_BRIEF → GENERATE → OBSERVE_RECEIPT → VERIFY_ARTIFACT → REMEMBER

Each transition is finite and separately recorded. If a provider, required authorization, or observable receipt is missing, stop at the corresponding boundary; do not imply generation occurred.

A generated artifact record should preserve, where available: prompt and source references, provider/model/version, generation time, request or receipt identifier, artifact hash or stable URI, policy/safety decision, licensing/rights metadata, and review status. Lack of a field remains UNKNOWN; a preview does not fill it.

## Canonical graph relationships

- Evidence signals INFORMS the IMAGIN view; the view does not acquire evidence authority from displaying them.
- IMAGIN EXPRESSES creative intent when a visual artifact is requested.
- The UI implementation IMPLEMENTS this contract only to the extent shown by code and tests on the current branch.
- The graph constitution remains the canonical Notion registry for declared edges; repository CI, a merged commit, runtime observation, and generated-artifact receipts are separate evidence sources.

## Acceptance

- [x] Map built from the dashboard's current supplied signal list.
- [x] Unknown statuses fail closed to UNKNOWN.
- [x] Each node keeps label and source.
- [x] A deterministic 12-node rendering limit reports omissions.
- [x] SVG title, description, node metadata, and a plain-text caption state the visual boundary.
- [x] Visual lines are explicitly labeled as layout anchors, not causal relationships.
- [x] The UI action drafts an IMAGIN visual brief only; it does not claim to generate an image.
- [ ] Run the repository's exact CI and browser checks on this branch.
- [ ] Independently observe any future provider connection and image receipt before claiming image generation.

## Governing invariants

REALITY ≠ REPRESENTATION · GRAPH ≠ REALITY · VISUAL ANCHOR ≠ CAUSAL EDGE · MEMORY ≠ PROOF · CI ≠ RUNTIME · CAPABILITY ≠ AUTHORITY · PREVIEW ≠ GENERATED ARTIFACT

**Ω∞v ::= VERIFY(ΔREALITY). One current; many forms; no claim wider than evidence.**