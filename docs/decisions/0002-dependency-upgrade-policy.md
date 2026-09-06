# 2. Diagnose dependency upgrades on main, not inside the proposal

- **Status:** accepted
- **Date:** 2026-08-23
- **Supersedes:** nothing

## Context

Nine dependency proposals arrived at once. Seven failed. Every failure read,
at first glance, as the dependency being broken.

None of them were.

| Proposal             | Apparent cause       | Actual cause                                                     |
| -------------------- | -------------------- | ---------------------------------------------------------------- |
| typescript-toolchain | TypeScript broken    | `baseUrl` and `moduleResolution: node10` removed by the compiler |
| testing              | jest 30 broken       | our grouping split React from its test harness                   |
| react                | React 19 broken      | the same split, seen from the other side                         |
| testing-and-react    | React 19 broken      | `apps/web` used the global `JSX` namespace                       |
| typescript-toolchain | TypeScript broken    | `Uint8Array<ArrayBufferLike>` no longer a `BufferSource`         |
| testing-and-react    | Node incompatibility | `engines` claimed Node 18; the image had always been Node 20     |
| typescript-toolchain | TypeScript 6 broken  | `rootDir` was implicit in the root config                        |

Six were the repository not being ready. One — `@typescript-eslint` refusing
to parse TypeScript 7 — was genuinely upstream.

## Decision

**Fix forward on `main`, never inside the proposal.**

A dependency proposal should be judged on whether the dependency works. A
source fix carried inside one is lost the moment the proposal is closed or
regenerated, and both happen often. Every fix in the table above belonged on
`main` regardless of when its bump landed, and each is correct on the version
in use today as well as the version proposed.

**Rebase before diagnosing.** A verdict against a stale base describes a
world that no longer exists. Three proposals were diagnosed twice here
because the first reading was against a base six merges old.

**Group packages that are coupled, not packages that look alike.**
`@testing-library/react` takes React as a peer dependency. Splitting them
produced two proposals that could each only be green if the other had already
landed, so neither could ever land. Peer-coupled packages move as one change.

**Hold, do not silence.** When an upgrade genuinely cannot pass — the
TypeScript 7 case — record an ignore that names the blocking tool, quotes
what it says, links the upstream tracking issue, and states the condition
that retires it. An unexplained ignore is indistinguishable from one added to
bury an inconvenient failure.

## Consequences

**What this buys.** Dependency work stops being maintenance and becomes a
source of findings. Chasing failures that never merged still corrected eight
tsconfigs, two API misuses in `apps/web`, a runtime support claim the project
could not honour, and a grouping defect. None of those were noticed by the
tests, because the tests all passed on the versions in use.

**What it costs.** More pull requests than the naive path, and each proposal
takes two or three rounds — diagnose, fix forward, rebase, re-judge. That is
slower than merging on green and slower than closing on red.

**What it refuses.** Merging a dependency because CI happens to be green on a
stale base, and closing one because CI is red without reading why. Both
substitute a colour for a reason.

## The rule underneath

A red pipeline on a dependency bump is a question, not a verdict. Six times
out of seven here, the answer was about this repository rather than about the
dependency — and every one of those answers was worth having on `main`
whether or not the upgrade ever lands.
