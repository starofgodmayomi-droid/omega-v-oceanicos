#!/usr/bin/env node

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Dynamically import compiled workspace packages
let ObserverEngine, observePlanetaryBase;
let verifyPlanetarySovereignty, AsymmetricValidationGuard, MultiRegionMeshConvergence;
let PluralisticHashChain, RememberEngine;
let executeOceanicosMaxExpansion;

try {
  const observerPkg = require(path.join(rootDir, 'packages/observer/dist/index.js'));
  ObserverEngine = observerPkg.ObserverEngine;
  observePlanetaryBase = observerPkg.observePlanetaryBase;

  const verifPkg = require(path.join(rootDir, 'packages/verification/dist/index.js'));
  verifyPlanetarySovereignty = verifPkg.verifyPlanetarySovereignty;
  AsymmetricValidationGuard = verifPkg.AsymmetricValidationGuard;
  MultiRegionMeshConvergence = verifPkg.MultiRegionMeshConvergence;

  const remPkg = require(path.join(rootDir, 'packages/remember/dist/index.js'));
  PluralisticHashChain = remPkg.PluralisticHashChain;
  RememberEngine = remPkg.RememberEngine;

  const miniPkg = require(path.join(rootDir, 'packages/mini/dist/index.js'));
  executeOceanicosMaxExpansion = miniPkg.executeOceanicosMaxExpansion;
} catch (err) {
  console.error('[\x1b[31mERROR\x1b[0m] Oceanicos packages must be compiled before running CLI:');
  console.error(err.message);
  process.exit(1);
}

const args = process.argv.slice(2);
const command = args[0] || 'help';

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

function printBanner() {
  console.log(`
${ANSI.cyan}${ANSI.bold}╔══════════════════════════════════════════════════════════════════════════╗
║               Ω∞v OCEANICOS DEEP-TIER CRYPTOGRAPHIC CLI                  ║
║      Zero-Entropy • Graceful Pluralism • Multi-Region Mesh Consensus     ║
╚══════════════════════════════════════════════════════════════════════════╝${ANSI.reset}`);
}

async function handleStatus() {
  printBanner();
  console.log(`\n${ANSI.bold}=== SYSTEM HEALTH & TELEMETRY ===${ANSI.reset}`);
  const telemetry = observePlanetaryBase();
  console.log(`  ${ANSI.cyan}Silicon Yield${ANSI.reset}         : ${ANSI.bold}${(telemetry.siliconYield * 100).toFixed(2)}%${ANSI.reset}`);
  console.log(`  ${ANSI.cyan}Grid Load${ANSI.reset}             : ${ANSI.bold}${telemetry.gridLoadMegawatts} MW${ANSI.reset}`);
  console.log(`  ${ANSI.cyan}Accelerators${ANSI.reset}          : ${ANSI.bold}${telemetry.acceleratorInventory.toLocaleString()} active nodes${ANSI.reset}`);
  console.log(`  ${ANSI.cyan}Telemetry Epoch${ANSI.reset}       : ${telemetry.timestamp}`);

  console.log(`\n${ANSI.bold}=== LOCAL LEDGER & GENESIS STATUS ===${ANSI.reset}`);
  const chain = new PluralisticHashChain();
  const blocks = chain.getFullChain();
  console.log(`  ${ANSI.cyan}Chain Genesis Block${ANSI.reset}   : #${blocks[0].index} [${blocks[0].hash.substring(0, 16)}...]`);
  console.log(`  ${ANSI.cyan}Anchor Nonce${ANSI.reset}          : ${blocks[0].nonce}`);

  // Query live API tip if running
  try {
    const res = await fetch('http://localhost:5000/v1/block/tip', { signal: AbortSignal.timeout(600) });
    if (res.ok) {
      const data = await res.json();
      console.log(`\n${ANSI.bold}=== LIVE API SERVICE ===${ANSI.reset}`);
      console.log(`  ${ANSI.green}Service Status${ANSI.reset}        : ONLINE`);
      console.log(`  ${ANSI.cyan}Ledger Tip${ANSI.reset}            : #${data.tip?.index ?? 'GENESIS'} [${data.tip?.hash ?? 'NONE'}]`);
    }
  } catch {
    console.log(`\n${ANSI.dim}[Note: Local Fastify API on :5000 is not running or unreachable]${ANSI.reset}`);
  }
  console.log('');
}

async function handleCycle() {
  printBanner();
  console.log(`\n${ANSI.yellow}Executing Omnipresent Consensus Cycle...${ANSI.reset}\n`);
  const block = executeOceanicosMaxExpansion();
  if (args.includes('--json')) {
    console.log(JSON.stringify(block, null, 2));
  } else {
    console.log(`${ANSI.green}${ANSI.bold}✓ BLOCK MINTED WITH SATISFIED PROOF-OF-WORK${ANSI.reset}`);
    console.log(`  Index        : ${ANSI.bold}#${block.index}${ANSI.reset}`);
    console.log(`  Hash         : ${ANSI.cyan}${block.hash}${ANSI.reset}`);
    console.log(`  Previous     : ${block.previousHash}`);
    console.log(`  Nonce (PoW)  : ${block.nonce}`);
    console.log(`  State Root   : ${block.payload.stateRootHash}`);
    console.log(`  Law Route    : ${block.payload.receipt?.lawRoute || 'N/A'}`);
    console.log(`  Timestamp    : ${block.timestamp}\n`);
  }
}

