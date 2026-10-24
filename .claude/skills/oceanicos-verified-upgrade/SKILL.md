---
name: oceanicos-verified-upgrade
description: "Run Oceanicos self-repair and self-upgrade as a verified, reversible pipeline. Use when asked to repair, upgrade, compress, or evolve this repository or a dependent system without skipping observation."
---

# Oceanicos Verified Upgrade

## Purpose

An upgrade is a finite transition from an observed state to a new observed state. “Self-repair” and “self-upgrade” mean the same pipeline with a human still holding AUTHORITY. They do not mean an unattended agent, a silent rewrite, or a claim that the system evolved because a prompt said so.

Canonical compression already in this repository:

```text
VERIFY(ΔREALITY)
SOURCE → RUNTIME → REALITY
COMPILE → VALIDATE → ADMIT → EXECUTE → OBSERVE
→ VERIFIED | DIVERGENT | HALTED
```

See `OMEGA_UPGRADE_MAX_COMPRESS.md` and the index `docs/upgrades/ECOSYSTEM_COMPRESS_EXPAND.md`. This skill is the operating contract for that line. A later pass carries state through `skills/lucid-continuum`, then re-observes it. Neither file proves the kernel, API, web panel, CLI, or CI stage is healthy.

## Pipeline

```text
POSSIBLE → OBSERVE → BOUND → AUTHORITY → VALIDATE → ADMIT
→ EXECUTE → OBSERVE → VERIFIED | DIVERGENT | UNKNOWN | NOT_EXECUTED
```

1. **Observe the baseline.** Repository identity, branch, dirty work, the failing check or the concrete defect, and the contracts the change will touch. Do not upgrade from a slogan.
2. **Bound one slice.** One defect or one earned expansion. Name files, the expected observation, the stop condition, and the rollback.
3. **Authority.** Stay inside the requested repository and the permissions actually present. Do not push, merge, deploy, rotate secrets, or delete data unless that exact action was requested and the live workflow allows it. `REVIEW` does not execute.
4. **Validate before admission.** The change type-checks or otherwise matches the local contract. A design note is not admission.
5. **Execute** only the admitted slice. Preserve unrelated user work. Do not reformat supplied skills or rewrite history to make a diff look clean.
6. **Observe the consequence.** Re-run the check that defined “fixed.” Record the command, the result, and what was not run.
7. **Label the outcome.**
   - `VERIFIED` — the admitted check passed and covers the claim.
   - `DIVERGENT` — the check ran and failed, or the tree does not match the intent. Keep the failure.
   - `UNKNOWN` — the check could not be run here.
   - `NOT_EXECUTED` — the upgrade was specified and not applied.
   - `HALTED` — a stop condition fired (missing authority, protected surface, or a failing gate).

## Repair versus upgrade

- **Repair** restores an already claimed behavior that is currently `DIVERGENT` or broken. Prefer the smallest change that makes the existing contract true.
- **Upgrade** adds a behavior the repository did not previously claim. Say that it is new. Do not describe it as a repair, and do not mark it `VERIFIED` until its own check exists and has been observed.

Neither one is permission to widen scope because a nearby file looks unfinished.

## Protected surfaces

Halt and say why, rather than working around the gate, when the change would:

- alter credentials, auth policy, signing keys, or production deploy config without an explicit request;
- destroy data, force-push, or rewrite published history;
- treat a green test as proof of deployment, revenue, health, or physical-world effect;
- hide a failing check, a skipped test, or a dissenting result.

## Return

Report baseline, slice, what ran, the label, what remains `UNKNOWN` or `NOT_EXECUTED`, and the rollback. If the next upgrade is not justified by the observation, do not invent one.
