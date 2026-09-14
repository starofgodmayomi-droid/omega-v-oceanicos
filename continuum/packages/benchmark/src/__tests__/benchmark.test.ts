import { VerificationBenchmarkEngine } from '../index';
import { OceanicosClient } from '@omega-v/sdk';

describe('@omega-v/benchmark — VerificationBenchmarkEngine', () => {
  let engine: VerificationBenchmarkEngine;
  let client: OceanicosClient;

  beforeEach(() => {
    engine = new VerificationBenchmarkEngine();
    client = new OceanicosClient({ mode: 'local' });
  });

  describe('Micro-Benchmark Execution', () => {
    it('should benchmark complete verification loop with latency quantiles', async () => {
      const result = await engine.benchmarkLoop(client, 10);

      expect(result.testName).toBe('Full Verification Loop E2E');
      expect(result.iterations).toBe(10);
      expect(result.totalDurationMs).toBeGreaterThan(0);
      expect(result.throughputOpsSec).toBeGreaterThan(0);
      expect(result.latency.p50Ms).toBeGreaterThanOrEqual(0);
      expect(result.latency.p90Ms).toBeGreaterThanOrEqual(result.latency.p50Ms);
      expect(result.latency.p99Ms).toBeGreaterThanOrEqual(result.latency.p90Ms);
    });

    it('should benchmark rule evaluation throughput', () => {
      const result = engine.benchmarkRuleEvaluation(client.getVerificationEngine(), 30);

      expect(result.testName).toBe('Rule Evaluation Engine');
      expect(result.iterations).toBe(30);
      expect(result.throughputOpsSec).toBeGreaterThan(0);
      expect(result.latency.minMs).toBeGreaterThanOrEqual(0);
    });

    it('should benchmark HMAC attestation signing speed', () => {
      const result = engine.benchmarkAttestation(client.getAttestationService(), 30);

      expect(result.testName).toBe('HMAC Attestation Signing');
      expect(result.iterations).toBe(30);
      expect(result.throughputOpsSec).toBeGreaterThan(0);
    });

    it('should benchmark provenance store hash-chain insertion', () => {
      const result = engine.benchmarkProvenanceStore(client.getStore(), 30);

      expect(result.testName).toBe('Provenance Store Hash Chain Insertion');
      expect(result.iterations).toBe(30);
      expect(result.throughputOpsSec).toBeGreaterThan(0);
    });

    it('should benchmark grand continuum full-stack flow with quantiles', async () => {
      const result = await engine.benchmarkGrandFlow(client, 5);

      expect(result.testName).toBe('Grand Continuum Full-Stack E2E');
      expect(result.iterations).toBe(5);
      expect(result.totalDurationMs).toBeGreaterThan(0);
      expect(result.throughputOpsSec).toBeGreaterThan(0);
      expect(result.latency.p50Ms).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Benchmark Suite Orchestration', () => {
    it('should run full suite and record all metrics in latestResults', async () => {
      const suiteResults = await engine.runSuite(client, 5);

      expect(suiteResults.loop).toBeDefined();
      expect(suiteResults.rules).toBeDefined();
      expect(suiteResults.attestation).toBeDefined();
      expect(suiteResults.store).toBeDefined();

      const cached = engine.getLatestResults();
      expect(Object.keys(cached)).toHaveLength(4);
    });
  });
});
