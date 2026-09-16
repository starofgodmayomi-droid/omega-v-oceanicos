import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { PluralismConvergenceMatrix } from '@oceanicos/pluralism';
import { HiggsfieldBridgeEngine } from '@oceanicos/generative';
import type { IObservation, IRegionalFaceStream } from '@oceanicos/types';
import { createApp } from '../../apps/api/src/index.js';

describe('Pluralism Convergence Matrix & Hardened Execution Test Suite', () => {
  const validKey = '0123456789abcdef0123456789abcdef';
  let app: any;

  beforeAll(async () => {
    process.env.OMEGA_SIGNING_KEY = validKey;
    app = createApp(':memory:', false);
    await app.ready();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('fails fail-closed if OMEGA_SIGNING_KEY is missing or too short', () => {
    const original = process.env.OMEGA_SIGNING_KEY;
    delete process.env.OMEGA_SIGNING_KEY;

    const obs: IObservation = {
      uuid: 'obs-1',
      timestamp: new Date().toISOString(),
      siliconYield: 0.95,
      gridLoadMegawatts: 1200,
      acceleratorInventory: 100000,
      hardwareState: { cpu: 10, ram: 4096, io: 'OK', ts: new Date().toISOString() },
      globalNewsFeed: [],
      decentralizedStreams: [
        {
          nodeId: 'node-1',
          regionCode: 'AF-WEST',
          telemetryMetric: 0.95,
          storyPayload: 'Payload 1',
          timestamp: new Date().toISOString(),
        },
      ],
    };

    expect(() => PluralismConvergenceMatrix.processConvergence(obs)).toThrow(
      'ATTESTATION_SIGNING_KEY_REQUIRED_OR_INVALID'
    );

    process.env.OMEGA_SIGNING_KEY = original;
  });

  it('fails fail-closed when zero regional faces are detected', () => {
    const obs: IObservation = {
      uuid: 'obs-empty',
      timestamp: new Date().toISOString(),
      siliconYield: 0.95,
      gridLoadMegawatts: 1200,
      acceleratorInventory: 100000,
      hardwareState: { cpu: 10, ram: 4096, io: 'OK', ts: new Date().toISOString() },
      globalNewsFeed: [],
      decentralizedStreams: [],
    };

    expect(() => PluralismConvergenceMatrix.processConvergence(obs)).toThrow(
      'CONVERGENCE_FAILED: ZERO_REGIONAL_FACES_DETECTED'
    );
  });

  it('converges successfully when >= 66% noiseless signals pass gate', () => {
    const streams: IRegionalFaceStream[] = [
      { nodeId: 'node-1', regionCode: 'AF-WEST', telemetryMetric: 0.95, storyPayload: 'A', timestamp: new Date().toISOString() },
      { nodeId: 'node-2', regionCode: 'EU-CENTRAL', telemetryMetric: 0.92, storyPayload: 'B', timestamp: new Date().toISOString() },
      { nodeId: 'node-3', regionCode: 'AP-EAST', telemetryMetric: 0.70, storyPayload: 'C', timestamp: new Date().toISOString() },
    ];

    const obs: IObservation = {
      uuid: 'obs-converged',
      timestamp: new Date().toISOString(),
      siliconYield: 0.95,
      gridLoadMegawatts: 1200,
      acceleratorInventory: 100000,
      hardwareState: { cpu: 10, ram: 4096, io: 'OK', ts: new Date().toISOString() },
      globalNewsFeed: [],
      decentralizedStreams: streams,
    };

    const evidence = PluralismConvergenceMatrix.processConvergence(obs);

    expect(evidence.status).toBe('PASS');
    expect(obs.unifiedConsensus).toBeDefined();
    expect(obs.unifiedConsensus?.activeFacesCount).toBe(3);
    expect(obs.unifiedConsensus?.agreementRatio).toBeCloseTo(2 / 3, 2);
    expect(obs.unifiedConsensus?.verdict).toBe('PASS');
    expect(typeof evidence.signatureProof).toBe('string');
    expect(evidence.signatureProof.length).toBe(64);
  });

  it('verdicts DIVERGENT when agreement ratio is below threshold', () => {
    const streams: IRegionalFaceStream[] = [
      { nodeId: 'node-1', regionCode: 'AF-WEST', telemetryMetric: 0.50, storyPayload: 'A', timestamp: new Date().toISOString() },
      { nodeId: 'node-2', regionCode: 'EU-CENTRAL', telemetryMetric: 0.60, storyPayload: 'B', timestamp: new Date().toISOString() },
      { nodeId: 'node-3', regionCode: 'AP-EAST', telemetryMetric: 0.95, storyPayload: 'C', timestamp: new Date().toISOString() },
    ];

    const obs: IObservation = {
      uuid: 'obs-divergent',
      timestamp: new Date().toISOString(),
      siliconYield: 0.95,
      gridLoadMegawatts: 1200,
      acceleratorInventory: 100000,
      hardwareState: { cpu: 10, ram: 4096, io: 'OK', ts: new Date().toISOString() },
      globalNewsFeed: [],
      decentralizedStreams: streams,
    };

    const evidence = PluralismConvergenceMatrix.processConvergence(obs);

    expect(evidence.status).toBe('DIVERGENT');
    expect(obs.unifiedConsensus?.verdict).toBe('DIVERGENT');
  });

  it('POST /v1/pluralism/converge executes convergence through API route', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/pluralism/converge',
      payload: {
        streams: [
          { nodeId: 'node-1', regionCode: 'AF-WEST', telemetryMetric: 0.98, storyPayload: 'Delta', timestamp: new Date().toISOString() },
          { nodeId: 'node-2', regionCode: 'NA-EAST', telemetryMetric: 0.91, storyPayload: 'Echo', timestamp: new Date().toISOString() },
        ],
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.consensusMatrix.verdict).toBe('PASS');
    expect(body.evidence.signatureProof).toBeDefined();
  });

  it('POST /v1/artemis/action rejects empty command with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/artemis/action',
      payload: { command: '   ' },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(false);
    expect(body.error).toBe('COMMAND_REQUIRED');
  });

  it('HiggsfieldBridgeEngine fails safely without executing child process when prompt is blank', async () => {
    const job = await HiggsfieldBridgeEngine.executeTextToImage('   ');
    expect(job.status).toBe('failed');
    expect(job.jobId).toMatch(/^job_/);
  });
});
