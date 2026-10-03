# OCEANICOS mobile field console

## Mission

Build a mobile-first operational surface inside `apps/web` for the existing OCEANICOS repository. The surface keeps the evidence-bound loop legible on a phone: **Observe → Verify → Remember → Attest**, while keeping human approval explicit before command execution.

## Design

- **Design movement:** quiet brutalism meets oceanic field instrumentation.
- **Core principles:** calm signal hierarchy, evidence before decoration, thumb-first controls, visible uncertainty.
- **Color philosophy:** abyssal surfaces recede; seafoam marks current/verified state; warm amber means review/approval; coral means divergence; muted slate means unknown.
- **Layout paradigm:** a single vertical field notebook with a fixed bottom navigation rail, expandable evidence cards, and desktop widening only where it improves scanability.
- **Signature elements:** the Ω∞ drop mark, thin current-line dividers, and stage chips that carry both text and semantic status.
- **Interaction philosophy:** one primary action per card, safe defaults, no hidden execution, and refreshable server-derived state.
- **Animation:** restrained pulse for connected/current signals, short lift for new evidence, disabled under `prefers-reduced-motion`.
- **Typography:** Manrope for human-facing copy and DM Mono for IDs, timestamps, and evidence metadata.
- **Brand essence:** a pocket-sized verification cockpit for operators who need to know what is observed before acting. Personality: calm, exact, human-governed.
- **Brand voice:** direct and evidence-literate. Example lines: “Reality, verified.” and “Nothing executes until a human admits the transition.”
- **Wordmark/mark:** reuse the canonical `omega-mark.svg`; do not alter the drop/check relationship.
- **Signature color:** `--omega-current` seafoam, reserved for living signal and verified state.

## Scope

### Included

- Responsive mobile-first UI in `apps/web/src/App.tsx` and `apps/web/src/App.css`.
- Current, Evidence, and System tabs with persistent bottom navigation.
- API-backed health/capability/mood/miner/tip/stream state.
- Intent proposal and explicit approve → execute → observe path.
- Attestation request and visible status.
- Mobile web-app metadata and manifest.
- Route manifest for `/`.

### Excluded

- Native Expo/React Native packaging; this repository is a Vite React dashboard, so the delivered mobile surface is a responsive installable web app.
- New persistence, auth, cryptography, or API routes.
- Automatic execution, external deployment, purchases, or publication.
- Claims about production availability, HSM custody, external-world truth, or universal correctness.

## Project structure

- `apps/web/src/App.tsx` — mobile cockpit state, API orchestration, and tab views.
- `apps/web/src/App.css` — responsive field-console design system and interaction states.
- `apps/web/src/main.tsx` — global style imports and React bootstrap.
- `apps/web/public/manifest.webmanifest` — installable mobile web-app metadata.
- `apps/web/public/manus-routes.json` — page route declaration for the Webdev runtime.

## Acceptance criteria

- The app is usable at a 375px-wide viewport without horizontal scrolling.
- Current, Evidence, and System views remain reachable with visible focus and text labels.
- The four evidence stages are always visible in order and status is not conveyed by color alone.
- Missing API data is shown as `UNKNOWN`/`NOT CONNECTED`, never fabricated as verified.
- Intent flow keeps proposal, approval, execution, and observation as distinct states.
- `pnpm --filter web build` succeeds.
- Existing verification and route-contract checks are run; any pre-existing mismatch is recorded rather than hidden.
