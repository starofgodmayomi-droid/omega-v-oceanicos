#!/usr/bin/env bash
set -Eeuo pipefail

# Ω∞v Oceanicos Totality verification: build, type-check, test, runtime smoke, and report.
# This is intentionally local and fail-closed; it does not publish or deploy.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

printf '\nΩ∞v OCEANICOS TOTALITY\n'
printf '%s\n' 'Observe → Verify → Remember → MINI → API/Web/CLI'
printf 'Repository: %s\n\n' "$ROOT_DIR"

pnpm install --frozen-lockfile
pnpm run build
pnpm run typecheck
pnpm run test:e2e
node scripts/smoke-api.cjs

printf '\nTOTALITY STATUS: VERIFIED (local build, integration, and compiled runtime contract)\n'
printf 'Deployment status: not claimed; configure and validate a target separately.\n'
