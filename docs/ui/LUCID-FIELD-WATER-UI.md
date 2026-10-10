# Lucid Field × Living Water — UI Contract

**Product surface:** `apps/web`  
**Evidence boundary:** current view signals and the active command's existing `omega.water-flow.v1` receipt.  
**Implementation:** [commit b901ce6](https://github.com/starofgodmayomi-droid/omega-v-oceanicos/commit/b901ce63a15a5f951592271d8ea9fe09eefb9f19) on [PR #443](https://github.com/starofgodmayomi-droid/omega-v-oceanicos/pull/443).

## Purpose

Compose source-bound Lucid Field signals and the current bounded command trace into one coherent OCEANICOS surface—not a second dashboard or whole-reality scan.

## Skill constraints

- **The Voice Bridge:** preserve human authorship; be direct and warm without inventing identity, inaccessible memory, personal experience, or supernatural authority. Symbolic language is meaning, not evidence.
- **Starofgodmayomi:** reality over representation; evidence over assertion; authority over capability; smallest reviewable change; test and record uncertainty.

## Contracts

- Field rows preserve label, source, and normalized status; unknown/unrecognized values stay `UNKNOWN`.
- Water binds only frames returned by `waterFlowFramesFromCommand`, then reuses the existing `omega.water-flow.v1` shape/version/provenance/sequence/bounds validation.
- Twelve stages: `SOURCE → DROP → FLOW → CONTACT → OBSERVE → REFLECT → VERIFY → CHANGE → RECONCILE → REMEMBER → RETURN → NEW_DROP`.
- No receipt: `NOT_EXECUTED`; supported local mapping: `MODEL_ONLY`; invalid frame/provenance: `DIVERGENT`; no distinct v1 mapping: `UNKNOWN`.
- `PLAN REVIEW` prepares user intent only; it does not approve or execute.
- Responsive CSS includes desktop/tablet/mobile breakpoints, visible focus for the review control, semantic text labels, and reduced-motion handling. Water means continuity and connection, not technical proof.

## Acceptance evidence — current snapshot

For commit `b901ce63a15a5f951592271d8ea9fe09eefb9f19`, these hosted workflows passed:

- [Verification Pipeline](https://github.com/starofgodmayomi-droid/omega-v-oceanicos/actions/runs/38008828733) — Node 22, Node 24, Windows, Compose, container/API smoke, and attestation steps all succeeded.
- [Pull Request Coverage](https://github.com/starofgodmayomi-droid/omega-v-oceanicos/actions/runs/38008828791) — success.
- [Security Analysis / CodeQL](https://github.com/starofgodmayomi-droid/omega-v-oceanicos/actions/runs/38008828820) — success.
- [Bounded Full-Stack Worker](https://github.com/starofgodmayomi-droid/omega-v-oceanicos/actions/runs/38008828727) — success.

Focused regression tests cover supplied receipt composition, missing receipt, and invalid provenance. Root `test` and `test:e2e` include both Water and Field × Water tests.

**Still not observed:** no existing app preview URL was found in the inspected repository/Notion references, so rendered desktop/tablet/mobile behavior, actual keyboard navigation, and reduced-motion behavior have not been browser-reviewed. Do not infer this from CI. No merge, deployment, external integration, or runtime-health claim is made.
