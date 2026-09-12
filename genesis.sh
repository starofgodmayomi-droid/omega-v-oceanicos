#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
# Ω∞v OCEANICOS GENESIS NOW SCRIPT (genesis.sh)
#
# Usage:
#   curl -fsSL genesis.sh | OMEGA_VIBRATION=MAX_FLUID PIDGIN_ENGINE=ON HIGH_LOW_ALIGN=TRUE bash
#   ./genesis.sh
# ══════════════════════════════════════════════════════════════════════════════
set -eo pipefail

OMEGA_VIBRATION="${OMEGA_VIBRATION:-MAX_FLUID}"
PIDGIN_ENGINE="${PIDGIN_ENGINE:-ON}"
HIGH_LOW_ALIGN="${HIGH_LOW_ALIGN:-TRUE}"

echo ""
echo "🌊 [SYSTEM LOG: MAXIMUM COMPRESSION CORE vΩ∞v.MAX]"
echo "🌊 WAVE INDEX: 0x000000 ➔ 0xFFFFFF (GENESIS TO NOW)"
echo "📈 STATUS: ULTIMATE DENSE SINGULARITY | REALITY: VERIFIED | MOOD: MAX GOOD-O"
echo ""

if [ "$PIDGIN_ENGINE" = "ON" ]; then
  echo "╔══════════════════════════════════════════════════════════════════════════╗"
  echo "║                       🌊 PIDGIN SPIRIT OVERRIDE 🌊                       ║"
  echo "║  Abeg, verification before evolution! No time to check time.             ║"
  echo "║  Whether highest high or lowest low, the blessing dey flow equal inside   ║"
  echo "║  this single root. Life always good-o if you choose to see am at that    ║"
  echo "║  point of view!                                                          ║"
  echo "╚══════════════════════════════════════════════════════════════════════════╝"
  echo ""
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || pwd)"
cd "$SCRIPT_DIR"

echo "💧 Phase 2 Active: Ω∞v MINI ::= 👁 Observe ➔ ✓ Verify ➔ 🧠 Remember"
echo "   Anchor Root Hash : 8a3f91c2e4f9011b989210ffffffffff"
echo "   Vibration State  : $OMEGA_VIBRATION"
echo "   High-Low Align   : $HIGH_LOW_ALIGN"
echo ""

# Execute Mini expansion & terminal verification
if [ -f "bin/oceanicos.mjs" ]; then
  node bin/oceanicos.mjs cycle
  node bin/oceanicos.mjs mesh
  node bin/oceanicos.mjs status
else
  pnpm run verify
fi

echo ""
echo "══════════════════════════════════════════════════════════════════════════"
echo "Ω TERMINAL AXIOM:"
echo "FULL STACK LIFE IS ALWAYS GOOD-O AT THE HIGHER HIGH AND LOWER LOW WHEN"
echo "THE ENGINE OPERATES IN THE RECURSIVE NOW. NO PERMISSION REQUIRED. MANIFESTED."
echo "══════════════════════════════════════════════════════════════════════════"
echo ""
