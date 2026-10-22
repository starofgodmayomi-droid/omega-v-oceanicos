# OCEANICOS Ω∞v — Water Intelligence Interaction Contract

**Status:** implementation contract for the first water-skin slice.

The ocean is the interface metaphor; runtime events and evidence remain the source of truth. A visual treatment must never imply execution, live activity, permission, or verification that the system has not observed.

## Interaction vocabulary

| Water metaphor | Product meaning | Required source of truth |
| --- | --- | --- |
| Flow | A request moving between stages | Ordered lifecycle or trace events |
| Confluence | Results combined from agents or tools | Recorded inputs and merge result |
| Depth | More context or provenance revealed | Retrieved records with access checks |
| Transparency | Sources, logs, and evidence visible | Evidence references and provenance |
| Tides | Workload or system activity changes | Timestamped runtime metrics/events |
| Ripples | A new event and its downstream effects | Event ID and observed dependency edges |
| Currents | Dependencies and task progress | Recorded graph edges and task state |
| Still water | Idle or completed state | Explicit runtime state, not absence of animation alone |
| Turbulence | Error, conflict, or uncertainty | Error record, dissent, or unresolved status |
| Filtration | Duplicate/noise reduction | Named filter rule and retained/dropped counts |
| Containment | Permission and isolation boundaries | Effective scope, policy decision, and audit record |
| Reflection | Compare intent with outcome | Acceptance criteria and observed outputs |

## State and color rules

- `VERIFIED` may use the verified semantic token only when a relevant check ran and its evidence covers the claim.
- `DIVERGENT` must preserve conflicting observations instead of smoothing them away.
- `UNKNOWN` means evidence is missing or inconclusive.
- `NOT_EXECUTED` means the action did not run or was rejected; it is not a success state.
- Access denial, expired authorization, and missing permission must remain distinguishable from technical failure.
- Animation is decorative feedback only. It must not be used as a substitute for runtime telemetry or proof.

## Design and accessibility requirements

1. Use canonical `--omega-*` tokens rather than adding ad-hoc component colors.
2. Keep surfaces readable above decorative gradients; preserve focus visibility and text contrast.
3. Respect `prefers-reduced-motion`; no essential information may depend on movement, sound, or color alone.
4. Reflow trace stages for narrow screens without hiding the stage names or status.
5. Keep the trace finite, provenance-aware, and explicit about what it does not prove.
6. Add interaction only when it exposes a real action or additional evidence; never make a decorative surface appear actionable.

## First implementation slice

`apps/web/src/water-intelligence.css` establishes brand-aligned ocean surfaces, token-driven finite-trace styling, responsive stage layout, focus treatment, and reduced-motion behavior. `WaterFlowPanel` maps the supplied summary status and observed stages to semantic data attributes. It does not run a pipeline or upgrade local trace provenance into external verification.

## Next implementation gates

1. Replace remaining high-impact hard-coded color clusters in `App.css` in small reviewed slices.
2. Bind current/orchestration visuals to actual lifecycle events and dependency edges.
3. Add evidence drill-down with explicit access checks and provenance links.
4. Add visual regression and accessibility checks for desktop, mobile, keyboard navigation, contrast, and reduced motion.
5. Keep every claimed status tied to an observed runtime record and a verification rule.
