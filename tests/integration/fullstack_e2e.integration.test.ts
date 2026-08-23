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
});
