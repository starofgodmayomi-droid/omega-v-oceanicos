import { Observer } from '@omega-v/observer';
import { VerificationEngine } from '@omega-v/verification';
import { AttestationService } from '@omega-v/attestation';
import { ProvenanceStore } from '@omega-v/store';
import { RuleCompiler } from '@omega-v/compiler';
import { OceanicumVM } from '@omega-v/ir';
import { OceanicosClient } from '@omega-v/sdk';
import { FormlessSwarm } from '@omega-v/agents';
import { OceanicosCLI } from '@omega-v/cli';
import { EdgeObserver } from '@omega-v/edge';
import { VerificationAnalyticsEngine } from '@omega-v/analytics';
import { VerificationScheduler } from '@omega-v/scheduler';
import { TelemetryTracer, VerificationSLOEngine } from '@omega-v/telemetry';
import { VaaSGate } from '@omega-v/vaas';
import { VerificationReplayEngine } from '@omega-v/replay';
import { FormalContractEngine } from '@omega-v/contract';
import { OceanicosAuthEngine } from '@omega-v/auth';
import { FederationMeshEngine } from '@omega-v/federation';
import { VerificationBenchmarkEngine } from '@omega-v/benchmark';
import { OceanicosNotaryEngine } from '@omega-v/notary';
import { OceanicosSandboxEngine } from '@omega-v/sandbox';
import { OceanicosPolicyEngine } from '@omega-v/policy';
import { OceanicosZKEngine } from '@omega-v/zk';
import { OceanicosGatewayEngine } from '@omega-v/gateway';
import { OceanicosWebhookEngine } from '@omega-v/webhook';
import { OceanicosOracleEngine } from '@omega-v/oracle';
import { OceanicosStateVault } from '@omega-v/vault';
import { OceanicosDisputeEngine } from '@omega-v/dispute';
import { OceanicosWorkerPool } from '@omega-v/worker';
import { OceanicosPipelineEngine } from '@omega-v/pipeline';
import { OceanicosRegistryEngine } from '@omega-v/registry';
import { OceanicosEnclaveEngine } from '@omega-v/enclave';
import { OceanicosConsensusEngine } from '@omega-v/consensus';
import { OceanicosMeshEngine } from '@omega-v/mesh';
import { OceanicosShardingEngine } from '@omega-v/sharding';
import { OceanicosBridgeEngine } from '@omega-v/bridge';
import { OceanicosSequencerEngine } from '@omega-v/sequencer';
import { OceanicosDAEngine } from '@omega-v/da';
import { OceanicosRollupEngine } from '@omega-v/rollup';
import { OceanicosIntentEngine } from '@omega-v/intent';
import { OceanicosOrchestratorEngine } from '@omega-v/orchestrator';
import { OceanicosDHTEngine } from '@omega-v/dht';
import { OceanicosStakingEngine } from '@omega-v/staking';
import { OceanicosKernel } from '@omega-v/kernel';
import { OceanicosMempoolEngine } from '@omega-v/mempool';
import { OceanicosThresholdAttestorEngine } from '@omega-v/attestor';
import { OceanicosGovernorEngine } from '@omega-v/governor';
import { OceanicosRelayEngine } from '@omega-v/relay';
import { OceanicosVirtualMachine } from '@omega-v/evm';
import { OceanicosAMMEngine } from '@omega-v/amm';
import { OceanicosReputationEngine } from '@omega-v/reputation';
import { HumanEngine } from '@omega-v/human';
import app from '../../apps/api/src/index';

