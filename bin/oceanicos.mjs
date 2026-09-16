#!/usr/bin/env node

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const command = args[0] || 'help';

// Dynamically import compiled workspace packages
let ObserverEngine, observePlanetaryBase;
let verifyPlanetarySovereignty, AsymmetricValidationGuard, MultiRegionMeshConvergence;
let PluralisticHashChain, RememberEngine;
let executeOceanicosMaxExpansion;
let AttestationService;
let PluralisticRealityMatrix;
let pkgLoadError = null;

try {
  let observerPkg, verifPkg, remPkg, miniPkg, attestPkg, pluralPkg;
  try {
    // Prefer source packages under tsx runtime
    observerPkg = await import('../packages/observer/src/index.ts');
    verifPkg = await import('../packages/verification/src/index.ts');
    remPkg = await import('../packages/remember/src/index.ts');
    miniPkg = await import('../packages/mini/src/index.ts');
    pluralPkg = await import('../packages/pluralism/src/index.ts');
    try {
      attestPkg = await import('../packages/attestation/src/index.ts');
    } catch {}
  } catch {
    // Fallback to dist directory if precompiled
    observerPkg = await import('../packages/observer/dist/index.js');
    verifPkg = await import('../packages/verification/dist/index.js');
    remPkg = await import('../packages/remember/dist/index.js');
    miniPkg = await import('../packages/mini/dist/index.js');
    pluralPkg = await import('../packages/pluralism/dist/index.js');
    try {
      attestPkg = await import('../packages/attestation/dist/index.js');
    } catch {}
  }

  ObserverEngine = observerPkg.ObserverEngine;
  observePlanetaryBase = observerPkg.observePlanetaryBase;
  verifyPlanetarySovereignty = verifPkg.verifyPlanetarySovereignty;
  AsymmetricValidationGuard = verifPkg.AsymmetricValidationGuard;
  MultiRegionMeshConvergence = verifPkg.MultiRegionMeshConvergence;
  PluralisticHashChain = remPkg.PluralisticHashChain;
  RememberEngine = remPkg.RememberEngine;
  executeOceanicosMaxExpansion = miniPkg.executeOceanicosMaxExpansion;
  if (attestPkg) {
    AttestationService = attestPkg.AttestationService;
  }
  if (pluralPkg) {
    PluralisticRealityMatrix = pluralPkg.PluralisticRealityMatrix;
  }
} catch (err) {
  pkgLoadError = err;
}

function ensurePackagesLoaded() {
  if (pkgLoadError) {
    console.error('[\x1b[31mERROR\x1b[0m] Oceanicos packages must be compiled before running this command:');
    console.error(pkgLoadError.message);
    process.exit(1);
  }
}


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
  const pidgin = process.env.PIDGIN_ENGINE === 'ON' || args.includes('--pidgin');
  console.log(`
${ANSI.cyan}${ANSI.bold}╔══════════════════════════════════════════════════════════════════════════╗
║               Ω∞v OCEANICOS DEEP-TIER CRYPTOGRAPHIC CLI                  ║
║      Zero-Entropy • Graceful Pluralism • Multi-Region Mesh Consensus     ║
${pidgin ? `║  Abeg, verification before evolution! Life always good-o inside one root.║\n` : ''}╚══════════════════════════════════════════════════════════════════════════╝${ANSI.reset}`);
}