async function handleMesh() {
  printBanner();
  console.log(`\n${ANSI.bold}=== PLANETARY SOVEREIGN MESH CONVERGENCE ===${ANSI.reset}`);
  const telemetry = observePlanetaryBase();
  const convergence = MultiRegionMeshConvergence.simulateConvergence(telemetry);

  console.log(`\n  Consensus Round       : ${ANSI.cyan}${convergence.consensusRound}${ANSI.reset}`);
  console.log(`  Quorum Reached        : ${convergence.quorumReached ? `${ANSI.green}TRUE${ANSI.reset}` : `${ANSI.red}FALSE${ANSI.reset}`}`);
  console.log(`  Effective Status      : ${ANSI.bold}${convergence.effectiveStatus}${ANSI.reset}`);
  console.log(`  Cluster Proof         : ${ANSI.dim}${convergence.clusterSignatureProof}${ANSI.reset}`);
  console.log(`\n${ANSI.bold}  --- REGIONAL SOVEREIGN NODE AUDIT ---${ANSI.reset}`);

  for (const v of convergence.votes) {
    const verdictColor = v.verdict === 'PASS' ? ANSI.green : v.verdict === 'DIVERGENT' ? ANSI.yellow : ANSI.red;
    console.log(`  [${v.region.padEnd(2)}] ${ANSI.cyan}${v.nodeId.padEnd(20)}${ANSI.reset} | ${verdictColor}${v.verdict.padEnd(9)}${ANSI.reset} | ${v.latencyMs.toString().padStart(3)}ms | ${v.ruleApplied}`);
    console.log(`       ${ANSI.dim}Sig: ${v.signature.substring(0, 48)}...${ANSI.reset}`);
  }
  console.log('');
}

async function handleKeys() {
  printBanner();
  console.log(`\n${ANSI.bold}=== GENERATING ED25519 ASYMMETRIC KEYPAIR ===${ANSI.reset}\n`);
  const keypair = AsymmetricValidationGuard.generateKeyPair();
  console.log(`${ANSI.green}${ANSI.bold}PUBLIC KEY (SHAREABLE AS IDENTITY):${ANSI.reset}`);
  console.log(keypair.publicKey);
  console.log(`${ANSI.yellow}${ANSI.bold}PRIVATE KEY (CONFIDENTIAL ENCLAVE SIGNER):${ANSI.reset}`);
  console.log(keypair.privateKey);
}

async function handleStream() {
  printBanner();
  console.log(`\n${ANSI.cyan}Listening for real-time SSE cryptographic blocks on http://localhost:5000/v1/stream...${ANSI.reset}`);
  console.log(`${ANSI.dim}Press Ctrl+C to disconnect.${ANSI.reset}\n`);

  try {
    const response = await fetch('http://localhost:5000/v1/stream', {
      headers: { Accept: 'text/event-stream' },
    });

    if (!response.ok || !response.body) {
      throw new Error(`Failed to connect: HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.block) {
              console.log(
                `⚡ [${ANSI.green}STREAM BLOCK${ANSI.reset}] #${ANSI.bold}${data.block.index}${ANSI.reset} ` +
                `Hash: ${ANSI.cyan}${data.block.hash.substring(0, 18)}...${ANSI.reset} ` +
                `PoW: ${data.block.nonce} ` +
                `Yield: ${(data.block.observation?.siliconYield * 100 || 0).toFixed(1)}% ` +
                `@ ${data.block.timestamp}`
              );
            }
          } catch {}
        }
      }
    }
  } catch (err) {
    console.error(`${ANSI.red}Live stream error:${ANSI.reset} ${err.message}`);
    console.log(`${ANSI.yellow}Tip: Make sure the API server is running with 'pnpm run start:api'${ANSI.reset}\n`);
  }
}

function handleHelp() {
  printBanner();
  console.log(`
${ANSI.bold}USAGE:${ANSI.reset}
  node bin/oceanicos.mjs <command> [options]

${ANSI.bold}COMMANDS:${ANSI.reset}
  ${ANSI.green}status${ANSI.reset}      Show system health, telemetry, genesis anchor, and live API status
  ${ANSI.green}cycle${ANSI.reset}       Execute and cryptographically commit a new consensus block (PoW)
  ${ANSI.green}mesh${ANSI.reset}        Simulate decentralized consensus convergence across 4 sovereign nodes
  ${ANSI.green}keys${ANSI.reset}        Generate an Ed25519 asymmetric keypair for fail-closed authentication
  ${ANSI.green}stream${ANSI.reset}      Stream live block minting events via SSE from local Fastify API
  ${ANSI.green}help${ANSI.reset}        Display this help message

${ANSI.bold}OPTIONS:${ANSI.reset}
  --json        Output raw JSON response where applicable
`);
}

switch (command) {
  case 'status':
    await handleStatus();
    break;
  case 'cycle':
    await handleCycle();
    break;
  case 'mesh':
    await handleMesh();
    break;
  case 'keys':
    await handleKeys();
    break;
  case 'stream':
    await handleStream();
    break;
  case 'help':
  default:
    handleHelp();
    break;
}
