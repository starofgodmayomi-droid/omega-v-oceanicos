#!/usr/bin/env bash
set -Eeuo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

if ! command -v pnpm >/dev/null 2>&1; then
  printf '%s\n' '[ELION] pnpm is required but was not found.' >&2
  exit 127
fi

run_dir="$(mktemp -d)"
web_pid=""
api_pid=""

cleanup() {
  for pid in "$web_pid" "$api_pid"; do
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
  rm -rf "$run_dir"
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

printf '%s\n' '[ELION] Starting web and API dependency builds in parallel.'
pnpm --filter web run build >"$run_dir/web.log" 2>&1 &
web_pid=$!
pnpm --filter 'api...' run build >"$run_dir/api.log" 2>&1 &
api_pid=$!

set +e
wait "$web_pid"
web_status=$?
web_pid=""
wait "$api_pid"
api_status=$?
api_pid=""
set -e

printf '%s\n' '--- web build ---'
cat "$run_dir/web.log"
printf '%s\n' '--- API and dependency build ---'
cat "$run_dir/api.log"

if (( web_status != 0 || api_status != 0 )); then
  printf '[VERAL] DIVERGENT: parallel build failed (web=%d, api=%d); serial gates were not run.\n' \
    "$web_status" "$api_status" >&2
  exit 1
fi

printf '%s\n' '[VERAL] Parallel builds passed. Starting serial verification gates.'
pnpm lint
pnpm test
pnpm validate:swarm

printf '%s\n' '[VERAL] VERIFIED: builds, lint, test, and swarm validation passed.'
printf '%s\n' '[VERAL] Ledger mutation: NONE. Upgrade execution: NOT_EXECUTED.'