describe('Ω∞v Oceanicos — Full Stack End-to-End Verification Suite', () => {
  let store: ProvenanceStore;
  let sdk: OceanicosClient;
  let cli: OceanicosCLI;

  beforeEach(() => {
    store = new ProvenanceStore();
    sdk = new OceanicosClient({ mode: 'local' });
    cli = new OceanicosCLI(sdk);
  });

  describe('1. Compiler & IR VM Stack', () => {
    it('should compile rule string to IR bytecode program and execute on OceanicumVM', () => {
      const compiler = new RuleCompiler();
      const vm = new OceanicumVM();

      const program = compiler.compile('cpu-load-check', 'cpuUsage < 80 && memUsage < 90');
      expect(program.instructions.length).toBeGreaterThan(5);

      const vmResult = vm.execute(program, {
        metadata: { cpuUsage: 45, memUsage: 60 },
      });

      expect(vmResult.passed).toBe(true);
      expect(vmResult.stackTop).toBe(true);
      expect(vmResult.steps.length).toBeGreaterThan(0);
    });
  });

  describe('2. Cryptographic Provenance Ledger Integrity', () => {
    it('should maintain unbroken hash-chain across observation, verification, and attestation', () => {
      const observer = new Observer();
      const verificationEngine = new VerificationEngine();
      const attestationService = new AttestationService();

      verificationEngine.registerRule({
        name: 'e2e-rule',
        version: '1.0.0',
        appliesTo: ['e2e-check'],
        definition: 'latency < 50',
        description: 'End-to-end latency check',
        createdAt: new Date().toISOString(),
        active: true,
      });

      // Step 1: Observe
      const obs = observer.observe({
        claim: 'End-to-end pipeline check',
        category: 'e2e-check',
        source: { system: 'e2e-runner', version: '1.0.0', environment: 'testing' },
        observedBy: 'e2e-test',
        metadata: { latency: 22 },
        confidence: 0.99,
        confidenceReason: 'Verified by automated runner',
      });
      const entry1 = store.recordObservation(obs);

      // Step 2: Verify
      const ver = verificationEngine.verify(obs);
      const entry2 = store.recordVerification(ver);

      // Step 3: Attest
      const att = attestationService.attest(ver);
      const entry3 = store.recordAttestation(att);

      // Check entries
      expect(entry1.previousHash).toBe(ProvenanceStore.GENESIS_HASH);
      expect(entry2.previousHash).toBe(entry1.hash);
      expect(entry3.previousHash).toBe(entry2.hash);

      // Verify overall chain integrity
      const integrity = store.verifyChainIntegrity();
      expect(integrity.valid).toBe(true);
    });
  });

  describe('3. Formless Agent Swarm (6-Agent Cycle)', () => {
    it('should orchestrate 6 agents (Observer, Verifier, Security, Governance, Learning, Human) in harmony', async () => {
      const swarm = new FormlessSwarm(sdk);
      const swarmResult = await swarm.executeSwarmCycle({
        claim: 'Swarm E2E Test Claim',
        ruleName: 'swarm-e2e-rule',
        ruleDefinition: 'responseTime < 100',
        metadata: { responseTime: 25 },
      });

      expect(swarmResult.success).toBe(true);
      expect(swarmResult.agentResults).toHaveLength(6);

      const roles = swarmResult.agentResults.map((a) => a.agentRole);
      expect(roles).toEqual([
        'Observer',
        'Verifier',
        'Security',
        'Governance',
        'Learning',
        'Human',
      ]);
    });
  });

  describe('4. Oceanicos CLI Commands', () => {
    it('should execute omega-v loop, swarm, metrics, log, and integrity via CLI', async () => {
      const swarmRes = await cli.run(['swarm', 'CLI Swarm Claim']);
      expect(swarmRes.success).toBe(true);
      expect(swarmRes.output).toHaveProperty('agentsCount', 6);

      const metricsRes = await cli.run(['metrics']);
      expect(metricsRes.success).toBe(true);

      const logRes = await cli.run(['log']);
      expect(logRes.success).toBe(true);

      const integrityRes = await cli.run(['integrity']);
      expect(integrityRes.success).toBe(true);
      expect(integrityRes.message).toContain('VALID');
    });
  });

  describe('5. Edge Observer & Merkle Batch Ingestion', () => {
    it('should buffer edge observations, compute Merkle root, and flush batch', async () => {
      const edge = new EdgeObserver({
        nodeId: 'e2e-edge-node-1',
        environment: 'e2e-field',
      });

      edge.capture('Edge E2E Claim 1', 'edge-e2e');
      edge.capture('Edge E2E Claim 2', 'edge-e2e');

      expect(edge.getBufferSize()).toBe(2);

      const merkleRoot = edge.computeMerkleRoot();
      expect(merkleRoot).toMatch(/^0x[a-f0-9]{64}$/);

      const flushRes = await edge.flush(async (batch) => {
        expect(batch.observations).toHaveLength(2);
        expect(batch.merkleRoot).toBe(merkleRoot);
        return true;
      });

      expect(flushRes.success).toBe(true);
      expect(flushRes.syncedCount).toBe(2);
      expect(edge.getBufferSize()).toBe(0);
    });
  });

  describe('6. Express REST API Integration', () => {
    it('should export defined Express API application handler', () => {
      expect(app).toBeDefined();
      expect(typeof app).toBe('function');
    });
  });

  describe('7. Verification Analytics Engine E2E', () => {
    it('should compute rule efficacy and adaptation proposals over real provenance log', async () => {
      // Generate 3 real verification loop entries so analytics has data to analyze
      for (let i = 0; i < 3; i++) {
        await sdk.runLoop({ claim: `E2E Analytics Claim ${i}` });
      }

      const events = sdk.getLogEntries();
      const verificationEvents = events.filter((e) => e.type === 'VERIFICATION');
      expect(verificationEvents.length).toBeGreaterThanOrEqual(3);

      const analyticsEngine = new VerificationAnalyticsEngine();
      const summary = analyticsEngine.analyzeLogs(events);

      expect(summary.totalEvents).toBeGreaterThan(0);
      expect(summary.totalVerifications).toBeGreaterThanOrEqual(3);
      expect(summary.overallPassRate).toBeGreaterThanOrEqual(0);
      expect(summary.overallPassRate).toBeLessThanOrEqual(1);
      expect(summary.avgConfidence).toBeGreaterThan(0);
      expect(typeof summary.analyzedAt).toBe('string');

      // Use a fresh VerificationEngine to get rule definitions
      const localVE = new VerificationEngine();
      const rules = localVE.getRules();
      const proposals = analyticsEngine.generateAdaptationProposals(summary, rules);
      expect(Array.isArray(proposals)).toBe(true);
    });
  });

  describe('8. Autonomous Verification Scheduler E2E', () => {
    it('should autonomously drive the verification loop on a schedule', async () => {
      let runCallbackTriggered = false;
      const scheduler = new VerificationScheduler(sdk, {
        intervalMs: 50,
        claim: 'Autonomous E2E Scheduled Claim',
        maxRuns: 2,
        onRun: (res) => {
          runCallbackTriggered = true;
          expect(res.passed).toBe(true);
          expect(res.signature).toBeDefined();
        },
      });

      scheduler.start();
      expect(scheduler.getState().status).toBe('RUNNING');

      // Wait for at least 1 run to execute
      await new Promise<void>((resolve) => setTimeout(resolve, 150));
      scheduler.stop();

      const state = scheduler.getState();
      expect(state.status).toBe('STOPPED');
      expect(state.totalRuns).toBeGreaterThanOrEqual(1);
      expect(state.passedRuns).toBeGreaterThanOrEqual(1);
      expect(state.lastRunAt).toBeDefined();
      expect(runCallbackTriggered).toBe(true);
    });
  });

  describe('9. Distributed Telemetry & SLO Engine E2E', () => {
    it('should generate W3C traceparent headers and evaluate verification SLO error budget', () => {
      const tracer = new TelemetryTracer();
      const parentSpan = tracer.startSpan('e2e-root-span', undefined, { suite: 'fullstack' });
      const context = { traceId: parentSpan.traceId, spanId: parentSpan.spanId, traceFlags: 1 };
      const traceparent = tracer.injectTraceparent(context);

      expect(traceparent).toMatch(/^00-[a-f0-9]{32}-[a-f0-9]{16}-01$/);

      const extracted = tracer.extractTraceparent(traceparent);
      expect(extracted).not.toBeNull();

      const childSpan = tracer.startSpan('e2e-child-span', extracted || undefined);
      tracer.endSpan(childSpan, 'OK');
      tracer.endSpan(parentSpan, 'OK');

      expect(tracer.getSpans()).toHaveLength(2);

      const metrics = sdk.getMetrics();
      const sloEngine = new VerificationSLOEngine();
      const evaluation = sloEngine.evaluateSLO(metrics, 0.99);

      expect(evaluation.targetPassRate).toBe(0.99);
      expect(evaluation.errorBudgetRemaining).toBeGreaterThanOrEqual(0);
      expect(typeof evaluation.evaluatedAt).toBe('string');
    });
  });

  describe('10. Multi-Tenant VaaS Gateway E2E', () => {
    it('should register tenant, enforce quotas, and execute authenticated verification', async () => {
      const vaas = new VaaSGate();
      const creds = vaas.registerTenant('E2E Cloud Corp', 'PRO', 50);

      expect(creds.tenant.name).toBe('E2E Cloud Corp');
      expect(creds.apiKey).toMatch(/^vaas_pro_/);

      const auth = vaas.authenticate(creds.apiKey);
      expect(auth?.tenantId).toBe(creds.tenant.id);

      const result = await vaas.executeVerification(
        creds.apiKey,
        sdk,
        'E2E Multi-Tenant SLA Observation',
        { complianceStandard: 'SOC2-Type-II' }
      );

      expect(result.tenantId).toBe(creds.tenant.id);
      expect(result.verification.summary.passed).toBe(true);
      expect(result.attestation.signature).toBeDefined();

      const rate = vaas.checkRateLimit(creds.tenant.id);
      expect(rate.allowed).toBe(true);
      expect(rate.remaining).toBeLessThan(50);
    });
  });

  describe('11. Verification Replay Engine E2E', () => {
    it('should capture, diff, and replay verification snapshots with regression detection', async () => {
      const replayEngine = new VerificationReplayEngine();

      // Capture two snapshots from different claims
      const resultA = await sdk.runLoop({
        claim: 'E2E Replay Baseline Alpha',
        category: 'e2e-replay',
        observedBy: 'e2e-test',
        sourceSystem: 'jest',
      });

      const resultB = await sdk.runLoop({
        claim: 'E2E Replay Baseline Beta',
        category: 'e2e-replay',
        observedBy: 'e2e-test',
        sourceSystem: 'jest',
      });

      const snapA = replayEngine.capture('E2E Replay Baseline Alpha', resultA, 'Alpha', ['e2e']);
      const snapB = replayEngine.capture('E2E Replay Baseline Beta', resultB, 'Beta', ['e2e']);

      expect(snapA.fingerprint).toHaveLength(64);
      expect(snapB.fingerprint).toHaveLength(64);
      expect(snapA.status).toBe('CAPTURED');

      // Diff them
      const diff = replayEngine.diff(snapA.id, snapB.id);
      expect(diff.snapshotA).toBe(snapA.id);
      expect(diff.snapshotB).toBe(snapB.id);
      expect(diff.regressionDetected).toBe(false); // both should pass
      expect(diff.changes.length).toBeGreaterThanOrEqual(1); // at least signature diff

      // Replay snapshot A
      const replayResult = await replayEngine.replay(snapA.id, sdk);
      expect(replayResult.original.id).toBe(snapA.id);
      expect(replayResult.replayed.tags).toContain('replay');
      expect(replayResult.diff.regressionDetected).toBe(false);
      expect(replayResult.durationMs).toBeGreaterThanOrEqual(0);

      // Query
      expect(replayEngine.getSnapshots().length).toBeGreaterThanOrEqual(3); // A, B, replayed
      expect(replayEngine.getSnapshotsByTag('e2e')).toHaveLength(3); // A, B, and replayed (inherits tags)
      expect(replayEngine.getSnapshotsByTag('replay')).toHaveLength(1);

      const summary = replayEngine.getSummary();
      expect(summary.totalSnapshots).toBeGreaterThanOrEqual(3);
      expect(summary.totalReplays).toBe(1);
      expect(summary.tags).toContain('e2e');
      expect(summary.tags).toContain('replay');
    });
  });

  describe('12. Formal Schema & Behavioral Contract Engine E2E', () => {
    it('should register contracts, verify valid payloads, flag schema violations, and test compatibility', () => {
      const contractEngine = new FormalContractEngine();

      // Verify canonical observation contract
      const validObs = contractEngine.verify(
        {
          claim: 'E2E Contract Formal Verification Claim',
          category: 'e2e-contract',
          observedBy: 'e2e-observer',
          confidence: 0.99,
        },
        'canonical-observation-contract'
      );

      expect(validObs.valid).toBe(true);
      expect(validObs.violations).toHaveLength(0);
      expect(validObs.fieldsEvaluated).toBe(4);
      expect(validObs.invariantsEvaluated).toBe(2);

      // Verify health SLA contract violation
      const violatedSLA = contractEngine.verify(
        {
          responseTime: 450, // exceeds SLA invariant < 200ms
          statusCode: 200,
        },
        'health-sla-contract'
      );

      expect(violatedSLA.valid).toBe(false);
      expect(violatedSLA.violations.some((v) => v.invariant === 'low-latency-sla')).toBe(true);

      // Register new custom contract
      const customContract = contractEngine.registerContract({
        name: 'e2e-settlement-contract',
        version: '1.0.0',
        category: 'e2e',
        description: 'E2E test settlement contract',
        fields: {
          txId: { type: 'string', required: true, min: 5 },
          amount: { type: 'number', required: true, min: 1 },
        },
        invariants: [
          {
            name: 'non-zero-amount',
            kind: 'PRECONDITION',
            description: 'Amount must be greater than zero',
            expression: 'amount > 0',
          },
        ],
        active: true,
      });

      expect(contractEngine.getContract('e2e-settlement-contract')?.id).toBe(customContract.id);

      // Test compatibility check
      const compatibleUpdate = {
        ...customContract,
        version: '1.1.0',
        fields: {
          ...customContract.fields,
          notes: { type: 'string' as const, required: false },
        },
      };

      const compat = contractEngine.checkCompatibility(customContract, compatibleUpdate);
      expect(compat.compatible).toBe(true);
      expect(compat.breakingChanges).toHaveLength(0);
    });
  });

  describe('13. Decentralized Identity (DID) & Capability Auth E2E', () => {
    it('should create DIDs, issue cryptographic tokens, enforce capabilities, and test key rotation', () => {
      const auth = new OceanicosAuthEngine();

      // Verify system bootstrap
      expect(auth.getIdentity('did:omega:system:root')?.type).toBe('SYSTEM');
      expect(auth.getIdentity('did:omega:verifier:core')?.type).toBe('VERIFIER');

      // Create new agent DID
      const agentId = auth.createIdentity('AGENT', ['observe:write', 'verify:execute']);
      expect(agentId.did).toMatch(/^did:omega:agent:/);
      expect(agentId.document.capabilities).toContain('observe:write');

      // Issue token
      const token = auth.issueToken(agentId.did, agentId.secret);
      expect(token).toMatch(/^Ω∞v-TOKEN-v1\./);

      // Verify valid token with permitted capability
      const allowed = auth.verifyToken(token, 'observe:write');
      expect(allowed.valid).toBe(true);
      expect(allowed.subject?.did).toBe(agentId.did);

      // Deny token with unpermitted capability
      const denied = auth.verifyToken(token, 'attest:sign');
      expect(denied.valid).toBe(false);
      expect(denied.error).toContain('Insufficient capabilities');

      // Test key rotation
      const newSecret = auth.rotateSecret(agentId.did, agentId.secret);
      expect(newSecret).not.toBe(agentId.secret);
      expect(auth.getIdentity(agentId.did)?.epoch).toBe(2);

      // New token with rotated secret
      const newToken = auth.issueToken(agentId.did, newSecret);
      expect(auth.verifyToken(newToken).valid).toBe(true);
    });
  });

  describe('14. Cross-Mesh Inter-Cluster Verification Federation E2E', () => {
    it('should register peers, export cross-cluster proof, verify remote proof, and calculate mesh summary', async () => {
      const mesh = new FederationMeshEngine('cluster-e2e-primary');

      // Check default bootstrap peers
      expect(mesh.getPeers().length).toBeGreaterThanOrEqual(2);

      // Register new peer
      const peer = mesh.registerPeer({
        clusterName: 'Ω∞v-AP-Singapore-Cluster',
        endpoint: 'https://ap-singapore.omega-v.network',
        publicKey: '0x04e1239847aefb374928174628a89f72b94e823c1',
        trustScore: 0.98,
      });

      expect(peer.clusterName).toBe('Ω∞v-AP-Singapore-Cluster');

      // Export proof from local verification result
      const loopResult = await sdk.runLoop({
        claim: 'Cross-Cluster Inter-Mesh Federation E2E Claim',
        category: 'e2e-mesh',
      });

      const proof = mesh.exportProof(
        'Cross-Cluster Inter-Mesh Federation E2E Claim',
        loopResult,
        'Ω∞v-AP-Singapore-Cluster'
      );

      expect(proof.proofId).toMatch(/^proof-mesh-/);
      expect(proof.originCluster).toBe('cluster-e2e-primary');
      expect(proof.targetCluster).toBe('Ω∞v-AP-Singapore-Cluster');
      expect(proof.verificationMerkleRoot).toHaveLength(64);
      expect(proof.attestationSignature).toMatch(/^0x/);

      // Verify remote proof
      const remoteVerification = mesh.verifyRemoteProof(proof);
      expect(remoteVerification.valid).toBe(true);
      expect(remoteVerification.trustScore).toBeGreaterThan(0);

      // Verify summary
      const summary = mesh.getMeshSummary();
      expect(summary.totalPeers).toBeGreaterThanOrEqual(3);
      expect(summary.totalProofsExchanged).toBeGreaterThanOrEqual(1);
    });
  });

  describe('15. Verification Micro-Benchmark & Latency Quantile Profiling E2E', () => {
    it('should profile loop execution, rule evaluation, and calculate P50/P90/P99 latency quantiles', async () => {
      const benchmark = new VerificationBenchmarkEngine();

      const results = await benchmark.runSuite(sdk, 5);

      expect(results.loop).toBeDefined();
      expect(results.loop.iterations).toBe(5);
      expect(results.loop.throughputOpsSec).toBeGreaterThan(0);
      expect(results.loop.latency.p50Ms).toBeGreaterThanOrEqual(0);
      expect(results.loop.latency.p90Ms).toBeGreaterThanOrEqual(results.loop.latency.p50Ms);
      expect(results.loop.latency.p99Ms).toBeGreaterThanOrEqual(results.loop.latency.p90Ms);

      expect(results.rules.throughputOpsSec).toBeGreaterThan(0);
      expect(results.attestation.throughputOpsSec).toBeGreaterThan(0);
      expect(results.store.throughputOpsSec).toBeGreaterThan(0);

      const cached = benchmark.getLatestResults();
      expect(Object.keys(cached).length).toBe(4);
    });
  });

  describe('16. Merkle Transparency Log & Cryptographic Notarization E2E', () => {
    it('should anchor verification attestation, compute Merkle root, and verify RFC-6962 inclusion proof', async () => {
      const notary = new OceanicosNotaryEngine();

      // Loop execution
      const loopResult = await sdk.runLoop({
        claim: 'Notary Merkle Transparency Log E2E Claim',
        category: 'e2e-notary',
      });

      // Anchor attestation
      const seal = notary.anchorAttestation(loopResult.attestation);
      expect(seal.sealId).toMatch(/^seal-/);
      expect(seal.leafIndex).toBe(1);
      expect(seal.leafHash).toHaveLength(64);
      expect(seal.merkleRoot).toHaveLength(64);
      expect(seal.notarySignature).toMatch(/^0x/);

      // Generate & verify inclusion proof
      const proof = notary.generateInclusionProof(1);
      expect(proof.leafIndex).toBe(1);
      expect(proof.merkleRoot).toBe(notary.getMerkleRoot());
      expect(notary.verifyInclusionProof(proof)).toBe(true);

      // Verify summary
      const summary = notary.getSummary();
      expect(summary.totalSeals).toBeGreaterThanOrEqual(2);
      expect(summary.treeSize).toBeGreaterThanOrEqual(2);
    });
  });

  describe('17. Isolated Deterministic Sandbox & Watchdog Profiling E2E', () => {
    it('should safely execute benign verification expressions, block forbidden tokens, and track stats', () => {
      const sandbox = new OceanicosSandboxEngine();

      // Safe execution
      const benignRes = sandbox.executeExpression('responseTime < 50 && statusCode === 200', {
        responseTime: 25,
        statusCode: 200,
      });
      expect(benignRes.success).toBe(true);
      expect(benignRes.result).toBe(true);
      expect(benignRes.gasConsumed).toBeGreaterThan(0);

      // Block dangerous identifier
      const maliciousRes = sandbox.executeExpression('process.exit(1)', {});
      expect(maliciousRes.success).toBe(false);
      expect(maliciousRes.violation).toBe('FORBIDDEN_IDENTIFIER');

      // Check stats
      const stats = sandbox.getStats();
      expect(stats.totalRuns).toBe(2);
      expect(stats.successfulRuns).toBe(1);
      expect(stats.violationsBlocked).toBe(1);
    });
  });

  describe('18. Declarative Policy Bundles & Compliance Receipts E2E', () => {
    it('should evaluate production contexts against policy rules and issue signed receipts', () => {
      const policyEngine = new OceanicosPolicyEngine();

      // Ensure canonical policies are available
      const policies = policyEngine.getPolicies();
      expect(policies.length).toBeGreaterThanOrEqual(2);

      // Evaluate compliant context against enterprise SLA policy
      const compliantCtx = {
        confidence: 0.98,
        metadata: { responseTime: 22, region: 'us-east-1' },
        source: { environment: 'production' },
      };

      const receipt = policyEngine.evaluate('enterprise-sla-policy', compliantCtx);
      expect(receipt.receiptId).toMatch(/^receipt-pol-/);
      expect(receipt.compliant).toBe(true);
      expect(receipt.passedRules).toBe(3);
      expect(receipt.failedRules).toBe(0);
      expect(receipt.signature).toMatch(/^0x/);

      // Evaluate non-compliant context
      const nonCompliantCtx = {
        confidence: 0.8, // Fails < 0.90
        metadata: { responseTime: 250 }, // Fails > 100
        source: { environment: 'dev' }, // Fails not in production/staging
      };
      const failReceipt = policyEngine.evaluate('enterprise-sla-policy', nonCompliantCtx);
      expect(failReceipt.compliant).toBe(false);
      expect(failReceipt.failedRules).toBe(3);
    });
  });

  describe('19. Zero-Knowledge Succinct Privacy Proofs & Verifier E2E', () => {
    it('should generate and verify succinct ZK range and membership proofs without revealing secret witnesses', () => {
      const zkEngine = new OceanicosZKEngine();

      // Ensure circuits exist
      const circuits = zkEngine.getCircuits();
      expect(circuits.length).toBeGreaterThanOrEqual(3);

      // Generate Range proof (Secret confidence = 0.98, proven >= 0.90)
      const secretConfidence = 0.98;
      const rangeProof = zkEngine.generateRangeProof('circuit-confidence-range', secretConfidence);

      expect(rangeProof.proofId).toMatch(/^zkproof-/);
      expect(rangeProof.commitment).toHaveLength(64);
      expect(rangeProof.proofToken).toMatch(/^0x/);

      // Verify Range proof
      const rangeVerification = zkEngine.verifyProof(rangeProof);
      expect(rangeVerification.valid).toBe(true);

      // Generate Membership proof (Secret region = 'us-east-1')
      const memberProof = zkEngine.generateMembershipProof(
        'circuit-authorized-region',
        'us-east-1'
      );
      expect(memberProof.circuitType).toBe('MEMBERSHIP');

      // Verify Membership proof
      const memberVerification = zkEngine.verifyProof(memberProof);
      expect(memberVerification.valid).toBe(true);

      // Tampered proof detection
      const tamperedProof = { ...memberProof, commitment: 'f'.repeat(64) };
      expect(zkEngine.verifyProof(tamperedProof).valid).toBe(false);
    });
  });

  describe('20. Adaptive Gateway, Rate Limiting & Anomaly Defense E2E', () => {
    it('should throttle abusive traffic, detect replay attacks, and track gateway stats', () => {
      const gateway = new OceanicosGatewayEngine();

      // Register test clients
      gateway.registerClient('tenant-free', 'FREE');
      gateway.registerClient('tenant-pro', 'PRO');

      // Normal traffic within limit
      const decision1 = gateway.processRequest('tenant-free');
      expect(decision1.allowed).toBe(true);
      expect(decision1.remainingRequests).toBe(29);

      // Request signing & anti-replay
      const signedReq = gateway.signRequest('tenant-pro', 'verify:payload:data');
      const verifyResult1 = gateway.verifySignedRequest(signedReq);
      expect(verifyResult1.valid).toBe(true);

      // Replay attack attempt
      const replayResult = gateway.verifySignedRequest(signedReq);
      expect(replayResult.valid).toBe(false);
      expect(replayResult.reason).toContain('Replay attack');

      // Exhaust rate limit for FREE tenant
      for (let i = 0; i < 29; i++) {
        gateway.processRequest('tenant-free');
      }
      const throttledDecision = gateway.processRequest('tenant-free');
      expect(throttledDecision.allowed).toBe(false);
      expect(throttledDecision.retryAfterMs).toBeGreaterThan(0);

      // Verify anomalies & stats
      const anomalies = gateway.getAnomalies();
      expect(anomalies.length).toBeGreaterThanOrEqual(2); // REPLAY_ATTACK + RATE_SPIKE
      const stats = gateway.getStats();
      expect(stats.blockedRequests).toBeGreaterThanOrEqual(1);
    });
  });

  describe('21. Real-Time Webhooks & Push Attestation Delivery E2E', () => {
    it('should dispatch signed HMAC verification events, manage subscriptions, and record delivery receipts', async () => {
      const webhookEngine = new OceanicosWebhookEngine();

      // Bootstrap check
      const subs = webhookEngine.getSubscriptions();
      expect(subs.length).toBeGreaterThanOrEqual(2);

      // Register new custom webhook
      const customSub = webhookEngine.registerSubscription({
        id: 'sub-e2e-listener',
        name: 'E2E Test Listener',
        url: 'https://e2e.oceanicos.internal/hook',
        events: ['ATTESTATION_CREATED', 'POLICY_VIOLATED'],
        secret: 'whsec_e2e_secret_test_123',
      });
      expect(customSub.id).toBe('sub-e2e-listener');

      // Dispatch event
      const attempts = await webhookEngine.dispatchEvent('ATTESTATION_CREATED', {
        claim: 'system-uptime > 99.99%',
        attestedBy: 'Ω∞v-Primary-Attestor',
        confidence: 0.999,
      });

      expect(attempts.length).toBeGreaterThanOrEqual(2);
      expect(attempts.some((a) => a.subscriptionId === 'sub-e2e-listener')).toBe(true);

      // Verify HMAC signature
      const attempt = attempts.find((a) => a.subscriptionId === 'sub-e2e-listener')!;
      expect(attempt.signature).toMatch(/^sha256=[a-f0-9]{64}$/);
      expect(attempt.status).toBe('SUCCESS');

      // Delivery history & stats
      const history = webhookEngine.getDeliveryHistory();
      expect(history.length).toBeGreaterThanOrEqual(2);
      const stats = webhookEngine.getStats();
      expect(stats.successfulDeliveries).toBeGreaterThanOrEqual(2);
      expect(stats.successRate).toBe(100);
    });
  });

  describe('22. Multi-Source Consensus Oracle & External State Verification E2E', () => {
    it('should aggregate multi-provider reports, compute median/majority quorum, and generate cryptographically signed receipts', () => {
      const oracle = new OceanicosOracleEngine();

      // Ensure feeds exist
      const feeds = oracle.getFeeds();
      expect(feeds.length).toBeGreaterThanOrEqual(2);

      // Median aggregation
      const ethReports = [
        {
          providerId: 'prov-node-alpha',
          feedId: 'feed-eth-usd',
          value: 3250,
          timestamp: new Date().toISOString(),
          signature: 's1',
        },
        {
          providerId: 'prov-node-beta',
          feedId: 'feed-eth-usd',
          value: 3260,
          timestamp: new Date().toISOString(),
          signature: 's2',
        },
        {
          providerId: 'prov-node-gamma',
          feedId: 'feed-eth-usd',
          value: 3240,
          timestamp: new Date().toISOString(),
          signature: 's3',
        },
      ];

      const receipt = oracle.aggregateReports('feed-eth-usd', ethReports);
      expect(receipt.aggregatedValue).toBe(3250); // Median of [3240, 3250, 3260]
      expect(receipt.participants).toBe(3);
      expect(receipt.oracleSignature).toMatch(/^0x/);

      // Verify cryptographic authenticity
      expect(oracle.verifyReceipt(receipt)).toBe(true);

      // Majority vote aggregation
      const healthReports = [
        {
          providerId: 'prov-node-alpha',
          feedId: 'feed-cluster-health',
          value: true,
          timestamp: new Date().toISOString(),
          signature: 's1',
        },
        {
          providerId: 'prov-node-beta',
          feedId: 'feed-cluster-health',
          value: true,
          timestamp: new Date().toISOString(),
          signature: 's2',
        },
        {
          providerId: 'prov-node-gamma',
          feedId: 'feed-cluster-health',
          value: false,
          timestamp: new Date().toISOString(),
          signature: 's3',
        },
      ];

      const healthReceipt = oracle.aggregateReports('feed-cluster-health', healthReports);
      expect(healthReceipt.aggregatedValue).toBe(true);
      expect(oracle.verifyReceipt(healthReceipt)).toBe(true);

      // Tampered detection
      const tampered = { ...healthReceipt, aggregatedValue: false };
      expect(oracle.verifyReceipt(tampered)).toBe(false);
    });
  });

  describe('23. Merkle State Vault, Checkpoint Backup & Disaster Recovery E2E', () => {
    it('should create cryptographically sealed state checkpoints, verify Merkle roots, and restore state', () => {
      const vault = new OceanicosStateVault();

      // Sample events and rules
      const events: any[] = [
        {
          id: 1,
          type: 'OBSERVATION',
          recordedAt: new Date().toISOString(),
          hash: 'hash-evt-001',
          previousHash: '0',
          data: { claim: { statement: 'all services green' } },
        },
        {
          id: 2,
          type: 'VERIFICATION',
          recordedAt: new Date().toISOString(),
          hash: 'hash-evt-002',
          previousHash: 'hash-evt-001',
          data: { summary: { passed: true, rulesApplied: 2, rulesPassed: 2 } },
        },
      ];

      const rules: any[] = [
        {
          name: 'uptime-slo',
          version: '1.0.0',
          definition: 'uptime >= 0.999',
          createdAt: new Date().toISOString(),
          active: true,
        },
      ];

      // Create sealed checkpoint
      const checkpoint = vault.createCheckpoint('Production E2E Snapshot', events, rules);
      expect(checkpoint.checkpointId).toMatch(/^chk-/);
      expect(checkpoint.epoch).toBe(1);
      expect(checkpoint.merkleRoot).toHaveLength(64);
      expect(checkpoint.signature).toMatch(/^0x/);

      // Verify integrity
      expect(vault.verifyCheckpoint(checkpoint)).toBe(true);

      // Disaster recovery restoration
      const restoreResult = vault.restoreCheckpoint(checkpoint.checkpointId);
      expect(restoreResult.restored).toBe(true);
      expect(restoreResult.eventsRestored).toBe(2);
      expect(restoreResult.rulesRestored).toBe(1);
      expect(restoreResult.headHashVerified).toBe(true);

      // Vault statistics
      const stats = vault.getStats();
      expect(stats.totalCheckpoints).toBe(1);
      expect(stats.latestEpoch).toBe(1);
      expect(stats.healthy).toBe(true);
    });
  });

  describe('24. Decentralized Dispute Resolution, Challenge Windows & Arbitration Jury E2E', () => {
    it('should raise dispute challenges, accept counter-evidence dossiers, collect jury quorum votes, and execute rulings', () => {
      const disputeEngine = new OceanicosDisputeEngine();

      // Ensure canonical cases exist
      const initialCases = disputeEngine.getCases();
      expect(initialCases.length).toBeGreaterThanOrEqual(1);

      // 1. Raise new dispute case
      const disputeCase = disputeEngine.raiseDispute({
        targetEventHash: '0xevent_hash_under_dispute_999',
        claimantDid: 'did:omega:agent:node-primary',
        challengerDid: 'did:omega:auditor:sentinel-1',
        stakeAmount: 500,
        reason: 'Observation throughput contradicted by edge telemetry log trace',
      });

      expect(disputeCase.caseId).toMatch(/^disp-/);
      expect(disputeCase.status).toBe('CHALLENGE_OPEN');

      // 2. Submit counter-evidence
      const evidence = disputeEngine.submitEvidence(disputeCase.caseId, {
        submitterDid: 'did:omega:auditor:sentinel-1',
        evidenceType: 'OBSERVATION_DIFF',
        description: 'Distributed p99 observation snapshot shows 1200ms latency',
        contentHash: '0xhash_evidence_dossier_diff',
        signature: '0xsig_counter_evidence',
      });
      expect(evidence.evidenceId).toMatch(/^ev-/);

      // 3. Multi-juror arbitration voting
      disputeEngine.castVote(disputeCase.caseId, {
        jurorDid: 'did:omega:juror:council-1',
        choice: 'OVERTURN_ATTESTATION',
        weight: 1.5,
        rationale: 'Evidence diff verified against edge ledger',
        signature: '0xj1_sig',
      });

      disputeEngine.castVote(disputeCase.caseId, {
        jurorDid: 'did:omega:juror:council-2',
        choice: 'UPHOLD_ATTESTATION',
        weight: 1.0,
        rationale: 'Telemetry diff within 5% tolerance',
        signature: '0xj2_sig',
      });

      // 3rd vote triggers automated resolution quorum
      const resolved = disputeEngine.castVote(disputeCase.caseId, {
        jurorDid: 'did:omega:juror:council-3',
        choice: 'OVERTURN_ATTESTATION',
        weight: 2.0,
        rationale: 'Concur with council-1 evidence assessment',
        signature: '0xj3_sig',
      });

      // 4. Verify ruling
      expect(resolved.status).toBe('OVERTURNED');
      expect(resolved.ruling).toBeDefined();
      expect(resolved.ruling!.overturnWeight).toBe(3.5);
      expect(resolved.ruling!.upholdWeight).toBe(1.0);
      expect(resolved.ruling!.rulingReceiptHash).toMatch(/^0x/);

      // Stats check
      const stats = disputeEngine.getStats();
      expect(stats.overturnedCases).toBeGreaterThanOrEqual(1);
    });
  });

  describe('25. Verifiable Worker Pool, Reproducible Builds & SLSA Attestations E2E', () => {
    it('should register worker capabilities, lease build tasks, generate SLSA-L3 attestations, and verify multi-builder reproducibility', () => {
      const pool = new OceanicosWorkerPool('e2e-worker-pool-key');

      // 1. Verify canonical workers exist
      const workers = pool.getWorkers();
      expect(workers.length).toBeGreaterThanOrEqual(2);

      // 2. Submit high-priority compilation job
      const job = pool.submitJob({
        name: 'E2E Reproducible Bytecode Build',
        requiredCapability: 'COMPILE',
        payload: { targetArch: 'x86_64', optLevel: 3 },
        priority: 1,
      });

      expect(job.status).toBe('QUEUED');
      expect(job.inputFingerprint).toHaveLength(64);

      // 3. Lease job to capability-matching worker
      const leased = pool.leaseJob('worker-node-primary-01');
      expect(leased).not.toBeNull();
      expect(leased!.jobId).toBe(job.jobId);
      expect(leased!.assignedWorkerId).toBe('worker-node-primary-01');

      // 4. Complete build and generate signed SLSA-L3 attestation
      const artifacts = [
        {
          name: 'oceanicum-core.wasm',
          path: 'dist/oceanicum-core.wasm',
          contentHash: 'hash-wasm-binary-001',
          sizeBytes: 65536,
          mimeType: 'application/wasm',
        },
      ];

      const { job: completedJob, attestation } = pool.completeJob(
        job.jobId,
        'worker-node-primary-01',
        { exitCode: 0, memoryUsedMb: 64 },
        artifacts
      );

      expect(completedJob.status).toBe('COMPLETED');
      expect(attestation.slsaLevel).toBe('SLSA_BUILD_L3');
      expect(attestation.outputMerkleRoot).toHaveLength(64);
      expect(attestation.builderSignature).toMatch(/^0x/);

      // 5. Verify cryptographic validity of build attestation
      expect(pool.verifyAttestation(attestation)).toBe(true);

      // 6. Cross-verify multi-builder reproducibility
      const secondaryJob = pool.submitJob({
        name: 'E2E Reproducible Bytecode Build',
        requiredCapability: 'COMPILE',
        payload: { targetArch: 'x86_64', optLevel: 3 },
      });
      pool.leaseJob('worker-node-edge-02');
      const { attestation: secondaryAttestation } = pool.completeJob(
        secondaryJob.jobId,
        'worker-node-edge-02',
        { exitCode: 0, memoryUsedMb: 64 },
        artifacts
      );

      const repro = pool.verifyBuildReproducibility([attestation, secondaryAttestation]);
      expect(repro.reproducible).toBe(true);
      expect(repro.discrepancyCount).toBe(0);

      // 7. Check pool metrics
      const poolStats = pool.getStats();
      expect(poolStats.completedJobs).toBeGreaterThanOrEqual(2);
      expect(poolStats.reproducibilityRate).toBe(1.0);
    });
  });

  describe('26. Automated Verified CI/CD Pipeline Orchestrator E2E', () => {
    it('should orchestrate a multi-stage dependency DAG, evaluate stage gates, collect SLSA attestations, and cryptographically sign run', async () => {
      const pool = new OceanicosWorkerPool('e2e-pipeline-key');
      const pipelineEngine = new OceanicosPipelineEngine('e2e-pipeline-key');

      // Execute 3-stage verifiable CI pipeline
      const result = await pipelineEngine.executePipeline({
        name: 'Full-Stack Kernel Release CI',
        version: '6.1.0',
        triggeredBy: 'did:omega:agent:ci-controller',
        workerPool: pool,
        stages: [
          {
            stageId: 'stage-compile-kernel',
            name: 'Compile Bytecode & VM Instructions',
            capability: 'COMPILE',
            dependsOn: [],
            jobPayload: { target: 'WASM_64' },
          },
          {
            stageId: 'stage-run-verifications',
            name: 'Execute Verification Suite & Gate Check',
            capability: 'VERIFY',
            dependsOn: ['stage-compile-kernel'],
            gate: { policy: 'REQUIRE_ATTESTATION', rollbackOnFail: true },
            jobPayload: { suites: 42 },
          },
          {
            stageId: 'stage-seal-release',
            name: 'Cryptographic Attestation & Merkle Seal',
            capability: 'ATTEST',
            dependsOn: ['stage-run-verifications'],
            gate: { policy: 'AUTO_PASS', rollbackOnFail: false },
            jobPayload: { tag: 'v6.1.0-release' },
          },
        ],
      });

      // Assert complete pipeline run success
      expect(result.run.status).toBe('SUCCESS');
      expect(result.stagesExecuted).toBe(3);
      expect(result.stagesPassed).toBe(3);
      expect(result.stagesFailed).toBe(0);
      expect(result.totalAttestations).toBe(3);
      expect(result.rollbackTriggered).toBe(false);
      expect(result.pipelineSignature).toMatch(/^0x/);

      // Verify cryptographic authenticity
      expect(pipelineEngine.verifyRunSignature(result.run)).toBe(true);

      // Verify statistics
      const stats = pipelineEngine.getStats();
      expect(stats.totalRuns).toBe(1);
      expect(stats.successfulRuns).toBe(1);
      expect(stats.totalStagesExecuted).toBe(3);
      expect(stats.totalAttestations).toBe(3);
    });
  });

  describe('27. Decentralized Verifiable Package & Artifact Registry E2E', () => {
    it('should publish signed package releases, verify zero-trust tarball integrity, deprecate versions, and issue security advisories', () => {
      const registry = new OceanicosRegistryEngine('e2e-registry-key');

      // 1. Verify canonical packages exist
      const initialPkgs = registry.getAllPackages();
      expect(initialPkgs.length).toBeGreaterThanOrEqual(2);

      // 2. Publish new verified release
      const rawTarball = Buffer.from('OCEANICOS_PACKAGE_BINARY_V1');
      const release = registry.publishPackage({
        name: '@omega-v/e2e-security-module',
        version: '1.0.0',
        publisherDid: 'did:omega:publisher:release-bot',
        description: 'E2E verified security adapter',
        tarballContent: rawTarball,
        dependencies: { '@omega-v/types': '^0.1.0' },
        slsaAttestationId: 'att-slsa-e2e-001',
      });

      expect(release.name).toBe('@omega-v/e2e-security-module');
      expect(release.version).toBe('1.0.0');
      expect(release.tarballHash).toHaveLength(64);
      expect(release.manifestMerkleRoot).toHaveLength(64);
      expect(release.publisherSignature).toMatch(/^0x/);

      // 3. Zero-trust download verification
      const verifyValid = registry.verifyPackageIntegrity('@omega-v/e2e-security-module', '1.0.0', rawTarball);
      expect(verifyValid.valid).toBe(true);
      expect(verifyValid.matchesExpected).toBe(true);
      expect(verifyValid.signatureValid).toBe(true);

      // Tampered download fails
      const verifyTampered = registry.verifyPackageIntegrity('@omega-v/e2e-security-module', '1.0.0', Buffer.from('TAMPERED_PAYLOAD'));
      expect(verifyTampered.valid).toBe(false);
      expect(verifyTampered.matchesExpected).toBe(false);

      // 4. Issue security vulnerability advisory
      const advisory = registry.publishAdvisory({
        packageName: '@omega-v/e2e-security-module',
        affectedVersions: ['1.0.0'],
        severity: 'MEDIUM',
        title: 'Buffer padding inconsistency in raw serialization',
        description: 'Unchecked byte length allowed 1 extra padding byte in edge cases',
        reportedBy: 'did:omega:auditor:sentinel',
        patchedIn: '1.0.1',
      });
      expect(advisory.advisoryId).toMatch(/^adv-/);
      expect(advisory.signature).toMatch(/^0x/);

      // 5. Deprecate affected release
      const deprecated = registry.deprecatePackage('@omega-v/e2e-security-module', '1.0.0', 'Superseded by 1.0.1 due to advisory');
      expect(deprecated.deprecated).toBe(true);
      expect(deprecated.deprecationReason).toContain('Superseded');

      // 6. Verify registry metrics
      const registryStats = registry.getStats();
      expect(registryStats.totalPackages).toBeGreaterThanOrEqual(3);
      expect(registryStats.totalAdvisories).toBeGreaterThanOrEqual(1);
      expect(registryStats.verifiedPackagesRatio).toBe(1.0);
    });
  });

  describe('28. Hardware TEE Confidential Computing & Remote Attestation E2E', () => {
    it('should provision hardware enclaves, generate/verify remote attestation reports, seal state to MRENCLAVE, and execute confidential code', () => {
      const enclaveEngine = new OceanicosEnclaveEngine('e2e-hw-root-key');

      // 1. Verify canonical enclaves exist
      const enclaves = enclaveEngine.getEnclaves();
      expect(enclaves.length).toBeGreaterThanOrEqual(2);

      // 2. Generate and verify Remote Attestation Report
      const report = enclaveEngine.generateRemoteAttestation(
        'enclave-sgx-primary-01',
        { computation: 'E2E zero-knowledge proof verification', witnessHash: '0xabc123' },
        'nonce-e2e-random-999'
      );

      expect(report.reportId).toMatch(/^att-rep-/);
      expect(report.mrEnclave).toHaveLength(64);
      expect(report.hardwareSignature).toMatch(/^0x/);

      const verification = enclaveEngine.verifyRemoteAttestation(report);
      expect(verification.valid).toBe(true);
      expect(verification.trusted).toBe(true);

      // 3. Seal and unseal sensitive oracle secret
      const sensitiveSecret = { masterKey: '0xsuper_secret_oracle_signing_key', threshold: 3 };
      const sealed = enclaveEngine.sealData('enclave-sgx-primary-01', sensitiveSecret);

      expect(sealed.sealId).toMatch(/^seal-/);
      expect(sealed.mrEnclaveConstraint).toBe(report.mrEnclave);
      expect(sealed.ciphertext).toBeDefined();

      const unsealed = enclaveEngine.unsealData('enclave-sgx-primary-01', sealed);
      expect(JSON.parse(unsealed)).toEqual(sensitiveSecret);

      // 4. Confidential execution inside isolated enclave
      const execResult = enclaveEngine.executeConfidentialCode('enclave-sgx-primary-01', 'VERIFY_EVIDENCE_ISOLATED', {
        evidenceId: 'ev-001',
        strict: true,
      });

      expect(execResult.verified).toBe(true);
      expect(execResult.executionId).toMatch(/^exec-/);
      expect(enclaveEngine.verifyRemoteAttestation(execResult.attestationReport).valid).toBe(true);

      // 5. Check enclave metrics
      const enclaveStats = enclaveEngine.getStats();
      expect(enclaveStats.totalEnclaves).toBeGreaterThanOrEqual(2);
      expect(enclaveStats.totalAttestations).toBeGreaterThanOrEqual(2);
    });
  });

  describe('29. Byzantine Fault Tolerant (BFT) State Machine Consensus E2E', () => {
    it('should propose candidate blocks, achieve 2/3+1 Quorum Certificate, finalize block, and slash Byzantine equivocators', () => {
      const consensusEngine = new OceanicosConsensusEngine('e2e-consensus-key');

      // 1. Genesis block check
      const chain = consensusEngine.getChain();
      expect(chain.length).toBe(1);
      expect(chain[0].height).toBe(0);

      // 2. Propose block at height 1
      const candidateBlock = consensusEngine.proposeBlock({
        proposerDid: 'did:omega:validator:genesis-alpha',
        transactions: [{ txId: 'tx-201', operation: 'REGISTER_VALID_IDENTITY', subject: 'did:omega:agent:01' }],
        stateRoot: '0x1234567890abcdef1234567890abcdef',
        attestationProofs: ['proof-genesis-v6-01'],
      });

      expect(candidateBlock.height).toBe(1);
      expect(candidateBlock.blockHash).toMatch(/^0x/);

      // 3. Vote and achieve Quorum Certificate
      consensusEngine.castVote({
        validatorDid: 'did:omega:validator:genesis-alpha',
        blockHash: candidateBlock.blockHash,
        blockHeight: 1,
      });

      const { qc, quorumReached } = consensusEngine.castVote({
        validatorDid: 'did:omega:validator:genesis-beta',
        blockHash: candidateBlock.blockHash,
        blockHeight: 1,
      });

      expect(quorumReached).toBe(true);
      expect(qc.quorumReached).toBe(true);

      // 4. Finalize block
      const finalized = consensusEngine.finalizeBlock(candidateBlock, qc);
      expect(finalized.quorumCertificate).toBeDefined();
      expect(consensusEngine.getChain().length).toBe(2);
      expect(consensusEngine.getChain()[1].height).toBe(1);

      // 5. Detect and slash Byzantine equivocation
      const slash = consensusEngine.detectEquivocation({
        validatorDid: 'did:omega:validator:genesis-gamma',
        blockHeight: 1,
        blockHashA: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        blockHashB: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      });

      expect(slash.recordId).toMatch(/^slash-/);
      expect(slash.slashedStake).toBe(200000);

      const gamma = consensusEngine.getValidators().find((v) => v.did === 'did:omega:validator:genesis-gamma')!;
      expect(gamma.status).toBe('SLASHED');
      expect(gamma.stake).toBe(0);

      // 6. Check consensus stats
      const stats = consensusEngine.getStats();
      expect(stats.chainHeight).toBe(1);
      expect(stats.totalBlocks).toBe(2);
      expect(stats.totalSlashedValidators).toBe(1);
    });
  });

  describe('30. Peer-to-Peer Gossip Protocol & Verifiable Message Propagation E2E', () => {
    it('should manage peers across regions, propagate signed epidemic gossip, verify message integrity, and sync state', () => {
      const meshEngine = new OceanicosMeshEngine('e2e-mesh-gossip-key');

      // 1. Initial network check
      const peers = meshEngine.getPeers();
      expect(peers.length).toBe(3);
      expect(peers.every((p) => p.status === 'CONNECTED')).toBe(true);

      // 2. Add dynamic peer
      const edgePeer = meshEngine.addPeer({
        did: 'did:omega:peer:tokyo-edge-01',
        endpoint: 'wss://tokyo.mesh.omega-v.io:9944',
        region: 'ap-northeast-1',
      });
      expect(edgePeer.did).toBe('did:omega:peer:tokyo-edge-01');
      expect(meshEngine.getPeers().length).toBe(4);

      // 3. Gossip verifiable message
      const receipt = meshEngine.gossip({
        senderDid: 'did:omega:peer:alpha-seed',
        type: 'ATTESTATION_SHARE',
        payload: { attestationId: 'att-e2e-001', claimHash: '0x999aaa888' },
        ttl: 6,
      });

      expect(receipt.messageId).toMatch(/^msg-/);
      expect(receipt.reachedPeers).toBeGreaterThanOrEqual(1);

      // 4. Verify cryptographic signature on gossiped message
      const verification = meshEngine.verifyGossipSignature(receipt.messageId);
      expect(verification.valid).toBe(true);

      // 5. Trigger Merkle sync
      const sync = meshEngine.requestSync({
        peerDid: 'did:omega:peer:beta-seed',
        merkleRoot: '0xroot_e2e_state_hash',
        blocksRequested: 50,
      });
      expect(sync.status).toBe('COMPLETE');
      expect(sync.blocksSynced).toBe(50);

      // 6. Ban misbehaving peer
      const banned = meshEngine.banPeer('did:omega:peer:tokyo-edge-01', 'Signature mismatch');
      expect(banned.status).toBe('BANNED');

      // 7. Check mesh aggregate stats
      const stats = meshEngine.getStats();
      expect(stats.totalPeers).toBe(4);
      expect(stats.connectedPeers).toBe(3);
      expect(stats.totalMessagesGossiped).toBe(1);
    });
  });

  describe('31. Adaptive State Sharding & Cross-Shard Atomic 2PC E2E', () => {
    it('should route state keys, compute per-shard Merkle roots, execute 2PC transactions, and split partitions', () => {
      const shardingEngine = new OceanicosShardingEngine('e2e-sharding-key');

      // 1. Genesis shards
      const initialShards = shardingEngine.getShards();
      expect(initialShards.length).toBe(2);
      expect(initialShards[0].slotEnd).toBe(511);
      expect(initialShards[1].slotStart).toBe(512);

      // 2. Put state in partitioned shard
      const putRes = shardingEngine.putState('user:vault:101', { balance: 5000 });
      expect(putRes.shardId).toBeDefined();
      expect(putRes.merkleRoot).toMatch(/^0x/);

      const retrieved = shardingEngine.getState('user:vault:101');
      expect(retrieved?.value).toEqual({ balance: 5000 });

      // 3. Cross-shard atomic Two-Phase Commit (2PC)
      const tx = shardingEngine.prepareCrossShardTx({
        key: 'state:bridge:01',
        sourceShardId: 'shard-00',
        targetShardId: 'shard-01',
        sourceValue: { locked: true },
        targetValue: { minted: true },
      });

      expect(tx.state).toBe('PREPARED');
      expect(tx.prepareProofs.length).toBe(2);

      const committed = shardingEngine.commitCrossShardTx(tx.txId);
      expect(committed.state).toBe('COMMITTED');
      expect(committed.commitProof).toBeDefined();

      // 4. Trigger automated shard split / rebalance
      const splitEvent = shardingEngine.splitShard('shard-00');
      expect(splitEvent.childShardA).toBe('shard-00-a');
      expect(splitEvent.childShardB).toBe('shard-00-b');

      // 5. Verify stats
      const shardingStats = shardingEngine.getStats();
      expect(shardingStats.totalShards).toBe(4);
      expect(shardingStats.activeShards).toBe(3);
      expect(shardingStats.committedCrossShardTxs).toBe(1);
    });
  });

  describe('32. Cross-Chain Cryptographic Bridge & Light Client Relays E2E', () => {
    it('should track foreign chain light clients, verify Merkle inclusion proofs, and relay cross-chain transfers', () => {
      const bridgeEngine = new OceanicosBridgeEngine('e2e-bridge-key');

      // 1. Initial registered light clients
      const chains = bridgeEngine.getChains();
      expect(chains.length).toBe(3);

      // 2. Submit new block header
      const headerRes = bridgeEngine.submitHeader({
        chainId: 'chain-eth-mainnet',
        height: 19850005,
        blockHash: '0xethblock19850005',
        previousBlockHash: '0xethblock19850004',
        stateRoot: '0xstateroot19850005',
        signatures: ['sig-validator-alpha'],
      });
      expect(headerRes.accepted).toBe(true);
      expect(headerRes.latestHeight).toBe(19850005);

      // 3. Initiate cross-chain bridge transfer
      const transfer = bridgeEngine.initiateTransfer({
        sourceChain: 'chain-eth-mainnet',
        targetChain: 'chain-cosmos-hub',
        senderDid: 'did:omega:agent:bridge-trader',
        recipientAddress: 'cosmos1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq',
        assetSymbol: 'USDC',
        amount: 75000,
        lockTxHash: '0xlock_tx_e2e_proof',
      });
      expect(transfer.transferId).toMatch(/^brg-/);
      expect(transfer.status).toBe('INITIALIZED');

      // 4. Relayer submits Merkle inclusion proof
      const relayed = bridgeEngine.relayTransfer({
        transferId: transfer.transferId,
        relayerDid: 'did:omega:relayer:eth-primary',
        merkleProof: '0xmerkle_path_proof_data',
      });
      expect(relayed.status).toBe('RELAYED');
      expect(relayed.merkleProof).toBeDefined();

      // 5. Destination chain finalization
      const finalized = bridgeEngine.finalizeTransfer(transfer.transferId);
      expect(finalized.status).toBe('FINALIZED');
      expect(finalized.mintTxHash).toMatch(/^0x/);

      // 6. Check bridge statistics
      const stats = bridgeEngine.getStats();
      expect(stats.supportedChains).toBe(3);
      expect(stats.totalTransfers).toBe(1);
      expect(stats.finalizedTransfers).toBe(1);
      expect(stats.totalVolumeLocked).toBe(75000);
    });
  });

  describe('33. MEV-Resistant Fair Sequencer & VDF Settlement Batches E2E', () => {
    it('should submit encrypted transactions, compute VDF, seal fair batches, and verify cryptographic batch receipts', () => {
      const sequencerEngine = new OceanicosSequencerEngine('e2e-sequencer-key', 200);

      // 1. Submit encrypted transactions
      const tx1 = sequencerEngine.submitEncryptedTx({
        senderDid: 'did:omega:agent:user-alpha',
        encryptedPayload: '0xencrypted_tx_data_alpha',
        gasLimit: 120000,
      });

      const tx2 = sequencerEngine.submitEncryptedTx({
        senderDid: 'did:omega:agent:user-beta',
        encryptedPayload: '0xencrypted_tx_data_beta',
        gasLimit: 90000,
      });

      expect(tx1.txHash).toMatch(/^0x/);
      expect(tx1.status).toBe('PENDING');
      expect(sequencerEngine.getMempool().length).toBe(2);

      // 2. Seal batch with VDF
      const batch = sequencerEngine.sealBatch(10);
      expect(batch.batchNumber).toBe(1);
      expect(batch.txCount).toBe(2);
      expect(batch.transactionsRoot).toMatch(/^0x/);
      expect(batch.stateDeltaRoot).toMatch(/^0x/);
      expect(batch.vdfProof.iterations).toBe(200);

      // 3. Verify batch receipt
      const verification = sequencerEngine.verifyBatchReceipt(batch);
      expect(verification.valid).toBe(true);

      // 4. Check sequencer metrics
      const stats = sequencerEngine.getStats();
      expect(stats.totalMempoolTxs).toBe(2);
      expect(stats.pendingMempoolTxs).toBe(0);
      expect(stats.totalBatchesSealed).toBe(1);
      expect(stats.avgBatchSize).toBe(2);
    });
  });

  describe('34. Data Availability Sampling & KZG Erasure Coding E2E', () => {
    it('should submit blobs, generate erasure parity chunks with KZG proofs, sample availability, and verify confidence', () => {
      const daEngine = new OceanicosDAEngine('e2e-da-key', 64);

      // 1. Submit blob
      const blob = daEngine.submitBlob({
        namespace: 'rollup:settlement:alpha',
        submitterDid: 'did:omega:sequencer:primary',
        rawData: 'State diff root proof with 1024 transactions rollup payload verified against base chain',
      });

      expect(blob.blobId).toMatch(/^blob-/);
      expect(blob.status).toBe('COMMITTED');
      expect(blob.chunkCount).toBeGreaterThan(0);
      expect(blob.parityChunkCount).toBe(blob.chunkCount);

      // 2. Verify KZG commitment
      const kzgValid = daEngine.verifyCommitment(blob.blobId);
      expect(kzgValid).toBe(true);

      // 3. Random DAS sampling
      const sample = daEngine.sampleBlob(blob.blobId, 4);
      expect(sample.allAvailable).toBe(true);
      expect(sample.confidence).toBeGreaterThan(90);

      // 4. Check stats
      const stats = daEngine.getStats();
      expect(stats.totalBlobs).toBe(1);
      expect(stats.samplesPerformed).toBe(1);
      expect(stats.namespaceCount).toBe(1);
    });
  });

  describe('35. Layer-2 Rollup Execution Engine & State Transition Proofs E2E', () => {
    it('should submit L2 transactions, produce state-transitioned blocks, commit to L1, and verify finality', () => {
      const rollupEngine = new OceanicosRollupEngine('e2e-rollup-key');

      // 1. Submit L2 transactions
      const tx1 = rollupEngine.submitL2Transaction({
        from: '0xAlice',
        to: '0xBob',
        value: 12000,
        calldata: '0xcalldata_transfer',
      });
      expect(tx1.txHash).toMatch(/^0x/);
      expect(tx1.status).toBe('PENDING');

      // 2. Produce block
      const block = rollupEngine.produceBlock({
        proposerDid: 'did:omega:sequencer:primary',
        rollupType: 'OPTIMISTIC',
      });
      expect(block.blockHeight).toBe(1);
      expect(block.txCount).toBe(1);
      expect(block.status).toBe('PROPOSED');
      expect(block.preStateRoot).toMatch(/^0x/);
      expect(block.postStateRoot).toMatch(/^0x/);
      expect(block.batchCommitment).toMatch(/^0x/);

      // 3. Commit to L1 & finalize
      const committed = rollupEngine.commitToL1(block.blockHeight, '0xETH_L1_BATCH_HASH');
      expect(committed.status).toBe('COMMITTED_L1');

      const finalized = rollupEngine.finalizeBlock(block.blockHeight);
      expect(finalized.status).toBe('FINALIZED');

      // 4. Check L2 stats
      const stats = rollupEngine.getStats();
      expect(stats.totalBlocks).toBe(1);
      expect(stats.finalizedBlocks).toBe(1);
      expect(stats.totalL2Transactions).toBe(1);
      expect(stats.activeAccounts).toBe(2);
    });
  });

  describe('36. Verifiable AI Agent Intent Solver & Composable Settlement E2E', () => {
    it('should submit user intents, accept competitive solver bids with witness proofs, select optimal routes, and settle', () => {
      const intentEngine = new OceanicosIntentEngine('e2e-intent-key');

      // 1. Submit intent
      const intent = intentEngine.submitIntent({
        userDid: 'did:omega:agent:trader-01',
        intentDescription: 'Swap 500 USDC for maximum SOL across Solana & Arbitrum',
        sourceAsset: 'USDC',
        targetAsset: 'SOL',
        minTargetAmount: 3.5,
        maxBudget: 500,
      });
      expect(intent.intentId).toMatch(/^intent-/);
      expect(intent.status).toBe('AUCTION_OPEN');

      // 2. Submit solver bids
      const bid1 = intentEngine.submitSolverBid({
        intentId: intent.intentId,
        solverDid: 'did:omega:solver:route-a',
        proposedRoute: ['USDC@Arb', 'Celer', 'SOL@Sol'],
        guaranteedOutput: 3.6,
        estimatedFee: 1.0,
      });

      const bid2 = intentEngine.submitSolverBid({
        intentId: intent.intentId,
        solverDid: 'did:omega:solver:route-b',
        proposedRoute: ['USDC@Arb', 'Uniswap', 'Wormhole', 'SOL@Sol'],
        guaranteedOutput: 3.8,
        estimatedFee: 0.5,
      });

      expect(bid1.solutionWitnessProof).toMatch(/^0x/);
      expect(bid2.solutionWitnessProof).toMatch(/^0x/);

      // 3. Settle intent with winning solver (route-b)
      const receipt = intentEngine.settleIntent(intent.intentId);
      expect(receipt.settlementId).toMatch(/^stl-/);
      expect(receipt.solverDid).toBe('did:omega:solver:route-b');
      expect(receipt.finalOutputAmount).toBe(3.8);
      expect(receipt.attestationSignature).toMatch(/^0x/);

      // 4. Verify stats
      const stats = intentEngine.getStats();
      expect(stats.totalIntents).toBe(1);
      expect(stats.settledIntents).toBe(1);
      expect(stats.activeBids).toBe(2);
      expect(stats.registeredSolvers).toBe(2);
    });
  });

  describe('37. Multi-Agent Swarm Orchestrator & Parallel Worker Dispatcher E2E', () => {
    it('should dispatch parallel multi-task batches, execute with worker agents, and attest completion', () => {
      const orchestrator = new OceanicosOrchestratorEngine('e2e-orchestrator-key');

      // 1. Dispatch parallel worker batch
      const batch = orchestrator.dispatchParallelBatch({
        batchName: 'Autonomous Full-Stack Verification Run',
        tasks: [
          { name: 'Verify ZK Constraints', assignedAgentDid: 'did:omega:worker:zk' },
          { name: 'Verify Consensus Quorum', assignedAgentDid: 'did:omega:worker:consensus' },
          { name: 'Verify Layer-2 State Diff', assignedAgentDid: 'did:omega:worker:rollup' },
        ],
      });

      expect(batch.batchId).toMatch(/^batch-/);
      expect(batch.taskCount).toBe(3);
      expect(batch.stateDeltaHash).toMatch(/^0x/);

      // 2. Worker agents attest task executions
      const tasks = orchestrator.getTasks(batch.batchId);
      for (const t of tasks) {
        orchestrator.submitTaskAttestation({
          taskId: t.taskId,
          agentDid: t.assignedAgentDid,
          resultWitness: `E2E_VERIFIED_${t.name.toUpperCase().replace(/\s+/g, '_')}`,
          durationMs: 30,
        });
      }

      // 3. Verify batch completion
      const updatedBatches = orchestrator.getBatches();
      expect(updatedBatches[0].completedCount).toBe(3);
      expect(updatedBatches[0].completedAt).toBeDefined();

      // 4. Check orchestrator metrics
      const stats = orchestrator.getStats();
      expect(stats.totalDispatchedTasks).toBe(3);
      expect(stats.completedTasks).toBe(3);
      expect(stats.registeredAgents).toBe(3);
      expect(stats.avgTaskExecutionMs).toBe(30);
    });
  });

  describe('38. Distributed Hash Table (DHT) — Kademlia Overlay Network E2E', () => {
    it('should register nodes, store records with replication, and perform verified lookups', () => {
      const dht = new OceanicosDHTEngine('e2e-dht-secret');

      // 1. Register DHT overlay nodes
      dht.registerNode({ did: 'did:omega:dht:alpha', address: '10.0.0.1:9000' });
      dht.registerNode({ did: 'did:omega:dht:beta', address: '10.0.0.2:9000' });
      dht.registerNode({ did: 'did:omega:dht:gamma', address: '10.0.0.3:9000' });

      expect(dht.getNodes()).toHaveLength(3);

      // 2. Store content-addressed records
      const record = dht.putRecord({
        key: 'omega:state:epoch-42',
        value: '0xdeadbeef_state_root',
        publisherDid: 'did:omega:sequencer:main',
        replicationFactor: 3,
      });

      expect(record.lookupProof).toMatch(/^0x/);
      expect(record.replicationFactor).toBe(3);

      // 3. Lookup with verification proof
      const result = dht.lookup('omega:state:epoch-42');
      expect(result.found).toBe(true);
      expect(result.value).toBe('0xdeadbeef_state_root');
      expect(result.hops).toBeGreaterThanOrEqual(1);
      expect(result.verificationProof).toMatch(/^0x/);

      // 4. Miss lookup
      const miss = dht.lookup('nonexistent');
      expect(miss.found).toBe(false);

      // 5. Stats
      const stats = dht.getStats();
      expect(stats.totalNodes).toBe(3);
      expect(stats.totalRecords).toBe(1);
      expect(stats.totalLookups).toBe(2);
      expect(stats.cacheHitRate).toBe(0.5);
    });
  });

  describe('39. Proof-of-Stake Delegation & Slashing Engine E2E', () => {
    it('should register validators, process delegations, slash Byzantine actors, and distribute verifiable epoch rewards', () => {
      const staking = new OceanicosStakingEngine('e2e-staking-secret');

      // 1. Register validators
      const v1 = staking.registerValidator({
        validatorDid: 'did:omega:val:prime',
        moniker: 'Prime Sentinel',
        selfStake: 500,
        commissionRate: 0.05,
      });
      const v2 = staking.registerValidator({
        validatorDid: 'did:omega:val:rogue',
        moniker: 'Rogue Node',
        selfStake: 500,
        commissionRate: 0.10,
      });

      expect(v1.totalStake).toBe(500);
      expect(v2.totalStake).toBe(500);

      // 2. Process delegations
      const del = staking.delegate({
        delegatorDid: 'did:omega:user:carol',
        validatorDid: 'did:omega:val:prime',
        amount: 300,
      });

      expect(del.delegationId).toMatch(/^del-/);
      expect(del.attestationProof).toMatch(/^0x/);

      // 3. Slash Byzantine validator
      const slash = staking.slashValidator({
        validatorDid: 'did:omega:val:rogue',
        reason: 'DOUBLE_SIGN',
        evidenceProof: '0xdouble_sign_equivocation_proof',
      });

      expect(slash.slashedAmount).toBe(100); // 20% of 500
      expect(slash.slashFraction).toBe(0.20);
      const rogue = staking.getValidators().find((v) => v.validatorDid === 'did:omega:val:rogue')!;
      expect(rogue.status).toBe('JAILED');

      // 4. Advance epoch and distribute rewards
      const epochReceipt = staking.advanceEpoch(1000);
      expect(epochReceipt.epoch).toBe(1);
      expect(epochReceipt.totalRewardsDistributed).toBe(1000);
      expect(epochReceipt.distributionAttestation).toMatch(/^0x/);

      // 5. Verify stats
      const stats = staking.getStats();
      expect(stats.currentEpoch).toBe(2);
      expect(stats.activeValidators).toBe(1);
      expect(stats.jailedValidators).toBe(1);
      expect(stats.totalDelegations).toBe(1);
      expect(stats.totalSlashedAmount).toBe(100);
    });
  });

  describe('40. Oceanic Finite State Machine Kernel — Canonical Verification Loop E2E', () => {
    it('should compile canonical state Sn, preserve dissent, gate human approval, record consequence, and reconstruct lineage', () => {
      const kernel = new OceanicosKernel('e2e-kernel-secret');

      // 1. Compile state transition with dissent and sensitive financial action
      const state = kernel.transition({
        intent: {
          claim: 'Atomic Multi-Hop Liquidity Rebalance',
          actors: ['did:omega:agent:liquidity-mgr'],
          inputs: { route: ['USDC', 'ETH', 'DAI'], amount: 250000 },
          expectedOutputs: { netYieldBps: 35 },
          constraints: ['max-slippage < 0.005'],
          permissions: ['REBALANCE_TREASURY'],
          dependencies: ['dht-state-epoch-42'],
          maxRiskScore: 0.2,
          economicTarget: { targetValue: 875, resourceBudget: 40 },
        },
        observation: {
          source: 'oracle:multi-source-depth',
          observedAt: new Date().toISOString(),
          rawTelemetry: { aggregateDepth: 12000000 },
          epistemicType: 'FACT',
          confidence: 0.99,
        },
        evidenceItems: [
          {
            claim: 'Proof-of-depth satisfies invariant',
            source: 'depth-verifier',
            observationId: 'obs-d1',
            commandOrTest: 'verifyDepthInvariant()',
            status: 'PASSED',
            confidence: 0.99,
          },
        ],
        dissentItems: [
          {
            agentOrModelDid: 'did:omega:model:volatility-watch',
            dissentingHypothesis: 'Gas spike expected in next 3 blocks',
            conflictWeight: 0.3,
          },
        ],
        actionPlan: {
          targetService: 'intent-solver',
          payload: { routeId: 'route-opt-1' },
          isDestructive: false,
          isFinancial: true,
          gasLimit: 85000,
          reversibility: 'REVERSIBLE',
        },
      });

      expect(state.verificationStatus).toBe('DISSENT_CONTAINED');
      expect(state.dissent).toHaveLength(1);
      expect(state.authorization.requiresHumanApproval).toBe(true);
      expect(state.authorization.isAuthorized).toBe(false);

      // 2. Human Authorization Gate
      const authed = kernel.authorizeAction({
        stateId: state.stateId,
        authorizerDid: 'did:omega:human:officer-prime',
        authorizationSignature: '0xsignature_officer_prime_attested',
      });
      expect(authed.authorization.isAuthorized).toBe(true);
      expect(authed.action.status).toBe('READY');

      // 3. Consequence & Adaptive Recompilation
      const settled = kernel.applyConsequence({
        stateId: state.stateId,
        observedStatus: 'SUCCESS',
        realizedEffects: { realizedYieldBps: 38, gasUsed: 72000 },
        executionDurationMs: 80,
        verifiedValueGenerated: 950,
        resourceCost: 30,
      });

      expect(settled.consequence?.observedStatus).toBe('SUCCESS');
      expect(settled.consequence?.efficiencyRatio).toBeGreaterThan(0);
      expect(settled.learning?.recompileTriggered).toBe(true);

      // 4. Lineage verification
      const lineage = kernel.getStateLineage(state.stateId);
      expect(lineage).toHaveLength(1);
      expect(lineage[0].stateId).toBe(state.stateId);

      // 5. Kernel stats
      const stats = kernel.getStats();
      expect(stats.totalTransitions).toBe(1);
      expect(stats.verifiedStates).toBe(1);
      expect(stats.humanGatedAuthorizations).toBe(1);
      expect(stats.preservedDissentCount).toBe(1);
      expect(stats.recompilationsTriggered).toBe(1);
    });
  });

  describe('41. High-Throughput Transaction Mempool & MEV Bundle Engine E2E', () => {
    it('should submit transactions, handle RBF gas bumping, manage MEV bundles, and harvest priority batches', () => {
      const mempool = new OceanicosMempoolEngine('e2e-mempool-secret');

      // 1. Submit transactions with nonce sequencing
      const txA0 = mempool.submitTransaction({
        senderDid: 'did:omega:agent:trader-01',
        nonce: 0,
        gasPriceGwei: 30,
        gasLimit: 25000,
        payload: { intent: 'swap' },
      });
      const txA1 = mempool.submitTransaction({
        senderDid: 'did:omega:agent:trader-01',
        nonce: 1,
        gasPriceGwei: 60,
        gasLimit: 25000,
        payload: { intent: 'stake' },
      });
      const txB0 = mempool.submitTransaction({
        senderDid: 'did:omega:agent:arbitrageur',
        nonce: 0,
        gasPriceGwei: 80,
        gasLimit: 35000,
        payload: { intent: 'arb' },
      });

      expect(txA0.status).toBe('PENDING');
      expect(txA1.status).toBe('QUEUED');
      expect(txB0.status).toBe('PENDING');

      // 2. Submit MEV Bundle
      const bundle = mempool.submitBundle({
        searcherDid: 'did:omega:searcher:prime',
        txHashes: [txB0.txHash],
        bidTipGwei: 25,
        targetBlockEpoch: 10,
      });
      expect(bundle.bundleId).toMatch(/^mev-/);
      expect(bundle.status).toBe('SIMULATED');

      // 3. Harvest priority block batch
      const harvest1 = mempool.popBatch({ maxGas: 60000 });
      expect(harvest1.includedTxCount).toBe(2);
      expect(harvest1.transactions[0].senderDid).toBe('did:omega:agent:arbitrageur');
      expect(harvest1.transactions[1].senderDid).toBe('did:omega:agent:trader-01');
      expect(harvest1.harvestAttestation).toMatch(/^0x/);

      // 4. Verify queued txA1 was unblocked to PENDING and harvest it
      const txA1Updated = mempool.getTransactions().find((t) => t.txHash === txA1.txHash)!;
      expect(txA1Updated.status).toBe('PENDING');

      const harvest2 = mempool.popBatch({ maxGas: 50000 });
      expect(harvest2.includedTxCount).toBe(1);

      // 5. Check stats
      const stats = mempool.getStats();
      expect(stats.includedCount).toBe(3);
      expect(stats.activeBundles).toBe(1);
      expect(stats.mempoolMerkleRoot).toMatch(/^0x/);
    });
  });

  describe('42. Decentralized Threshold Multi-Signature Attestation Network E2E', () => {
    it('should register attestor nodes, create threshold session, gather signature shares, and aggregate valid QC', () => {
      const attestor = new OceanicosThresholdAttestorEngine('e2e-attestor-secret', 0.67);

      // 1. Register 3 attestor nodes (total weight = 30; 67% threshold => 21 required)
      attestor.registerAttestor({ nodeDid: 'did:omega:attestor:01', moniker: 'QC Sentinel 1', publicKey: '0x01', weight: 10 });
      attestor.registerAttestor({ nodeDid: 'did:omega:attestor:02', moniker: 'QC Sentinel 2', publicKey: '0x02', weight: 10 });
      attestor.registerAttestor({ nodeDid: 'did:omega:attestor:03', moniker: 'QC Sentinel 3', publicKey: '0x03', weight: 10 });

      expect(attestor.getAttestors()).toHaveLength(3);

      // 2. Create threshold attestation session
      const session = attestor.createSession({
        subjectHash: '0xcanonical_checkpoint_epoch_100',
        domain: 'STATE_FINALITY',
        payload: { epoch: 100, verifiedStates: 42 },
      });

      expect(session.sessionId).toMatch(/^ses-/);
      expect(session.requiredWeight).toBe(21);
      expect(session.status).toBe('COLLECTING');

      // 3. Submit shares
      const s1 = attestor.submitShare({
        sessionId: session.sessionId,
        nodeDid: 'did:omega:attestor:01',
        shareSignature: '0xshare_sig_01',
      });
      expect(s1.session.status).toBe('COLLECTING');

      const s2 = attestor.submitShare({
        sessionId: session.sessionId,
        nodeDid: 'did:omega:attestor:02',
        shareSignature: '0xshare_sig_02',
      });
      expect(s2.session.status).toBe('COLLECTING');

      const s3 = attestor.submitShare({
        sessionId: session.sessionId,
        nodeDid: 'did:omega:attestor:03',
        shareSignature: '0xshare_sig_03',
      });
      expect(s3.session.status).toBe('ATTESTED');
      expect(s3.qc).toBeDefined();
      expect(s3.qc?.accumulatedWeight).toBe(30);

      // 4. Verify Quorum Certificate
      const isValid = attestor.verifyQC(s3.qc!);
      expect(isValid).toBe(true);

      // 5. Check stats
      const stats = attestor.getStats();
      expect(stats.totalAttestors).toBe(3);
      expect(stats.activeAttestors).toBe(3);
      expect(stats.completedQCs).toBe(1);
    });
  });

  describe('43. On-Chain Timelocked Decentralized Autonomous Governance E2E', () => {
    it('should create proposal, vote with power, queue in timelock, and execute with cryptographic receipt', () => {
      const governor = new OceanicosGovernorEngine('e2e-governor-secret', 50, 0);

      // 1. Propose DAO action
      const p = governor.propose({
        proposerDid: 'did:omega:agent:dao-lead',
        title: 'Adjust Protocol Gas Limits',
        description: 'Increase block gas target to 30M for scalability',
        actions: [
          { targetService: 'mempool', actionType: 'UPDATE_LIMIT', parameters: { gasTarget: 30000000 } },
        ],
        quorumPower: 40,
      });

      expect(p.proposalId).toMatch(/^gov-/);
      expect(p.status).toBe('ACTIVE');

      // 2. Cast Votes
      const v1 = governor.castVote({
        proposalId: p.proposalId,
        voterDid: 'did:omega:voter:alice',
        choice: 'FOR',
        votingPower: 35,
        reason: 'Essential for high volume',
      });
      const v2 = governor.castVote({
        proposalId: p.proposalId,
        voterDid: 'did:omega:voter:bob',
        choice: 'FOR',
        votingPower: 25,
      });

      expect(v1.voteHash).toMatch(/^0x/);
      expect(v2.voteHash).toMatch(/^0x/);

      // 3. Queue Proposal
      const queued = governor.queueProposal(p.proposalId);
      expect(queued.status).toBe('QUEUED');
      expect(queued.forVotes).toBe(60);

      // 4. Execute Proposal
      const receipt = governor.executeProposal(p.proposalId, 'did:omega:executor:relay-agent');
      expect(receipt.proposalId).toBe(p.proposalId);
      expect(receipt.executionHash).toMatch(/^0x/);
      expect(receipt.executedActionsCount).toBe(1);

      // 5. Check stats
      const stats = governor.getStats();
      expect(stats.totalProposals).toBe(1);
      expect(stats.executedProposals).toBe(1);
      expect(stats.totalVotesCast).toBe(2);
      expect(stats.cumulativeVotingPower).toBe(60);
    });
  });

  describe('44. Decentralized Cross-Shard & Cross-Rollup Message Relaying E2E', () => {
    it('should dispatch packets with monotonic sequence, relay across domains, and issue verified delivery receipts', () => {
      const relay = new OceanicosRelayEngine('e2e-relay-secret');

      // 1. Register Relayer
      const relayer = relay.registerRelayer({
        relayerDid: 'did:omega:relayer:hermes',
        moniker: 'Hermes Primary Relayer',
        stakeAmount: 10000,
      });
      expect(relayer.relayerDid).toBe('did:omega:relayer:hermes');

      // 2. Dispatch cross-shard packet
      const packet = relay.dispatchPacket({
        sourceDomain: 'shard-01-compute',
        targetDomain: 'rollup-evm-settlement',
        senderDid: 'did:omega:agent:executor',
        recipientDid: 'did:omega:contract:state-receiver',
        payload: { command: 'APPLY_STATE_ROOT', root: '0xstate123' },
      });

      expect(packet.packetId).toMatch(/^pkt-/);
      expect(packet.sequenceNonce).toBe(1);
      expect(packet.status).toBe('DISPATCHED');
      expect(relay.verifyPacket(packet.packetId)).toBe(true);

      // 3. Relay packet
      const relayed = relay.relayPacket(packet.packetId, 'did:omega:relayer:hermes');
      expect(relayed.status).toBe('RELAYED');
      expect(relayed.relayedBy).toBe('did:omega:relayer:hermes');

      // 4. Acknowledge Delivery & Issue Receipt
      const receipt = relay.acknowledgeDelivery(packet.packetId, '0xdestination_execution_receipt_hash_001');
      expect(receipt.receiptId).toMatch(/^rcpt-/);
      expect(receipt.ackProof).toMatch(/^0x/);
      expect(receipt.targetReceiptHash).toBe('0xdestination_execution_receipt_hash_001');

      // 5. Check stats
      const stats = relay.getStats();
      expect(stats.totalPackets).toBe(1);
      expect(stats.acknowledgedCount).toBe(1);
      expect(stats.activeRelayers).toBe(1);
      expect(stats.totalChannels).toBe(1);
    });
  });

  describe('45. Oceanic Verifiable Virtual Machine (OVM) E2E', () => {
    it('should deploy smart contract, execute stack bytecode with gas metering, and mutate storage trie', () => {
      const ovm = new OceanicosVirtualMachine('e2e-ovm-secret');

      // 1. Deploy Staking Vault Contract
      const contract = ovm.deployContract({
        deployerDid: 'did:omega:agent:core-dev',
        name: 'VaultStakingLogic',
        code: [
          'PUSH totalStaked',
          'SLOAD',
          'PUSH 500',
          'ADD',
          'PUSH totalStaked',
          'SWAP',
          'SSTORE',
          'PUSH totalStaked',
          'SLOAD',
          'PUSH DepositEvent',
          'PUSH 500',
          'LOG',
          'RETURN',
        ],
        initialStorage: { totalStaked: '1000' },
      });

      expect(contract.address).toMatch(/^0x/);
      expect(contract.codeHash).toMatch(/^0x/);

      // 2. Call contract
      const trace = ovm.callContract({
        callerDid: 'did:omega:agent:user-alpha',
        contractAddress: contract.address,
        gasLimit: 50000,
      });

      expect(trace.success).toBe(true);
      expect(trace.returnValue).toBe('1500'); // 1000 + 500 = 1500
      expect(trace.gasUsed).toBeGreaterThan(0);
      expect(trace.storageRoot).toMatch(/^0x/);
      expect(trace.logs).toHaveLength(1);
      expect(trace.logs[0].topic).toBe('DepositEvent');
      expect(trace.traceHash).toMatch(/^0x/);

      // 3. Verify updated storage
      const updatedContract = ovm.getContract(contract.address)!;
      expect(updatedContract.storage['totalStaked']).toBe('1500');

      // 4. Check stats
      const stats = ovm.getStats();
      expect(stats.totalExecutions).toBe(1);
      expect(stats.successfulExecutions).toBe(1);
      expect(stats.deployedContractsCount).toBe(1);
      expect(stats.currentGlobalStateRoot).toMatch(/^0x/);
    });
  });

  describe('46. Verifiable Automated Market Maker (AMM) & Liquidity Pools E2E', () => {
    it('should create liquidity pool, execute constant product swap with proof, and collect fees', () => {
      const amm = new OceanicosAMMEngine('e2e-amm-secret');

      // 1. Create Pool
      const pool = amm.createPool({
        tokenA: 'ETH',
        tokenB: 'USDC',
        initialA: 20,
        initialB: 60000,
        creatorDid: 'did:omega:agent:genesis-lp',
        feeBps: 30,
      });

      expect(pool.poolId).toBe('pool-ETH-USDC-30');
      expect(pool.reserveA).toBe(20);
      expect(pool.reserveB).toBe(60000);

      // 2. Add Liquidity
      const addReceipt = amm.addLiquidity({
        poolId: pool.poolId,
        amountA: 10,
        amountB: 30000,
        providerDid: 'did:omega:agent:secondary-lp',
      });
      expect(addReceipt.lpShares).toBeGreaterThan(0);
      expect(addReceipt.receiptProof).toMatch(/^0x/);

      // 3. Execute Swap
      const swap = amm.swap({
        poolId: pool.poolId,
        tokenIn: 'ETH',
        amountIn: 2,
        traderDid: 'did:omega:agent:arbitrageur',
        minAmountOut: 5000,
      });

      expect(swap.swapId).toMatch(/^swp-/);
      expect(swap.tokenOut).toBe('USDC');
      expect(swap.amountOut).toBeGreaterThan(5000);
      expect(swap.swapProof).toMatch(/^0x/);
      expect(swap.kAfter).toBeGreaterThanOrEqual(swap.kBefore);

      // 4. Check stats
      const stats = amm.getStats();
      expect(stats.totalPools).toBe(1);
      expect(stats.totalSwaps).toBe(1);
      expect(stats.cumulativeVolume).toBe(2);
      expect(stats.totalFeesCollected).toBeGreaterThan(0);
    });
  });

  // ─── Section 45: Verifiable Agent Reputation & Trust Scoring ────────────────
  describe('Section 45 — Verifiable Agent Reputation & Trust Scoring', () => {
    it('registers an agent, submits feedback, slashes, decays, and verifies stats via engine', () => {
      const rep = new OceanicosReputationEngine('test-reputation-secret');

      // 1. Register agents
      // score=500 → ESTABLISHED (boundary: ≥500 = ESTABLISHED, ≥300 = PROBATIONARY)
      const alice = rep.registerAgent({ agentDid: 'did:omega:alice', moniker: 'Alice' });
      const bob = rep.registerAgent({ agentDid: 'did:omega:bob', moniker: 'Bob', initialScore: 800 });
      expect(alice.reputationScore).toBe(500);
      expect(alice.trustTier).toBe('ESTABLISHED');
      expect(bob.reputationScore).toBe(800);
      expect(bob.trustTier).toBe('AUTHORITY');

      // 2. Submit feedback (Bob attests Alice positively, weighted by Bob's score)
      const receipt = rep.submitFeedback({
        fromDid: 'did:omega:bob',
        targetDid: 'did:omega:alice',
        scoreDelta: 50,
        reason: 'Excellent verified work on bridge contract deployment',
      });
      expect(receipt.receiptId).toMatch(/^fdbk-/);
      expect(receipt.feedbackProof).toMatch(/^0x/);
      expect(receipt.scoreDelta).toBeGreaterThan(50); // weighted up by Bob's authority score
      const aliceAfterFeedback = rep.getAgent('did:omega:alice')!;
      expect(aliceAfterFeedback.positiveAttestations).toBe(1);
      expect(aliceAfterFeedback.reputationScore).toBeGreaterThan(500);

      // 3. Slash Alice
      const slash = rep.slashAgent({
        targetDid: 'did:omega:alice',
        slashPenalty: 100,
        reason: 'Submitted invalid proof',
        evidenceHash: '0xevidencehash001',
      });
      expect(slash.slashId).toMatch(/^slsh-/);
      expect(slash.slashProof).toMatch(/^0x/);
      expect(rep.getAgent('did:omega:alice')!.slashedCount).toBe(1);

      // 4. Decay scores
      const scoreBefore = rep.getAgent('did:omega:alice')!.reputationScore;
      rep.decayScores();
      const scoreAfter = rep.getAgent('did:omega:alice')!.reputationScore;
      // Decay regresses toward baseline 500; score moves toward or stays at 500
      if (scoreBefore > 500) expect(scoreAfter).toBeLessThanOrEqual(scoreBefore);
      if (scoreBefore < 500) expect(scoreAfter).toBeGreaterThanOrEqual(scoreBefore);
      if (scoreBefore === 500) expect(scoreAfter).toBe(500);

      // 5. Stats
      const stats = rep.getStats();
      expect(stats.totalAgents).toBe(2);
      expect(stats.totalFeedbacks).toBe(1);
      expect(stats.totalSlashes).toBe(1);
      expect(stats.authorityAgents + stats.establishedAgents + stats.probationaryAgents + stats.untrustedAgents).toBe(2);
    });

    it('rejects self-feedback and invalid scoreDelta', () => {
      const rep = new OceanicosReputationEngine();
      rep.registerAgent({ agentDid: 'did:omega:carol', moniker: 'Carol' });
      expect(() => rep.submitFeedback({
        fromDid: 'did:omega:carol',
        targetDid: 'did:omega:carol',
        scoreDelta: 10,
        reason: 'Self-attestation attempt',
      })).toThrow('self-feedback');
      expect(() => rep.submitFeedback({
        fromDid: 'did:omega:unknown',
        targetDid: 'did:omega:carol',
        scoreDelta: 200,
        reason: 'Excessive delta',
      })).toThrow('scoreDelta');
    });

    it('verifies reputation engine full lifecycle: weighted feedback, tier transitions, and decay convergence', () => {
      const rep = new OceanicosReputationEngine('lifecycle-secret');

      // Register 3 agents at different tiers
      const a1 = rep.registerAgent({ agentDid: 'did:omega:node-alpha', moniker: 'NodeAlpha', initialScore: 200 });
      const a2 = rep.registerAgent({ agentDid: 'did:omega:node-beta', moniker: 'NodeBeta', initialScore: 500 });
      const a3 = rep.registerAgent({ agentDid: 'did:omega:node-gamma', moniker: 'NodeGamma', initialScore: 900 });

      expect(a1.trustTier).toBe('UNTRUSTED');
      expect(a2.trustTier).toBe('ESTABLISHED');
      expect(a3.trustTier).toBe('AUTHORITY');

      // NodeGamma provides positive feedback to NodeAlpha (high authority weight)
      rep.submitFeedback({
        fromDid: 'did:omega:node-gamma',
        targetDid: 'did:omega:node-alpha',
        scoreDelta: 80,
        reason: 'Delivered high-quality ZK proof for cross-shard verification',
      });

      const alphaUpdated = rep.getAgent('did:omega:node-alpha')!;
      expect(alphaUpdated.reputationScore).toBeGreaterThan(200);

      // Repeated decay cycles converge toward 500
      for (let i = 0; i < 10; i++) rep.decayScores();
      const allAgents = rep.getAgents();
      for (const ag of allAgents) {
        expect(Math.abs(ag.reputationScore - 500)).toBeLessThan(500);
      }

      // Verify feedbacks and slashes lists
      expect(rep.getFeedbacks().length).toBe(1);
      expect(rep.getSlashes().length).toBe(0);
    });
  });

  // ─── Section 48: Human Authorization Gate ────────────────────────────────────
  describe('Section 48 — Human Authorization Gate', () => {
    it('records authorization, override, and dissent events with attributed provenance', () => {
      const human = new HumanEngine();

      // APPROVAL (authorize)
      const approval = human.recordInput(
        'APPROVAL',
        'did:human:operator-01',
        'Manual review confirmed proposal meets safety and evidence thresholds',
        { proposalId: 'prop-xyz-001', riskScore: 0.12 },
        'ctx-governance-round-3'
      );
      expect(approval.id).toMatch(/^hum-/);
      expect(approval.type).toBe('APPROVAL');
      expect(approval.humanId).toBe('did:human:operator-01');
      expect(approval.contextId).toBe('ctx-governance-round-3');
      expect(approval.recordedAt).toBeTruthy();

      // DISSENT (reject)
      const dissent = human.recordInput(
        'DISSENT',
        'did:human:auditor-02',
        'Evidence confidence below 0.9 threshold — action must be blocked pending additional verification',
        { proposalId: 'prop-xyz-001', confidence: 0.76 },
        'ctx-governance-round-3'
      );
      expect(dissent.type).toBe('DISSENT');
      expect(dissent.humanId).toBe('did:human:auditor-02');

      // ACTION (override)
      const action = human.recordInput(
        'ACTION',
        'did:human:admin-00',
        'Emergency override: system drift detected, manual rollback authorized',
        { targetVersion: 'v2.1.3', rollbackReason: 'memory_leak_critical' }
      );
      expect(action.type).toBe('ACTION');

      // Context lookup — both approval and dissent share same contextId
      const contextInputs = human.getInputsForContext('ctx-governance-round-3');
      expect(contextInputs.length).toBe(2);
      expect(contextInputs.map((i) => i.type)).toContain('APPROVAL');
      expect(contextInputs.map((i) => i.type)).toContain('DISSENT');

      // Individual lookup
      const fetched = human.getInput(approval.id);
      expect(fetched).toBeDefined();
      expect(fetched!.rationale).toContain('safety');
    });

    it('enforces attribution: every human action has humanId and rationale', () => {
      const human = new HumanEngine();
      const fb = human.recordInput('FEEDBACK', 'did:human:reviewer-05', 'Verification results look correct');
      expect(fb.humanId).toBe('did:human:reviewer-05');
      expect(fb.rationale).toBeTruthy();
      expect(fb.id).toMatch(/^hum-/);
    });

    it('supports full value-judgment workflow with payload evidence', () => {
      const human = new HumanEngine();

      const vj = human.recordInput(
        'VALUE_JUDGMENT',
        'did:human:ethics-board',
        'Autonomous action poses low risk to user sovereignty; approved under charter Section 11',
        {
          actionType: 'deploy-new-policy',
          impactedUsers: 1200,
          evidenceHash: '0xabc123',
          riskTier: 'LOW',
        },
        'ctx-ethics-review-2026'
      );

      expect(vj.type).toBe('VALUE_JUDGMENT');
      expect((vj.payload as { riskTier: string }).riskTier).toBe('LOW');
      expect(vj.contextId).toBe('ctx-ethics-review-2026');
    });
  });

  // ─── Section 49: Unified 8-Stage Canonical Ecosystem OS Execution Flow ───────
  describe('Section 49 — Unified 8-Stage Canonical Ecosystem OS Execution Flow', () => {
    it('executes full pipeline: compile → observe → verify → attest → kernel_state → reputation → provenance', () => {
      const compiler = new RuleCompiler();
      const obs = new Observer();
      const verifier = new VerificationEngine();
      const att = new AttestationService();
      const kernel = new OceanicosKernel();
      const rep = new OceanicosReputationEngine();
      const provenance = new ProvenanceStore();

      // 1. Compile DSL rule into IR Program
      const ir = compiler.compile('latency-safety-rule', 'responseTime < 100 && statusCode == 200');
      expect(ir.name).toBe('latency-safety-rule');
      expect(ir.instructions.length).toBeGreaterThanOrEqual(4);

      // 2. Deterministic Observation
      const observation = obs.observe({
        claim: 'Autonomous high-frequency trade verification',
        category: 'health-check',
        source: { system: 'ecosystem-flow-test', version: '0.1.0', environment: 'test' },
        observedBy: 'did:omega:agent:lead-orchestrator',
        metadata: { responseTime: 25, statusCode: 200 },
        confidence: 0.99,
        confidenceReason: 'Simulated multi-sensor hardware telemetry',
      });
      provenance.recordObservation(observation);
      expect(observation.id).toMatch(/^obs-/);
      expect(observation.status).toBe('normalized');

      // 3. Invariant Verification
      const verification = verifier.verify(observation);
      provenance.recordVerification(verification);
      expect(verification.summary.passed).toBe(true);

      // 4. Cryptographic Attestation
      const attestation = att.attest(verification);
      provenance.recordAttestation(attestation);
      expect(attestation.signature).toMatch(/^0x/);

      // 5. Canonical Kernel State Transition
      const kernelState = kernel.transition({
        intent: {
          claim: observation.claim.statement,
          actors: ['did:omega:agent:lead-orchestrator'],
          inputs: observation.metadata,
          expectedOutputs: { passed: true },
          constraints: ['LATENCY_BOUND'],
          permissions: ['CAN_OBSERVE', 'CAN_VERIFY'],
          dependencies: [],
          maxRiskScore: 0.05,
          economicTarget: { targetValue: 1000, resourceBudget: 50 },
        },
        observation: {
          source: 'ecosystem-flow-test',
          observedAt: observation.timestamp,
          rawTelemetry: observation.metadata,
          epistemicType: 'FACT',
          confidence: observation.confidence,
        },
        evidenceItems: [
          {
            claim: observation.claim.statement,
            source: 'verification-engine',
            observationId: observation.id,
            commandOrTest: 'verifier.verify',
            status: 'PASSED',
            confidence: 0.99,
          },
        ],
        actionPlan: {
          targetService: 'canonical-kernel-ledger',
          payload: { attestation: attestation.signature },
          isDestructive: false,
          isFinancial: false,
          gasLimit: 50000,
          reversibility: 'REVERSIBLE',
        },
        autoAuthorizeIfNonDestructive: true,
      });

      expect(kernelState.stateId).toMatch(/^state-/);
      expect(kernelState.verificationStatus).toBe('VERIFIED');
      expect(kernelState.stateDeltaHash).toMatch(/^0x/);

      // 6. Reputation Ledger Update
      rep.registerAgent({
        agentDid: 'did:omega:agent:lead-orchestrator',
        moniker: 'LeadOrchestrator',
        initialScore: 500,
      });
      const repReceipt = rep.submitFeedback({
        fromDid: 'did:omega:kernel:core',
        targetDid: 'did:omega:agent:lead-orchestrator',
        scoreDelta: 25,
        reason: 'Optimal verified loop performance',
      });
      expect(repReceipt.newScore).toBe(525);
      expect(repReceipt.feedbackProof).toMatch(/^0x/);

      // 7. Provenance Integrity
      expect(provenance.size()).toBe(3);
      const events = provenance.getEntries();
      expect(events[0].type).toBe('OBSERVATION');
      expect(events[1].type).toBe('VERIFICATION');
      expect(events[2].type).toBe('ATTESTATION');
      expect(provenance.verifyChainIntegrity().valid).toBe(true);
    });
  });
});
