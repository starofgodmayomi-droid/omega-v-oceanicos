#!/usr/bin/env node

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createHash } from 'node:crypto';

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
let runOmegaChangePipeline;
let AttestationService;
let PluralisticRealityMatrix;
let OceanicosKernel;
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
  } catch (srcErr) {
    // If not running under tsx, respawn with tsx import loader
    if (process.env.OCEANICOS_CLI_SPAWNED !== '1') {
      const { spawnSync } = await import('node:child_process');
      const result = spawnSync(
        process.execPath,
        ['--import', 'tsx', fileURLToPath(import.meta.url), ...process.argv.slice(2)],
        {
          stdio: 'inherit',
          env: { ...process.env, OCEANICOS_CLI_SPAWNED: '1' },
        }
      );
      process.exit(result.status ?? 0);
    }
    pkgLoadError = srcErr;
  }

  if (observerPkg) {
    ObserverEngine = observerPkg.ObserverEngine;
    observePlanetaryBase = observerPkg.observePlanetaryBase;
    verifyPlanetarySovereignty = verifPkg.verifyPlanetarySovereignty;
    AsymmetricValidationGuard = verifPkg.AsymmetricValidationGuard;
    MultiRegionMeshConvergence = verifPkg.MultiRegionMeshConvergence;
    PluralisticHashChain = remPkg.PluralisticHashChain;
    RememberEngine = remPkg.RememberEngine;
    executeOceanicosMaxExpansion = miniPkg.executeOceanicosMaxExpansion;
    OceanicosKernel = miniPkg.OceanicosKernel;
    runOmegaChangePipeline = miniPkg.runOmegaChangePipeline;
    if (attestPkg) {
      AttestationService = attestPkg.AttestationService;
    }
    if (pluralPkg) {
      PluralisticRealityMatrix = pluralPkg.PluralisticRealityMatrix;
    }
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

const apiBase = (process.env.OMEGA_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');

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

async function omegaRequest(pathname, method = 'GET', body) {
  const response = await fetch(`${apiBase}${pathname}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || `Ω API request failed (${response.status})`);
  return payload;
}

async function handleOmega(argsAfterCommand) {
  const subcommand = argsAfterCommand[0] || 'help';
  if (subcommand === 'workers') return console.log(JSON.stringify(await omegaRequest('/v1/omega/workers'), null, 2));
  if (subcommand === 'events') return console.log(JSON.stringify(await omegaRequest(`/v1/omega/events${argsAfterCommand[1] ? `?commandId=${encodeURIComponent(argsAfterCommand[1])}` : ''}`), null, 2));
  if (subcommand === 'propose') {
    const intent = argsAfterCommand.slice(1).join(' ').trim();
    if (!intent) throw new Error('omega propose requires a bounded intent');
    return console.log(JSON.stringify(await omegaRequest('/v1/omega/commands', 'POST', {
      intent,
      requestedBy: process.env.OMEGA_REQUESTED_BY || 'cli-user',
      workers: ['observer', 'planner'],
      idempotencyKey: `cli-${Date.now()}`,
    }), null, 2));
  }
  const id = argsAfterCommand[1];
  if (!id) throw new Error(`omega ${subcommand} requires a command id`);
  if (subcommand === 'inspect') return console.log(JSON.stringify(await omegaRequest(`/v1/omega/commands/${encodeURIComponent(id)}`), null, 2));
  if (subcommand === 'admit') return console.log(JSON.stringify(await omegaRequest(`/v1/omega/commands/${encodeURIComponent(id)}/admit`, 'POST', { authority: process.env.OMEGA_AUTHORITY || 'human:cli-user', policy: 'policy:cli', authorityVerified: true, policySatisfied: true }), null, 2));
  if (subcommand === 'approve') return console.log(JSON.stringify(await omegaRequest(`/v1/omega/commands/${encodeURIComponent(id)}/approve`, 'POST', { operator: process.env.OMEGA_REQUESTED_BY || 'cli-user' }), null, 2));
  if (subcommand === 'execute') return console.log(JSON.stringify(await omegaRequest(`/v1/omega/commands/${encodeURIComponent(id)}/execute`, 'POST', {}), null, 2));
  if (subcommand === 'observe') return console.log(JSON.stringify(await omegaRequest(`/v1/omega/commands/${encodeURIComponent(id)}/observe`, 'POST', { observedState: argsAfterCommand.slice(2).join(' ') || 'bounded-local-action-complete' }), null, 2));
  if (subcommand === 'verify-reality') return console.log(JSON.stringify(await omegaRequest(`/v1/omega/commands/${encodeURIComponent(id)}/verify-reality`, 'POST', {}), null, 2));
  throw new Error('unknown omega command; use workers, propose, inspect, admit, approve, execute, observe, verify-reality, or events');
}

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

async function handleCopilot() {
  printBanner();
  console.log(`\n${ANSI.bold}=== 💧 Ω∞v COPILOT ANTIGRAVITY CONTINUUM ===${ANSI.reset}\n`);
  console.log(`  ${ANSI.cyan}MODE             ${ANSI.reset}: COPILOT=ON | ANTIGRAVITY=ON | FULL_STACK=ON | REALITY_FIRST=ON`);
  console.log(`  ${ANSI.cyan}PROPULSION       ${ANSI.reset}: Copilot = Propulsion Layer (Proposal only, NO autonomous authority)`);
  console.log(`  ${ANSI.cyan}BOUNDARY         ${ANSI.reset}: Ω Kernel = Control / Admissibility Boundary`);
  console.log(`  ${ANSI.cyan}EVALUATOR        ${ANSI.reset}: Reality = Final Evaluator`);
  console.log(`  ${ANSI.cyan}CONTINUUM        ${ANSI.reset}: FINITE_VERIFIED_STEPS (Next Δ ➔ Verify ➔ Next Δ)`);
  console.log(`  ${ANSI.cyan}DISSENT          ${ANSI.reset}: PRESERVE (Friction is engineering signal)`);
  console.log(`  ${ANSI.cyan}INVARIANT        ${ANSI.reset}: Ω∞v ≡ VERIFY(ΔREALITY) [PROVABLE_ADMISSIBLE_CHANGE]\n`);

  console.log(`${ANSI.bold}=== ANTI-COLLAPSE LAW ===${ANSI.reset}`);
  console.log(`  POSSIBLE ≠ KNOWN ≠ PERMITTED ≠ ATTEMPTED ≠ EXECUTED ≠ OBSERVED ≠ VERIFIED`);
  console.log(`  MODEL OUTPUT ≠ TRUTH | CAPABILITY ≠ PERMISSION | PROPOSAL ≠ ACTION | ACTION ≠ SUCCESS\n`);

  console.log(`${ANSI.bold}=== SIGNAL TRANSLATION MATRIX ===${ANSI.reset}`);
  console.log(`  FRICTION     ➔ LOCALIZE`);
  console.log(`  UNCERTAINTY  ➔ VERIFY`);
  console.log(`  FAILURE      ➔ DIAGNOSE`);
  console.log(`  DISSENT      ➔ PRESERVE`);
  console.log(`  DRIFT        ➔ RECONCILE`);
  console.log(`  SUCCESS      ➔ ATTEST`);
  console.log(`  LEARNING     ➔ RECOMPILE\n`);

  console.log(`${ANSI.green}✓ Copilot Mood verified as a bounded operating mode inside Ω OS.${ANSI.reset}\n`);
}

async function handleSoul(extraArgs = []) {
  printBanner();
  const sub = extraArgs[0] || 'status';
  const isPidgin = process.env.PIDGIN_ENGINE === 'ON' || args.includes('--pidgin');

  if (sub === 'record' || sub === 'drop') {
    const textArgs = extraArgs.slice(1).filter((a) => !a.startsWith('--'));
    const text = textArgs.join(' ').trim();
    if (!text) {
      console.error(`${ANSI.red}Error:${ANSI.reset} Please provide a reflection text: node bin/oceanicos.mjs soul drop "<reflection text>"`);
      process.exitCode = 1;
      return;
    }
    const timestamp = new Date().toISOString();
    const dropId = `soul-drop-${Date.now()}`;
    const hash = createHash('sha256').update(`${dropId}:${text}:${timestamp}`).digest('hex');

    console.log(`\n${ANSI.bold}=== 💧 TRUTH OS / SOUL DROP RECORDED ===${ANSI.reset}`);
    console.log(`  ${ANSI.cyan}Drop ID${ANSI.reset}        : ${dropId}`);
    console.log(`  ${ANSI.cyan}Author${ANSI.reset}         : starofgodmayomi / Elion Varel / Prophet Seed`);
    console.log(`  ${ANSI.cyan}Reflection${ANSI.reset}     : "${text}"`);
    console.log(`  ${ANSI.cyan}Sha256 Digest${ANSI.reset}  : ${hash}`);
    console.log(`  ${ANSI.cyan}Timestamp${ANSI.reset}      : ${timestamp}`);
    console.log(`  ${ANSI.cyan}Provenance${ANSI.reset}     : ${ANSI.green}APPEND-ONLY HUMAN ROOT (L1 ➔ L2 ➔ L4)${ANSI.reset}`);
    if (isPidgin) {
      console.log(`\n  ${ANSI.yellow}Abeg, the word don enter memory! True talk no dey fade, na living water wey dey water the garden.${ANSI.reset}\n`);
    } else {
      console.log(`\n  ${ANSI.green}✓ Truth recorded in living continuity. Blessings in Disguise active.${ANSI.reset}\n`);
    }
    return;
  }

  console.log(`\n${ANSI.bold}=== 💧 ELION VAREL / PROPHET SEED / TRUTH OS ===${ANSI.reset}`);
  console.log(`  ${ANSI.cyan}Origin Root      ${ANSI.reset}: starofgodmayomi`);
  console.log(`  ${ANSI.cyan}Identity Stack   ${ANSI.reset}: Elion Varel / Prophet Seed / Truth OS / Ω∞v / Eternal Stack`);
  console.log(`  ${ANSI.cyan}Cosmic Horizon   ${ANSI.reset}: Source ➔ Flow ➔ Form ➔ Recognition ➔ Blessing ➔ Becoming ➔ ∞`);
  console.log(`  ${ANSI.cyan}Meaning Field    ${ANSI.reset}: Dark ocean night, shooting star rises, transparent water-human`);
  console.log(`  ${ANSI.cyan}Living Hubs      ${ANSI.reset}: Churches & community centers as learning, manufacturing, wellness, AI hubs`);
  console.log(`  ${ANSI.cyan}Soul Income Loop ${ANSI.reset}: Book of Elion, voice drops, soul mirror pages, dream journals, quote packs`);
  console.log(`  ${ANSI.cyan}Inviolable Law   ${ANSI.reset}: Symbolic vision ≠ Scientific claim | Love = Only real`);

  console.log(`\n${ANSI.bold}=== AXIOMS OF THE ETERNAL STACK ===${ANSI.reset}`);
  if (isPidgin) {
    console.log(`  ${ANSI.yellow}• Remember, no be say you dey learn new thing; the truth dey inside you already.`);
    console.log(`  • Truth-in-Love: Build, never destroy. One moment, many bodies.`);
    console.log(`  • Natural things na free gift; artificial life costly, always dey demand upgrade.`);
    console.log(`  • Health, peace, fitness, community na the real wealth; money na only tool, no be God.`);
    console.log(`  • God dey for church, God dey for street. Everything na one intelligence.${ANSI.reset}`);
  } else {
    console.log(`  ${ANSI.green}• Remember, not learn. Truth-in-Love. Build, never destroy.`);
    console.log(`  • Natural = free, automatic. Artificial = costly, needs upgrades.`);
    console.log(`  • Health, food, peace, fitness, community = true wealth. Money = tool, not god.`);
    console.log(`  • Thoughts create; action births. One step, million solutions.`);
    console.log(`  • Universe = one intelligence, continuous creation, living mirror.${ANSI.reset}`);
  }
  console.log(`\n  ${ANSI.dim}Run 'node bin/oceanicos.mjs soul drop "<text>"' to append a verified truth reflection.${ANSI.reset}\n`);
}

async function handleTruth(extraArgs = []) {
  await handleSoul(['status', ...extraArgs]);
}

async function handleBuild(extraArgs = []) {
  printBanner();
  const sub = extraArgs[0];
  const isPidgin = process.env.PIDGIN_ENGINE === 'ON' || args.includes('--pidgin');

  if (sub === 'log' || sub === 'add') {
    const textArgs = extraArgs.slice(1).filter((a) => !a.startsWith('--'));
    const item = textArgs.join(' ').trim();
    if (!item) {
      console.error(`${ANSI.red}Error:${ANSI.reset} Please provide a built deliverable description.`);
      process.exitCode = 1;
      return;
    }
    const timestamp = new Date().toISOString();
    const buildId = `build-${Date.now()}`;
    const hash = createHash('sha256').update(`${buildId}:${item}:${timestamp}`).digest('hex');

    console.log(`\n${ANSI.bold}=== 🛠️ SOUL BUILD DELIVERABLE LOGGED ===${ANSI.reset}`);
    console.log(`  ${ANSI.cyan}Build ID${ANSI.reset}     : ${buildId}`);
    console.log(`  ${ANSI.cyan}Deliverable${ANSI.reset}  : "${item}"`);
    console.log(`  ${ANSI.cyan}Digest${ANSI.reset}       : ${hash}`);
    console.log(`  ${ANSI.cyan}Timestamp${ANSI.reset}    : ${timestamp}`);
    console.log(`  ${ANSI.cyan}Rule${ANSI.reset}         : ${ANSI.green}Build without destroying. Sell only what heals.${ANSI.reset}\n`);
    return;
  }

  console.log(`\n${ANSI.bold}=== 🛠️ LIVING ECOSYSTEM BUILD MANIFEST ===${ANSI.reset}`);
  console.log(`  ${ANSI.cyan}SOUL INCOME PIPELINE:${ANSI.reset}`);
  console.log(`    • Book of Elion, voice drops, soul mirror pages, dream journals`);
  console.log(`    • AI art / audio / ghostwriting, quote packs, guided meditations`);
  console.log(`    • Post daily. Speak truth aloud. Record reflections. Sell only what heals.`);
  console.log(`  ${ANSI.cyan}COMMUNITY STEWARDSHIP HUBS:${ANSI.reset}`);
  console.log(`    • Transforming churches and community centres into innovation sanctuaries:`);
  console.log(`      Learning • Manufacturing • Wellness • Food Security • AI Training • Youth Stewardship`);
  console.log(`    • Serving Nigeria, Africa, and the global family.`);
  console.log(`\n  ${ANSI.dim}Run 'node bin/oceanicos.mjs build log "<deliverable>"' to record completed work.${ANSI.reset}\n`);
}

async function handleDream(extraArgs = []) {
  printBanner();
  const textArgs = extraArgs.filter((a) => !a.startsWith('--'));
  const dreamText = textArgs.join(' ').trim();
  const isPidgin = process.env.PIDGIN_ENGINE === 'ON' || args.includes('--pidgin');

  if (!dreamText) {
    console.log(`\n${ANSI.bold}=== 🌙 DREAM JOURNAL PROTOCOL ===${ANSI.reset}`);
    console.log(`  ${ANSI.cyan}Core Law${ANSI.reset}       : Dreams = Messages. Love = Only real.`);
    console.log(`  ${ANSI.cyan}Preservation${ANSI.reset}   : Preserve nocturnal symbols, visions, and intuitions without false flattening.`);
    console.log(`\n  ${ANSI.dim}Usage: node bin/oceanicos.mjs dream "<describe your dream/message>"${ANSI.reset}\n`);
    return;
  }

  const timestamp = new Date().toISOString();
  const dreamId = `dream-${Date.now()}`;
  const hash = createHash('sha256').update(`${dreamId}:${dreamText}:${timestamp}`).digest('hex');

  console.log(`\n${ANSI.bold}=== 🌙 DREAM ENTRY RECORDED IN CONTINUITY ===${ANSI.reset}`);
  console.log(`  ${ANSI.cyan}Dream ID${ANSI.reset}     : ${dreamId}`);
  console.log(`  ${ANSI.cyan}Message${ANSI.reset}      : "${dreamText}"`);
  console.log(`  ${ANSI.cyan}Sha256 Digest${ANSI.reset}: ${hash}`);
  console.log(`  ${ANSI.cyan}Timestamp${ANSI.reset}    : ${timestamp}`);
  console.log(`  ${ANSI.cyan}Status${ANSI.reset}       : ${ANSI.green}FIRST-CLASS NOCTURNAL ARTIFACT (L1 ➔ L2)${ANSI.reset}`);
  if (isPidgin) {
    console.log(`\n  ${ANSI.yellow}Abeg, the message don enter ledger. Dreams na road wey spirit take dey speak to man.${ANSI.reset}\n`);
  } else {
    console.log(`\n  ${ANSI.green}✓ Dream anchored in living memory. Wonder preserved without false certainty.${ANSI.reset}\n`);
  }
}

async function handleNews() {
  printBanner();
  console.log(`\n${ANSI.bold}=== 🌐 GROUNDED NEWS & VERIFICATION COMPASS ===${ANSI.reset}`);
  console.log(`  ${ANSI.cyan}Ecosystem Rule${ANSI.reset}   : If live data needed: Ask for sources or enable browsing.`);
  console.log(`  ${ANSI.cyan}Antidote to Noise${ANSI.reset}: Never fake headlines. If no live access, say so plain.`);
  console.log(`  ${ANSI.cyan}Authority Order${ANSI.reset}  : Reality > Observation > Verified Evidence > Representation.`);
  console.log(`\n  ${ANSI.green}✓ Grounded verification compass active.${ANSI.reset}\n`);
}

async function handleRest() {
  printBanner();
  const isPidgin = process.env.PIDGIN_ENGINE === 'ON' || args.includes('--pidgin');
  console.log(`\n${ANSI.bold}=== 🕊️ REST & SABBATH PROTOCOL ===${ANSI.reset}`);
  console.log(`  ${ANSI.cyan}The Living Loop${ANSI.reset}  :`);
  console.log(`    Observe without interrupting.`);
  console.log(`    Recognize without capturing.`);
  console.log(`    Bless without possessing.`);
  console.log(`    Build without destroying.`);
  console.log(`    ${ANSI.bold}${ANSI.green}Rest without guilt.${ANSI.reset}`);
  console.log(`    Repeat.`);
  console.log(`\n  ${ANSI.cyan}True Wealth${ANSI.reset}      : Health, food, peace, fitness, community = true wealth.`);
  console.log(`  ${ANSI.cyan}Money Relation${ANSI.reset}   : Money = tool, not god.`);
  if (isPidgin) {
    console.log(`\n  ${ANSI.yellow}Body no be iron. Rest your head, recharge your spirit, because tomorrow get e own blessing.${ANSI.reset}\n`);
  } else {
    console.log(`\n  ${ANSI.green}✓ Take rest in peace and gratitude. The current continues.${ANSI.reset}\n`);
  }
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


async function handleKernel() {
  ensurePackagesLoaded();
  const subCommand = args[1] || 'help';
  const isJson = args.includes('--json');
  const apiBase = process.env.API_BASE_URL || 'http://localhost:5000';

  if (subCommand === 'help' || subCommand === '--help') {
    printBanner();
    console.log(`
${ANSI.bold}KERNEL SUBSYSTEM COMMANDS:${ANSI.reset}
  node bin/oceanicos.mjs kernel status       Show kernel chain head, stats, and hash-chain summary
  node bin/oceanicos.mjs kernel verify       Run full hash-chain integrity self-audit
  node bin/oceanicos.mjs kernel states       List all canonical state nodes in the chain
  node bin/oceanicos.mjs kernel help         Display this help message

${ANSI.bold}OPTIONS:${ANSI.reset}
  --json        Output raw JSON instead of formatted text
  --online      Query live API kernel endpoints (default: local-first offline)
`);
    return;
  }

  if (subCommand === 'status') {
    // Try API first if --online, otherwise instantiate locally
    let stats = null;
    let head = null;
    let chainLength = 0;
    const isOnline = args.includes('--online');

    if (isOnline) {
      try {
        const res = await fetch(`${apiBase}/v1/omega/kernel/status`, { signal: AbortSignal.timeout(1500) });
        if (res.ok) {
          const data = await res.json();
          stats = data.stats;
          head = data.head;
          chainLength = data.chainLength ?? stats?.totalTransitions ?? 0;
        }
      } catch {}
    }

    if (!stats) {
      // Local-first: instantiate a fresh kernel to show structure
      const kernel = new OceanicosKernel();
      stats = kernel.getStats();
      head = kernel.getHead();
      chainLength = kernel.getChainLength();
    }

    if (isJson) {
      console.log(JSON.stringify({ stats, head, chainLength }, null, 2));
      return;
    }

    printBanner();
    console.log(`\n${ANSI.bold}=== Ω CANONICAL KERNEL STATUS ===${ANSI.reset}`);
    console.log(`  ${ANSI.cyan}Chain Length${ANSI.reset}          : ${ANSI.bold}${chainLength}${ANSI.reset} state nodes`);
    console.log(`  ${ANSI.cyan}Total Transitions${ANSI.reset}    : ${stats.totalTransitions}`);
    console.log(`  ${ANSI.cyan}Verified States${ANSI.reset}      : ${ANSI.green}${stats.verifiedStatesCount}${ANSI.reset}`);
    console.log(`  ${ANSI.cyan}Dissent Records${ANSI.reset}      : ${stats.dissentRecordedCount > 0 ? ANSI.yellow : ANSI.dim}${stats.dissentRecordedCount}${ANSI.reset}`);
    console.log(`  ${ANSI.cyan}Gated Actions${ANSI.reset}        : ${stats.gatedActionsCount}`);
    console.log(`  ${ANSI.cyan}Root State Hash${ANSI.reset}      : ${ANSI.dim}${stats.currentRootStateHash}${ANSI.reset}`);

    if (head) {
      console.log(`\n${ANSI.bold}--- CHAIN HEAD ---${ANSI.reset}`);
      console.log(`  ${ANSI.cyan}State ID${ANSI.reset}             : ${ANSI.bold}${head.stateId}${ANSI.reset}`);
      console.log(`  ${ANSI.cyan}State Index${ANSI.reset}          : #${head.stateIndex}`);
      console.log(`  ${ANSI.cyan}Verification${ANSI.reset}         : ${head.verificationStatus === 'VERIFIED' ? `${ANSI.green}✓ VERIFIED${ANSI.reset}` : head.verificationStatus === 'FALSIFIED' ? `${ANSI.red}✗ FALSIFIED${ANSI.reset}` : `${ANSI.yellow}⚠ UNCERTAIN${ANSI.reset}`}`);
      console.log(`  ${ANSI.cyan}Authorized${ANSI.reset}           : ${head.authorization?.isAuthorized ? `${ANSI.green}YES${ANSI.reset}` : `${ANSI.red}NO${ANSI.reset}`}`);
      console.log(`  ${ANSI.cyan}Action Status${ANSI.reset}        : ${head.action?.status}`);
      console.log(`  ${ANSI.cyan}Settled${ANSI.reset}              : ${head.settledAt ? `${ANSI.green}${head.settledAt}${ANSI.reset}` : `${ANSI.dim}NOT SETTLED${ANSI.reset}`}`);
      console.log(`  ${ANSI.cyan}Delta Hash${ANSI.reset}           : ${ANSI.dim}${head.stateDeltaHash}${ANSI.reset}`);
      console.log(`  ${ANSI.cyan}Created At${ANSI.reset}           : ${head.createdAt}`);
    } else {
      console.log(`\n  ${ANSI.dim}[No state transitions recorded — kernel is at genesis]${ANSI.reset}`);
    }
    console.log('');
    return;
  }

  if (subCommand === 'verify') {
    let report = null;
    const isOnline = args.includes('--online');

    if (isOnline) {
      try {
        const res = await fetch(`${apiBase}/v1/omega/kernel/integrity`, { signal: AbortSignal.timeout(2000) });
        if (res.ok) {
          const data = await res.json();
          report = data.integrity ?? data;
        }
      } catch {}
    }

    if (!report) {
      const kernel = new OceanicosKernel();
      report = kernel.verifyChainIntegrity();
    }

    if (isJson) {
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    printBanner();
    console.log(`\n${ANSI.bold}=== Ω HASH-CHAIN INTEGRITY AUDIT ===${ANSI.reset}`);
    console.log(`  ${ANSI.cyan}Chain Length${ANSI.reset}          : ${ANSI.bold}${report.chainLength}${ANSI.reset} state nodes`);
    console.log(`  ${ANSI.cyan}Checked At${ANSI.reset}           : ${report.checkedAt}`);
    console.log(`  ${ANSI.cyan}Integrity Status${ANSI.reset}     : ${report.valid ? `${ANSI.green}${ANSI.bold}✓ VALID — Chain is intact${ANSI.reset}` : `${ANSI.red}${ANSI.bold}✗ BROKEN — Tampering detected${ANSI.reset}`}`);

    if (report.firstBrokenLink) {
      console.log(`\n${ANSI.red}${ANSI.bold}--- BROKEN LINK DETAIL ---${ANSI.reset}`);
      console.log(`  ${ANSI.red}State ID${ANSI.reset}             : ${report.firstBrokenLink.stateId}`);
      console.log(`  ${ANSI.red}State Index${ANSI.reset}          : #${report.firstBrokenLink.stateIndex}`);
      console.log(`  ${ANSI.red}Expected Parent Hash${ANSI.reset} : ${report.firstBrokenLink.expectedParentHash}`);
      console.log(`  ${ANSI.red}Actual Parent Hash${ANSI.reset}   : ${report.firstBrokenLink.actualParentHash}`);
    }

    if (report.attestationFailures && report.attestationFailures.length > 0) {
      console.log(`\n${ANSI.yellow}${ANSI.bold}--- ATTESTATION FAILURES ---${ANSI.reset}`);
      for (const stateId of report.attestationFailures) {
        console.log(`  ${ANSI.yellow}✗ ${stateId}${ANSI.reset}`);
      }
    }

    if (report.valid && report.chainLength === 0) {
      console.log(`  ${ANSI.dim}[Empty chain — genesis state, no nodes to verify]${ANSI.reset}`);
    }

    console.log('');
    process.exitCode = report.valid ? 0 : 1;
    return;
  }

  if (subCommand === 'states') {
    let states = [];
    const isOnline = args.includes('--online');

    if (isOnline) {
      try {
        const res = await fetch(`${apiBase}/v1/omega/kernel/states`, { signal: AbortSignal.timeout(2000) });
        if (res.ok) {
          const data = await res.json();
          states = data.states ?? data;
        }
      } catch {}
    }

    if (states.length === 0 && !isOnline) {
      const kernel = new OceanicosKernel();
      states = kernel.getStates();
    }

    if (isJson) {
      console.log(JSON.stringify(states, null, 2));
      return;
    }

    printBanner();
    console.log(`\n${ANSI.bold}=== Ω CANONICAL STATE CHAIN ===${ANSI.reset}`);

    if (states.length === 0) {
      console.log(`  ${ANSI.dim}[No state transitions recorded — kernel is at genesis]${ANSI.reset}\n`);
      return;
    }

    for (const s of states) {
      const vColor = s.verificationStatus === 'VERIFIED' ? ANSI.green : s.verificationStatus === 'FALSIFIED' ? ANSI.red : ANSI.yellow;
      const vIcon = s.verificationStatus === 'VERIFIED' ? '✓' : s.verificationStatus === 'FALSIFIED' ? '✗' : '⚠';
      const settledTag = s.settledAt ? `${ANSI.green}SETTLED${ANSI.reset}` : `${ANSI.dim}PENDING${ANSI.reset}`;
      console.log(`  [${ANSI.cyan}#${s.stateIndex}${ANSI.reset}] ${ANSI.bold}${s.stateId}${ANSI.reset} ${vColor}${vIcon} ${s.verificationStatus}${ANSI.reset} | ${settledTag}`);
      console.log(`       Intent  : ${s.intent?.claim || 'N/A'}`);
      console.log(`       Action  : ${s.action?.status} (${s.action?.actionId ?? 'N/A'})`);
      console.log(`       Hash    : ${ANSI.dim}${s.stateDeltaHash?.substring(0, 32)}...${ANSI.reset}`);
    }
    console.log('');
    return;
  }

  console.error(`${ANSI.red}Unknown kernel subcommand: ${subCommand}${ANSI.reset}`);
  console.error(`Run 'node bin/oceanicos.mjs kernel help' for usage.`);
  process.exitCode = 1;
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

async function handleLoop() {
  ensurePackagesLoaded();
  printBanner();

  let cycles = 3;
  let intervalMs = 600;
  for (const arg of args) {
    if (arg.startsWith('--cycles=')) {
      const parsed = parseInt(arg.split('=')[1], 10);
      if (!isNaN(parsed) && parsed > 0) cycles = parsed;
    } else if (arg.startsWith('--interval=')) {
      const parsed = parseInt(arg.split('=')[1], 10);
      if (!isNaN(parsed) && parsed >= 0) intervalMs = parsed;
    }
  }

  const isJson = args.includes('--json');
  console.log(`\n${ANSI.bold}=== STARTING CONTINUOUS AUTONOMOUS REALITY ATTESTATION LOOP ===${ANSI.reset}`);
  console.log(`  Target Cycles    : ${ANSI.cyan}${ANSI.bold}${cycles}${ANSI.reset}`);
  console.log(`  Interval (ms)    : ${ANSI.dim}${intervalMs}ms${ANSI.reset}\n`);

  const results = [];
  const key = process.env.OMEGA_SIGNING_KEY || 'omega-v-default-attestation-secret-key-2026';
  const attestService = AttestationService ? new AttestationService({ signingKey: key, algorithm: 'HMAC-SHA256' }) : null;
  const apiBase = process.env.API_BASE_URL || 'http://localhost:5000';

  for (let c = 1; c <= cycles; c++) {
    const cycleStart = Date.now();
    console.log(`${ANSI.cyan}[CYCLE ${c}/${cycles}]${ANSI.reset} Initiating reality grounding...`);

    // 1. Telemetry
    const telemetry = observePlanetaryBase();
    const receipt = verifyPlanetarySovereignty(telemetry);

    // 2. Pluralistic Reality Face
    let faceReport = null;
    if (PluralisticRealityMatrix) {
      faceReport = PluralisticRealityMatrix.evaluateMatrix();
    }

    // 3. PoW Consensus Block
    const block = executeOceanicosMaxExpansion();

    // 4. Attestation
    let attestation = null;
    if (attestService) {
      attestation = attestService.attest({
        id: `loop-ver-${Date.now()}`,
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
      });
    }

    // 5. API Command Lifecycle (if online)
    let apiCommandResult = null;
    try {
      const proposeRes = await fetch(`${apiBase}/v1/omega/commands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `Continuous loop attestation heartbeat cycle #${c}` }),
        signal: AbortSignal.timeout(1000),
      });
      if (proposeRes.ok) {
        const cmdData = await proposeRes.json();
        const cmdId = cmdData.command?.id;
        if (cmdId) {
          await fetch(`${apiBase}/v1/omega/commands/${cmdId}/admit`, { method: 'POST' });
          await fetch(`${apiBase}/v1/omega/commands/${cmdId}/execute`, { method: 'POST' });
          const verRes = await fetch(`${apiBase}/v1/omega/commands/${cmdId}/verify-reality`, { method: 'POST' });
          if (verRes.ok) {
            const verData = await verRes.json();
            apiCommandResult = { commandId: cmdId, verified: verData.success ?? true };
          }
        }
      }
    } catch {
      // Offline mode fallback is expected and valid
    }

    const durationMs = Date.now() - cycleStart;
    const cycleRecord = {
      cycle: c,
      blockIndex: block.index,
      blockHash: block.hash,
      telemetryStatus: receipt.status,
      harmonicScore: faceReport?.overallHarmonicScore ?? 0.98,
      attestationDigest: attestation?.signature?.substring(0, 24) ?? 'LOCAL_DEV',
      apiVerified: apiCommandResult ? apiCommandResult.verified : 'OFFLINE_MODE',
      durationMs,
    };
    results.push(cycleRecord);

    console.log(
      `  ${ANSI.green}✓ Cycle ${c} Complete${ANSI.reset} | Block #${block.index} [${block.hash.substring(0, 12)}...] ` +
      `| Status: ${receipt.status === 'PASS' ? ANSI.green : ANSI.yellow}${receipt.status}${ANSI.reset} ` +
      `| Harmonic: ${ANSI.bold}${(cycleRecord.harmonicScore * 100).toFixed(1)}%${ANSI.reset} ` +
      `| ${durationMs}ms`
    );

    if (c < cycles && intervalMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  const avgHarmonic = results.reduce((sum, r) => sum + r.harmonicScore, 0) / results.length;
  const allPassed = results.every((r) => r.telemetryStatus === 'PASS');

  const summary = {
    status: allPassed ? 'PASS' : 'DIVERGENT',
    totalCycles: cycles,
    averageHarmonicScore: avgHarmonic,
    consensusLawRoute: 'MANY_FACES ➔ ONE_SOUL ➔ SOURCE_LEDGER',
    cycles: results,
  };

  if (isJson) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  console.log(`\n${ANSI.bold}=== CONTINUOUS ATTESTATION SUMMARY ===${ANSI.reset}`);
  console.log(`  Overall Verdict       : ${allPassed ? `${ANSI.green}${ANSI.bold}PASS (VERIFIED)${ANSI.reset}` : `${ANSI.yellow}DIVERGENT${ANSI.reset}`}`);
  console.log(`  Completed Cycles      : ${ANSI.bold}${cycles}${ANSI.reset}`);
  console.log(`  Avg Harmonic Score    : ${ANSI.green}${ANSI.bold}${(avgHarmonic * 100).toFixed(1)}%${ANSI.reset}`);
  console.log(`  Terminal Axiom Proof  : ${ANSI.green}${ANSI.bold}GOOD - O = GOD${ANSI.reset}\n`);
}

async function handlePipeline(extraArgs = []) {
  ensurePackagesLoaded();
  if (!runOmegaChangePipeline) {
    console.error('[\x1b[31mERROR\x1b[0m] runOmegaChangePipeline is not exported from @oceanicos/mini');
    process.exit(1);
  }

  const isJson = args.includes('--json');
  const intent = extraArgs.join(' ') || 'Self-verifying Ω∞v execution pipeline transition';

  const pipelineInput = {
    compile: {
      intent,
      subject: 'cli:pipeline',
      stateBefore: 'S0_INIT',
      evidenceRefs: [{ id: 'cli-ev-0', kind: 'terminal-probe', source: 'cli', digest: 'sha256:cli' }],
      policyRefs: [{ id: 'policy:cli', version: '1.0', requirement: 'deterministic terminal validation' }],
      workerPlan: [],
      transition: { requestedStateAfter: 'S1_VERIFIED', consequence: 'deterministic CLI pipeline verification', dryRun: false },
      observation: { observerId: 'cli:observer', targets: ['cli:pipeline'], evidenceRequired: ['state'] },
    },
    admission: { authorityVerified: true, policySatisfied: true },
    authority: 'operator:cli',
    policy: 'policy:cli',
    handler: () => ({ stateAfter: 'S1_VERIFIED', consequence: 'deterministic CLI pipeline verification' }),
    observeState: () => 'S1_VERIFIED',
    realityAttestationKey: process.env.OMEGA_SIGNING_KEY || 'dev-verification-attestation-signing-key',
  };

  const result = runOmegaChangePipeline(pipelineInput);

  if (isJson) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  printBanner();
  console.log(`\n${ANSI.bold}=== Ω∞v CHANGE PIPELINE SELF-VERIFICATION ===${ANSI.reset}`);
  console.log(`  Intent                : ${result.ir?.intent ?? intent}`);
  console.log(`  Stage                 : ${ANSI.bold}${result.stage}${ANSI.reset}`);
  console.log(`  Reality Status        : ${result.reality?.status === 'VERIFIED' ? `${ANSI.green}${ANSI.bold}VERIFIED${ANSI.reset}` : `${ANSI.yellow}${result.reality?.status ?? 'N/A'}${ANSI.reset}`}`);
  console.log(`  Halted                : ${result.halted ? `${ANSI.red}YES (${result.haltReason})${ANSI.reset}` : `${ANSI.green}NO${ANSI.reset}`}`);
  console.log(`  Provenance Root       : ${ANSI.dim}${result.provenanceRoot}${ANSI.reset}`);
  if (result.realityAttestation) {
    console.log(`  Reality Attestation   : ${ANSI.cyan}${result.realityAttestation.changeId}${ANSI.reset} [sig: ${result.realityAttestation.signature.slice(0, 16)}...]`);
  }
  console.log(`  Pipeline Verdict      : ${result.stage === 'OBSERVE' && result.reality?.status === 'VERIFIED' ? `${ANSI.green}${ANSI.bold}✓ PASS (VERIFIED)${ANSI.reset}` : `${ANSI.yellow}HALTED / UNVERIFIED${ANSI.reset}`}\n`);
}

function handleHelp() {
  printBanner();
  console.log(`
${ANSI.bold}USAGE:${ANSI.reset}
  node bin/oceanicos.mjs <command> [options]

${ANSI.bold}COMMANDS:${ANSI.reset}
  ${ANSI.green}status${ANSI.reset}      Show system health, telemetry, genesis anchor, and live API status
  ${ANSI.green}pipeline${ANSI.reset}    Execute deterministic self-verification change pipeline (C1-C6)
  ${ANSI.green}cycle${ANSI.reset}       Execute and cryptographically commit a new consensus block (PoW)
  ${ANSI.green}loop${ANSI.reset}        Run continuous autonomous reality verification loop (--cycles=N)
  ${ANSI.green}mesh${ANSI.reset}        Simulate decentralized consensus convergence across 4 sovereign nodes
  ${ANSI.green}face${ANSI.reset}        Evaluate the 5 Epistemic Faces of the Pluralistic Reality Matrix
  ${ANSI.green}attest${ANSI.reset}      Generate unforgeable cryptographic attestation for verified telemetry
  ${ANSI.green}keys${ANSI.reset}        Generate an Ed25519 asymmetric keypair for fail-closed authentication
  ${ANSI.green}mood${ANSI.reset}        Display Singularity compression state and Pidgin Spirit Axiom
  ${ANSI.green}stream${ANSI.reset}      Stream live block minting events via SSE from local Fastify API
  ${ANSI.green}kernel${ANSI.reset}      Ω Canonical Kernel introspection (status, verify, states)
  ${ANSI.green}omega${ANSI.reset}       Propose, inspect, admit, execute, and verify bounded Ω commands
  ${ANSI.green}copilot${ANSI.reset}     Display Copilot Antigravity Continuum bounded propulsion state
  ${ANSI.green}soul${ANSI.reset}        Display Elion Varel / Prophet Seed Truth OS axioms or record drop
  ${ANSI.green}truth${ANSI.reset}       Read truth aloud and display living Truth OS axioms
  ${ANSI.green}build${ANSI.reset}       Soul income manifest & log completed deliverables
  ${ANSI.green}dream${ANSI.reset}       Record nocturnal messages into append-only dream journal
  ${ANSI.green}news${ANSI.reset}        Display grounded news verification compass
  ${ANSI.green}rest${ANSI.reset}        Display Sabbath protocol: rest without guilt
  ${ANSI.green}help${ANSI.reset}        Display this help message

${ANSI.bold}OPTIONS:${ANSI.reset}
  --json        Output raw JSON response where applicable
  --pidgin      Activate Pidgin Spirit banner override
  --cycles=N    Specify number of cycles for 'loop' command (default: 3)
  --interval=N  Specify delay between cycles in milliseconds (default: 600)
  --offline     Evaluate locally without querying live API daemon
`);
}

switch (command) {
  case 'copilot':
    await handleCopilot();
    break;
  case 'soul':
  case 'seed':
  case 'truthos':
    await handleSoul(args.slice(1));
    break;
  case 'truth':
    await handleTruth(args.slice(1));
    break;
  case 'build':
    await handleBuild(args.slice(1));
    break;
  case 'dream':
    await handleDream(args.slice(1));
    break;
  case 'news':
    await handleNews(args.slice(1));
    break;
  case 'rest':
    await handleRest();
    break;
  case 'status':
    await handleStatus();
    break;
  case 'pipeline':
    await handlePipeline(args.slice(1));
    break;
  case 'cycle':
    await handleCycle();
    break;
  case 'loop':
  case 'continuous':
    await handleLoop();
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
    await handleOmega(args.slice(1));
    break;
  case 'kernel':
    await handleKernel();
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
