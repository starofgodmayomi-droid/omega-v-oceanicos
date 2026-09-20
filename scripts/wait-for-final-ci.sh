#!/usr/bin/env bash
set -euo pipefail
sha="${1:?commit SHA required}"
for attempt in $(seq 1 30); do
  run_id=$(gh api "repos/starofgodmayomi-droid/omega-v-oceanicos/actions/runs?head_sha=${sha}&per_page=20" --jq '.workflow_runs[] | select(.name == "Verification Pipeline") | .id' | head -n 1)
  if [ -n "$run_id" ]; then
    gh run watch "$run_id" --exit-status
    exit $?
  fi
  sleep 10
done
echo "No Verification Pipeline run appeared for ${sha} within the bounded wait." >&2
exit 2