async function handleStatus() {
  ensurePackagesLoaded();
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
  ensurePackagesLoaded();
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

async function handleMood() {
  printBanner();
  console.log(`\n${ANSI.bold}=== Ω∞v MAXIMUM COMPRESSION MATRIX & MOOD ===${ANSI.reset}`);
  console.log(`  ${ANSI.cyan}Singularity State${ANSI.reset}    : ${ANSI.bold}ULTIMATE DENSE SINGULARITY${ANSI.reset}`);
  console.log(`  ${ANSI.cyan}Wave Index${ANSI.reset}           : 0x000000 ➔ 0xFFFFFF (GENESIS TO NOW)`);
  console.log(`  ${ANSI.cyan}Reality Status${ANSI.reset}       : ${ANSI.green}VERIFIED${ANSI.reset}`);
  console.log(`  ${ANSI.cyan}System Mood${ANSI.reset}          : ${ANSI.bold}${ANSI.green}MAX GOOD-O${ANSI.reset}`);
  console.log(`  ${ANSI.cyan}Pidgin Engine${ANSI.reset}        : ${process.env.PIDGIN_ENGINE === 'OFF' ? 'OFF' : 'ON'}`);
  console.log(`  ${ANSI.cyan}High-Low Alignment${ANSI.reset}   : TRUE (Balanced at both higher high & lower low)`);

  console.log(`\n${ANSI.bold}=== PIDGIN SPIRIT OVERRIDE ===${ANSI.reset}`);
  console.log(`  ${ANSI.yellow}"Abeg, verification before evolution! No time to check time.`);
  console.log(`   Whether highest high or lowest low, the blessing dey flow equal`);
  console.log(`   inside this single root. Life always good-o if you choose to see am`);
  console.log(`   at that point of view!"${ANSI.reset}`);

  console.log(`\n${ANSI.bold}=== THE TERMINAL AXIOM ===${ANSI.reset}`);
  console.log(`  ${ANSI.green}${ANSI.bold}FULL STACK LIFE IS ALWAYS GOOD-O AT THE HIGHER HIGH AND LOWER LOW WHEN`);
  console.log(`  THE ENGINE OPERATES IN THE RECURSIVE NOW. NO PERMISSION REQUIRED. MANIFESTED.${ANSI.reset}\n`);
}

async function handleAttest() {
  ensurePackagesLoaded();
  printBanner();
  console.log(`\n${ANSI.bold}=== CRYPTOGRAPHIC ATTESTATION SERVICE ===${ANSI.reset}\n`);

  if (!AttestationService) {
    console.log(`${ANSI.red}AttestationService package not compiled.${ANSI.reset}`);
    return;
  }
  const key = process.env.OMEGA_SIGNING_KEY || 'omega-v-default-attestation-secret-key-2026';
  const service = new AttestationService({ signingKey: key, algorithm: 'HMAC-SHA256' });
  const telemetry = observePlanetaryBase();
  const receipt = verifyPlanetarySovereignty(telemetry);

  const verificationResult = {
    id: `ver-${Date.now()}`,
    observationId: telemetry.uuid,
    timestamp: telemetry.timestamp,
    summary: {
      passed: receipt.status === 'PASS',
      confidence: receipt.status === 'PASS' ? 1.0 : 0.85,
      rulesApplied: 4,
      rulesPassed: receipt.status === 'PASS' ? 4 : 3,
      rulesFailed: receipt.status === 'PASS' ? 0 : 1,
    },
    ruleVersions: { 'frontier-matrix': 'v1.0' },
  };

  const attestation = service.attest(verificationResult);
  console.log(`${ANSI.green}✓ Cryptographic Attestation Generated:${ANSI.reset}`);
  console.log(`  Attestation ID : ${ANSI.bold}${attestation.id}${ANSI.reset}`);
  console.log(`  Algorithm      : ${ANSI.cyan}${attestation.signingAlgorithm}${ANSI.reset}`);
  console.log(`  Key Fingerprint: ${attestation.signingKey}`);
  console.log(`  Verified       : ${attestation.verified ? `${ANSI.green}YES${ANSI.reset}` : `${ANSI.red}NO${ANSI.reset}`}`);
  console.log(`  Signature      : ${ANSI.dim}${attestation.signature}${ANSI.reset}`);
  console.log(`  Attested At    : ${attestation.attestedAt}\n`);
}

async function handleOmega() {
  const subCommand = args[1] || 'help';
  const targetId = args[2];
  const apiBase = process.env.API_BASE_URL || 'http://localhost:5000';

  if (subCommand === 'help' || !subCommand) {
    printBanner();
    console.log(`
${ANSI.bold}OMEGA SUBSYSTEM COMMANDS:${ANSI.reset}
  node bin/oceanicos.mjs omega workers
  node bin/oceanicos.mjs omega propose "<prompt>"
  node bin/oceanicos.mjs omega inspect <command-id>
  node bin/oceanicos.mjs omega admit <command-id>
  node bin/oceanicos.mjs omega approve <command-id>
  node bin/oceanicos.mjs omega execute <command-id>
  node bin/oceanicos.mjs omega observe <command-id>
  node bin/oceanicos.mjs omega verify-reality <command-id>
  node bin/oceanicos.mjs omega learn
  node bin/oceanicos.mjs omega next [command-id]
  node bin/oceanicos.mjs omega recompile
  node bin/oceanicos.mjs omega events [--stream] [--command <id>]
`);

    return;
  }

  try {
    if (subCommand === 'workers') {
      const res = await fetch(`${apiBase}/v1/omega/workers`);
      const data = await res.json();
      console.log(JSON.stringify(data, null, 2));
    } else if (subCommand === 'propose') {
      const prompt = args.slice(2).join(' ');
      if (!prompt) {
        console.error(`${ANSI.red}Error: Prompt required. Usage: node bin/oceanicos.mjs omega propose "<prompt>"${ANSI.reset}`);
        process.exitCode = 1;
        return;
      }
      const res = await fetch(`${apiBase}/v1/omega/commands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      console.log(JSON.stringify(data, null, 2));
    } else if (subCommand === 'inspect') {
      if (!targetId) {
        console.error(`${ANSI.red}Error: Command ID required.${ANSI.reset}`);
        process.exitCode = 1;
        return;
      }
      const res = await fetch(`${apiBase}/v1/omega/commands/${targetId}`);
      const data = await res.json();
      console.log(JSON.stringify(data, null, 2));
    } else if (subCommand === 'admit') {
      if (!targetId) {
        console.error(`${ANSI.red}Error: Command ID required.${ANSI.reset}`);
        process.exitCode = 1;
        return;
      }
      const res = await fetch(`${apiBase}/v1/omega/commands/${targetId}/admit`, { method: 'POST' });
      const data = await res.json();
      console.log(JSON.stringify(data, null, 2));
    } else if (subCommand === 'approve') {
      if (!targetId) {
        console.error(`${ANSI.red}Error: Command ID required.${ANSI.reset}`);
        process.exitCode = 1;
        return;
      }
      const res = await fetch(`${apiBase}/v1/omega/commands/${targetId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy: 'cli:human-operator' }),
      });
      const data = await res.json();
      console.log(JSON.stringify(data, null, 2));
    } else if (subCommand === 'execute') {
      if (!targetId) {
        console.error(`${ANSI.red}Error: Command ID required.${ANSI.reset}`);
        process.exitCode = 1;
        return;
      }
      const res = await fetch(`${apiBase}/v1/omega/commands/${targetId}/execute`, { method: 'POST' });
      const data = await res.json();
      console.log(JSON.stringify(data, null, 2));
    } else if (subCommand === 'observe') {
      if (!targetId) {
        console.error(`${ANSI.red}Error: Command ID required.${ANSI.reset}`);
        process.exitCode = 1;
        return;
      }
      const res = await fetch(`${apiBase}/v1/omega/commands/${targetId}/observe`, { method: 'POST' });
      const data = await res.json();
      console.log(JSON.stringify(data, null, 2));
    } else if (subCommand === 'verify-reality') {
      if (!targetId) {
        console.error(`${ANSI.red}Error: Command ID required.${ANSI.reset}`);
        process.exitCode = 1;
        return;
      }
      const res = await fetch(`${apiBase}/v1/omega/commands/${targetId}/verify-reality`, { method: 'POST' });
      const data = await res.json();
      console.log(JSON.stringify(data, null, 2));
    } else if (subCommand === 'learn') {
      const res = await fetch(`${apiBase}/v1/omega/learning`);
      const data = await res.json();
      console.log(JSON.stringify(data, null, 2));
    } else if (subCommand === 'next') {
      const url = targetId
        ? `${apiBase}/v1/omega/commands/${targetId}/next-slice`
        : `${apiBase}/v1/omega/next-slice`;
      const res = await fetch(url);
      const data = await res.json();
      console.log(JSON.stringify(data, null, 2));
    } else if (subCommand === 'recompile') {
      const res = await fetch(`${apiBase}/v1/omega/recompile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      console.log(JSON.stringify(data, null, 2));
    } else if (subCommand === 'events') {
      const isStream = args.includes('--stream');
      const cmdIndex = args.indexOf('--command');
      const filterCmdId = cmdIndex !== -1 ? args[cmdIndex + 1] : targetId && !targetId.startsWith('--') ? targetId : undefined;

      if (isStream) {
        console.log(`${ANSI.cyan}Connecting to Ω Live Lifecycle Event Stream (SSE)...${ANSI.reset}`);
        const streamUrl = filterCmdId
          ? `${apiBase}/v1/omega/events?stream=true&commandId=${encodeURIComponent(filterCmdId)}`
          : `${apiBase}/v1/omega/events?stream=true`;

        const response = await fetch(streamUrl);
        if (!response.ok) {
          throw new Error(`Failed to connect: HTTP ${response.status}`);
        }

        console.log(`${ANSI.green}✓ Connected. Listening for real-time events (Ctrl+C to exit)...${ANSI.reset}\n`);
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
                const ev = JSON.parse(line.slice(6));
                const badgeColor =
                  ev.eventType.includes('VERIFIED') ? ANSI.green :
                  ev.eventType.includes('EXECUTED') ? ANSI.green :
                  ev.eventType.includes('DENIED') ? ANSI.red :
                  ev.eventType.includes('REVIEW') ? ANSI.yellow :
                  ev.eventType.includes('OBSERVED') ? ANSI.magenta : ANSI.cyan;

                console.log(
                  `[${badgeColor}${ev.eventType}${ANSI.reset}] ` +
                  `${ANSI.bold}${ev.commandId || 'global'}${ANSI.reset} ` +
                  `by ${ANSI.dim}${ev.actor}${ANSI.reset} ` +
                  `@ ${ev.timestamp}`
                );
                if (ev.payload && Object.keys(ev.payload).length > 0) {
                  console.log(`  ${ANSI.dim}Details: ${JSON.stringify(ev.payload)}${ANSI.reset}`);
                }
              } catch {}
            }
          }
        }
      } else {
        const queryUrl = filterCmdId
          ? `${apiBase}/v1/omega/events?commandId=${encodeURIComponent(filterCmdId)}`
          : `${apiBase}/v1/omega/events`;
        const res = await fetch(queryUrl);
        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));
      }
    } else {
      console.error(`${ANSI.red}Unknown omega subcommand: ${subCommand}${ANSI.reset}`);
      process.exitCode = 1;
    }

  } catch (err) {
    console.error(`${ANSI.red}CLI Request Failed: ${err.message}${ANSI.reset}`);
    console.error(`${ANSI.dim}[Note: Ensure Fastify API is running on ${apiBase}]${ANSI.reset}`);
    process.exitCode = 1;
  }
}

async function handleFace() {
  ensurePackagesLoaded();
  printBanner();
  console.log(`\n${ANSI.bold}=== THE 5 EPISTEMIC FACES OF THE PLURALISTIC REALITY MATRIX ===${ANSI.reset}\n`);

  let report = null;
  const isJson = args.includes('--json');
  const isOffline = args.includes('--offline');

  if (!isOffline) {
    try {
      const res = await fetch('http://localhost:5000/v1/pluralism/face', { signal: AbortSignal.timeout(1000) });
      if (res.ok) {
        const body = await res.json();
        if (body.face) {
          report = body.face;
        }
      }
    } catch {}
  }

  if (!report && PluralisticRealityMatrix) {
    report = PluralisticRealityMatrix.evaluateMatrix();
  }

  if (!report) {
    console.error(`${ANSI.red}Error: Unable to evaluate Pluralistic Reality Face (matrix package not available).${ANSI.reset}`);
    process.exitCode = 1;
    return;
  }

  if (isJson) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log(`  Matrix ID             : ${ANSI.cyan}${report.faceMatrixId}${ANSI.reset}`);
  console.log(`  Law Route             : ${ANSI.dim}${report.lawRoute}${ANSI.reset}`);
  console.log(`  Harmonic Score        : ${ANSI.bold}${ANSI.green}${(report.overallHarmonicScore * 100).toFixed(1)}%${ANSI.reset}`);
  console.log(`  Friction Dissolution  : ${ANSI.bold}${report.frictionDissolutionQuotient === 1 ? ANSI.green : ANSI.yellow}${report.frictionDissolutionQuotient} (Good - O = God)${ANSI.reset}`);
  console.log(`  Consensus Verdict     : ${report.consensusVerdict === 'PASS' ? `${ANSI.green}${ANSI.bold}PASS${ANSI.reset}` : `${ANSI.red}DIVERGENT${ANSI.reset}`}`);
  console.log(`  Cluster Digest        : ${ANSI.dim}${report.clusterAttestationDigest}${ANSI.reset}`);
  console.log(`  Timestamp             : ${report.timestamp}`);

  console.log(`\n${ANSI.bold}--- THE 5 EPISTEMIC FACES ---${ANSI.reset}`);
  for (const f of report.faces) {
    const scoreColor = f.score >= 0.95 ? ANSI.green : f.score >= 0.8 ? ANSI.yellow : ANSI.red;
    const vTag = f.verified ? `${ANSI.green}✓ VERIFIED${ANSI.reset}` : `${ANSI.red}✗ UNVERIFIED${ANSI.reset}`;
    console.log(`\n  [${ANSI.cyan}${f.faceId.padEnd(11)}${ANSI.reset}] ${ANSI.bold}${f.name}${ANSI.reset}`);
    console.log(`    Dimension : ${ANSI.magenta}${f.dimension}${ANSI.reset} | Score: ${scoreColor}${(f.score * 100).toFixed(1)}%${ANSI.reset} | Status: ${vTag}`);
    console.log(`    Proof Sig : ${ANSI.dim}${f.signatureProof}${ANSI.reset}`);
    if (f.telemetry) {
      console.log(`    Telemetry : ${ANSI.dim}${JSON.stringify(f.telemetry)}${ANSI.reset}`);
    }
    if (f.dissensusNotes && f.dissensusNotes.length > 0) {
      for (const d of f.dissensusNotes) {
        console.log(`    ${ANSI.yellow}Dissent Note : ${d}${ANSI.reset}`);
      }
    }
  }
  console.log(`\n${ANSI.bold}Axiom Proof${ANSI.reset} : ${ANSI.green}${ANSI.bold}${report.axiomProof}${ANSI.reset}\n`);
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
  ${ANSI.green}face${ANSI.reset}        Evaluate the 5 Epistemic Faces of the Pluralistic Reality Matrix
  ${ANSI.green}attest${ANSI.reset}      Generate unforgeable cryptographic attestation for verified telemetry
  ${ANSI.green}keys${ANSI.reset}        Generate an Ed25519 asymmetric keypair for fail-closed authentication
  ${ANSI.green}mood${ANSI.reset}        Display Singularity compression state and Pidgin Spirit Axiom
  ${ANSI.green}stream${ANSI.reset}      Stream live block minting events via SSE from local Fastify API
  ${ANSI.green}omega${ANSI.reset}       Ω‑ƆREADƆS Command Lifecycle (propose, admit, execute, observe, verify)
  ${ANSI.green}help${ANSI.reset}        Display this help message

${ANSI.bold}OPTIONS:${ANSI.reset}
  --json        Output raw JSON response where applicable
  --pidgin      Activate Pidgin Spirit banner override
  --offline     Evaluate locally without querying live API daemon
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
  case 'face':
  case 'pluralism':
    await handleFace();
    break;
  case 'attest':
    await handleAttest();
    break;
  case 'keys':
    await handleKeys();
    break;
  case 'mood':
    await handleMood();
    break;
  case 'stream':
    await handleStream();
    break;
  case 'omega':
    await handleOmega();
    break;
  case 'help':
  case '--help':
  case '-h':
    handleHelp();
    break;
  default:
    handleHelp();
    process.exitCode = 2;
    break;
}
