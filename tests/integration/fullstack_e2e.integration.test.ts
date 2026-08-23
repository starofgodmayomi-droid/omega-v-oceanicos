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
});
