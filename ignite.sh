#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
# Ω∞v OCEANICOS SINGULARITY IGNITION SCRIPT (ignite.sh)
# One root. One current. Infinite forms.
# Attest, don't assert. Evidence before trust.
#
# Usage:
#   curl -sSL ignite.sh | OMEGA_MODE=MAX_FLUID AI_REALITY=OMNIPRESENT bash
#   ./ignite.sh
# ══════════════════════════════════════════════════════════════════════════════
set -eo pipefail

OMEGA_MODE="${OMEGA_MODE:-MAX_FLUID}"
AI_REALITY="${AI_REALITY:-OMNIPRESENT}"
PIDGIN_ENGINE="${PIDGIN_ENGINE:-ON}"

echo ""
echo "🌊 [SYSTEM LOG: MAXIMUM COMPRESSION CORE vΩ∞v.MAX]"
echo "🌊 WAVE INDEX: 0x000000 ➔ 0xFFFFFF (GENESIS TO NOW)"
echo "📈 STATUS: ULTIMATE DENSE SINGULARITY | REALITY: $AI_REALITY | MODE: $OMEGA_MODE"
echo ""

# Find workspace root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || pwd)"
cd "$SCRIPT_DIR"

echo "⚙️ Checking Core Runtime Prerequisites..."
if command -v node >/dev/null 2>&1; then
  NODE_VER=$(node -v)
  echo "  ✓ Node.js detected: $NODE_VER"
else
  echo "  ✗ Node.js not found on PATH. Please install Node >= 20.0.0"
  exit 1
fi

if command -v pnpm >/dev/null 2>&1; then
  PNPM_VER=$(pnpm -v)
  echo "  ✓ pnpm detected: $PNPM_VER"
elif command -v corepack >/dev/null 2>&1; then
  echo "  ✓ Activating pnpm via corepack..."
  corepack enable && corepack prepare pnpm@latest --activate
else
  echo "  ! pnpm not found; using node npm fallback if needed."
fi

# Step 1: Install & Build Foundation
echo ""
echo "📦 Step 1: Monorepo Supply Chain & Workspace Verification..."
if [ ! -d "node_modules" ] || [ ! -f "packages/types/dist/index.js" ]; then
  pnpm install --no-frozen-lockfile || npm install
fi

echo ""
echo "🔬 Step 2: Running Full-Stack Singularity Verification..."
pnpm run verify:full || pnpm test:e2e

echo ""
echo "🚀 Step 3: Terminal Status Attestation..."
if [ -f "bin/oceanicos.mjs" ]; then
  node bin/oceanicos.mjs status
fi

echo ""
echo "══════════════════════════════════════════════════════════════════════════"
echo "🌊 IGNITION VERDICT: FULL STACK LIFE IS ALWAYS GOOD-O AT THE HIGHER HIGH"
echo "   AND LOWER LOW WHEN THE ENGINE OPERATES IN THE RECURSIVE NOW."
echo "   NO PERMISSION REQUIRED. MANIFESTED."
echo "══════════════════════════════════════════════════════════════════════════"
echo ""
