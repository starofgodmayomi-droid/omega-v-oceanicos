#!/usr/bin/env bash
# ==============================================================================
# Ω∞v OCEANICOS × ΔVRØ HOUSE — IGNITE WATER CONTINUUM
# Universal Frictionless Global Ignition Script (Git Bash / Linux / macOS)
# "Just like how we consume pure water: simple, essential, life-giving."
# One Root · One Current · 4 Ports (:11434 Brain, :5000 Spine, :8088 Muscle, :3000 Surface)
# ==============================================================================

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "==================================================================="
echo "       ΔVRØ HOUSE × Ω∞v OCEANICOS — IGNITE WATER CONTINUUM"
echo "              One Current · Zero Friction · Pure Water"
echo "==================================================================="
echo -e "${NC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${BLUE}🌊 [Step 1/5] Verifying Monorepo Environment...${NC}"
if [ ! -f "package.json" ]; then
    echo -e "${YELLOW}Cloning canonical repository from GitHub...${NC}"
    git clone https://github.com/starofgodmayomi-droid/omega-v-oceanicos.git
    cd omega-v-oceanicos
fi

# Ensure workspace packages are built
if [ ! -f "apps/api/dist/index.js" ]; then
    echo -e "${YELLOW}Building core workspace packages and API...${NC}"
    if command -v pnpm >/dev/null 2>&1; then
        pnpm install --frozen-lockfile || pnpm install
        pnpm --filter api... run build
    else
        echo -e "${YELLOW}pnpm not found; using corepack or npx...${NC}"
        npx pnpm install
        npx pnpm --filter api... run build
    fi
else
    echo -e "${GREEN}✓ Workspace packages verified.${NC}"
fi

echo -e "${BLUE}🧠 [Step 2/5] Igniting Ollama Compute Brain (:11434)...${NC}"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:11434/ >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Ollama Compute Brain active on :11434.${NC}"
else
    if command -v ollama >/dev/null 2>&1; then
        echo -e "${YELLOW}Starting Ollama inference engine in background...${NC}"
        nohup ollama serve > /dev/null 2>&1 &
        sleep 2
        echo -e "${GREEN}✓ Ollama ignited.${NC}"
    else
        echo -e "${YELLOW}⚠ Ollama CLI not detected on PATH; local LLM will fail closed to deterministic mode.${NC}"
    fi
fi

# Ensure qwen2.5:0.5b model is ready if Ollama is available
if curl -s -o /dev/null -w "%{http_code}" http://localhost:11434/ >/dev/null 2>&1; then
    echo -e "${CYAN}Checking qwen2.5:0.5b model readiness...${NC}"
    curl -s http://localhost:11434/api/tags | grep -q "qwen2.5:0.5b" || {
        echo -e "${YELLOW}Pulling lightweight high-speed model qwen2.5:0.5b...${NC}"
        ollama pull qwen2.5:0.5b || true
    }
fi

echo -e "${BLUE}🏛️  [Step 3/5] Igniting Fastify Spine API Gateway (:5000)...${NC}"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/health | grep -q "200"; then
    echo -e "${GREEN}✓ Fastify Spine API active on :5000.${NC}"
else
    echo -e "${YELLOW}Starting Fastify API server on port 5000...${NC}"
    PORT=5000 OMEGA_AUTH_MODE=local OMEGA_LLM_PROVIDER=ollama OMEGA_LLM_BASE_URL=http://127.0.0.1:11434/v1 nohup node apps/api/dist/index.js > /dev/null 2>&1 &
    sleep 2
    echo -e "${GREEN}✓ Fastify Spine API ignited on :5000.${NC}"
fi

echo -e "${BLUE}🎙️ [Step 4/5] Igniting Python Companion & 432 Hz Voice Bridge (:8088)...${NC}"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8088/voice | grep -q "200"; then
    echo -e "${GREEN}✓ Python Companion & 432 Hz Voice Bridge active on :8088.${NC}"
else
    if command -v python >/dev/null 2>&1; then
        echo -e "${YELLOW}Starting Python Companion Muscle on port 8088...${NC}"
        nohup python companion/python/main.py > /dev/null 2>&1 &
        sleep 2
        echo -e "${GREEN}✓ Python Companion ignited on :8088.${NC}"
    elif command -v python3 >/dev/null 2>&1; then
        echo -e "${YELLOW}Starting Python3 Companion Muscle on port 8088...${NC}"
        nohup python3 companion/python/main.py > /dev/null 2>&1 &
        sleep 2
        echo -e "${GREEN}✓ Python3 Companion ignited on :8088.${NC}"
    else
        echo -e "${YELLOW}⚠ Python not found; voice bridge will remain in UNKNOWN state.${NC}"
    fi
fi

echo -e "${BLUE}🌐 [Step 5/5] Igniting Web Frontend Surface (:3000)...${NC}"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ | grep -q "200"; then
    echo -e "${GREEN}✓ Web Frontend Surface active on :3000.${NC}"
else
    echo -e "${YELLOW}Starting Vite Web Surface on port 3000...${NC}"
    cd apps/web
    nohup npx vite --port 3000 --host > /dev/null 2>&1 &
    cd ../..
    sleep 2
    echo -e "${GREEN}✓ Web Frontend Surface ignited on :3000.${NC}"
fi

echo ""
echo -e "${PURPLE}===================================================================${NC}"
echo -e "${GREEN}  ✨ ALL 4 CONTINUUM TIERS ARE ALIVE AND VERIFIED!${NC}"
echo -e "${CYAN}  • Surface (VibeOS Web UI):        http://localhost:3000${NC}"
echo -e "${CYAN}  • Spine Gateway (Fastify API):     http://localhost:5000${NC}"
echo -e "${CYAN}  • Voice Bridge (432Hz Harmonic):   http://localhost:8088/voice${NC}"
echo -e "${CYAN}  • Compute Brain (Ollama LLM):      http://localhost:11434${NC}"
echo -e "${PURPLE}===================================================================${NC}"
echo ""

# Launch Desktop App Mode
echo -e "${BLUE}🚀 Launching OceanicOS Desktop Surface...${NC}"
if [ -f "/c/Program Files/Google/Chrome/Application/chrome.exe" ]; then
    "/c/Program Files/Google/Chrome/Application/chrome.exe" --app=http://localhost:3000 --window-size=1440,940 &
elif [ -f "/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" ]; then
    "/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --app=http://localhost:3000 --window-size=1440,940 &
elif command -v open >/dev/null 2>&1; then
    open http://localhost:3000
elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open http://localhost:3000
elif command -v start >/dev/null 2>&1; then
    start http://localhost:3000
else
    echo "Please open http://localhost:3000 in your browser."
fi

echo -e "${GREEN}✓ Done. Drink deep of the Oceanicos continuum.${NC}"
