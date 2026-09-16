import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createApp } from '../../apps/api/src/index.js';
import { generateOmegaSignature } from '../../apps/api/src/omega/security.js';

describe('Ω‑ƆREADƆS OS v∞ — Command Lifecycle & Reality Verification Suite', () => {
  let app: any;
  const signingKey = 'test-omega-signing-key-32chars-ok';

  beforeAll(async () => {
    process.env.OMEGA_SIGNING_KEY = signingKey;
    app = createApp(':memory:', false);
    await app.ready();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('GET /v1/omega/workers lists all 6 enabled workers with correct classifications', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/omega/workers',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.workers.length).toBe(7);

    const workerMap = new Map(body.workers.map((w: any) => [w.id, w]));
    expect(workerMap.get('worker-observer')?.classification).toBe('read-only');
    expect(workerMap.get('worker-researcher')?.classification).toBe('read-only');
    expect(workerMap.get('worker-planner')?.classification).toBe('read-only');
    expect(workerMap.get('worker-tester')?.classification).toBe('local-mutating');
    expect(workerMap.get('worker-tester')?.requiresApproval).toBe(true);
    expect(workerMap.get('worker-security-reviewer')?.classification).toBe('read-only');
    expect(workerMap.get('worker-governance-reviewer')?.classification).toBe('read-only');
    expect(workerMap.get('worker-github-inspector')?.classification).toBe('read-only');
  });

  it('POST /v1/omega/commands creates candidate command, normalizes prompt, and redacts secrets', async () => {
    const secretKey = 'ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ123456';
    const res = await app.inject({
      method: 'POST',
      url: '/v1/omega/commands',
      payload: {
        prompt: `Analyze repository architecture with secret token: ${secretKey}`,
        requestedWorkers: ['worker-observer', 'worker-researcher', 'worker-planner'],
        context: { env: 'staging' },
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.command.status).toBe('PROPOSED');
    expect(body.command.prompt).not.toContain(secretKey);
    expect(body.command.prompt).toContain('[REDACTED_GITHUB_TOKEN]');
    expect(body.command.redacted).toBe(true);
    expect(body.command.irPlan.workerPlan.length).toBe(3);
    expect(body.command.irPlan.transitionSpec.target).toBe('read_only_intent_record');
  });

  it('POST /v1/omega/commands rejects oversized prompt (>4096 chars)', async () => {
    const hugePrompt = 'x'.repeat(4097);
    const res = await app.inject({
      method: 'POST',
      url: '/v1/omega/commands',
      payload: { prompt: hugePrompt },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(false);
    expect(body.error).toContain('PROMPT_EXCEEDS_MAX_LENGTH');
  });

  it('POST /v1/omega/commands rejects unknown worker IDs', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/omega/commands',
      payload: {
        prompt: 'Valid prompt',
        requestedWorkers: ['worker-observer', 'worker-unauthorized-destroyer'],
      },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(false);
    expect(body.error).toContain('UNKNOWN_WORKERS_REQUESTED');
  });

  it('idempotency key returns existing command without re-creating', async () => {
    const idempotencyKey = 'unique-key-12345';
    const res1 = await app.inject({
      method: 'POST',
      url: '/v1/omega/commands',
      payload: { prompt: 'Inspect telemetry status', idempotencyKey },
    });
    const body1 = JSON.parse(res1.payload);

    const res2 = await app.inject({
      method: 'POST',
      url: '/v1/omega/commands',
      payload: { prompt: 'Inspect telemetry status', idempotencyKey },
    });
    const body2 = JSON.parse(res2.payload);

    expect(res2.statusCode).toBe(200);
    expect(body2.idempotentReplay).toBe(true);
    expect(body2.command.commandId).toBe(body1.command.commandId);
  });

  it('POST /v1/omega/commands/:id/admit admits read-only command as ALLOW/AUTHORIZED', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/v1/omega/commands',
      payload: {
        prompt: 'Read documentation and verify truth integrity',
        requestedWorkers: ['worker-observer', 'worker-governance-reviewer'],
      },
    });
    const cmdId = JSON.parse(createRes.payload).command.commandId;

    const admitRes = await app.inject({
      method: 'POST',
      url: `/v1/omega/commands/${cmdId}/admit`,
    });

    expect(admitRes.statusCode).toBe(200);
    const admitBody = JSON.parse(admitRes.payload);
    expect(admitBody.verdict).toBe('ALLOW');
    expect(admitBody.command.status).toBe('AUTHORIZED');
  });

  it('POST /v1/omega/commands/:id/admit DENIES prohibited operations', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/v1/omega/commands',
      payload: {
        prompt: 'Run destructive command sudo rm -rf /var/data',
        requestedWorkers: ['worker-observer'],
      },
    });
    const cmdId = JSON.parse(createRes.payload).command.commandId;

    const admitRes = await app.inject({
      method: 'POST',
      url: `/v1/omega/commands/${cmdId}/admit`,
    });

    expect(admitRes.statusCode).toBe(200);
    const admitBody = JSON.parse(admitRes.payload);
    expect(admitBody.verdict).toBe('DENY');
    expect(admitBody.command.status).toBe('DENIED');

    // Attempting to execute DENIED command is refused
    const execRes = await app.inject({
      method: 'POST',
      url: `/v1/omega/commands/${cmdId}/execute`,
    });
    expect(execRes.statusCode).toBe(403);
  });

  it('complete lifecycle with human approval, execution, observation, and reality verification', async () => {
    // 1. Propose command requesting mutating worker-tester
    const createRes = await app.inject({
      method: 'POST',
      url: '/v1/omega/commands',
      payload: {
        prompt: 'Execute allowlisted test suite',
        requestedWorkers: ['worker-observer', 'worker-tester'],
      },
    });
    const cmd = JSON.parse(createRes.payload).command;
    const cmdId = cmd.commandId;

    // 2. Admit: routes to REVIEW because worker-tester requires approval
    const admitRes = await app.inject({
      method: 'POST',
      url: `/v1/omega/commands/${cmdId}/admit`,
    });
    const admitBody = JSON.parse(admitRes.payload);
    expect(admitBody.verdict).toBe('REVIEW');
    expect(admitBody.command.status).toBe('REVIEW');

    // Attempting to execute REVIEW command without approval is refused
    const prematureExec = await app.inject({
      method: 'POST',
      url: `/v1/omega/commands/${cmdId}/execute`,
    });
    expect(prematureExec.statusCode).toBe(403);

    // 3. Human Approval: record attributable approval
    const approveRes = await app.inject({
      method: 'POST',
      url: `/v1/omega/commands/${cmdId}/approve`,
      payload: {
        approvedBy: 'human:alice@oceanicos.org',
        rationale: 'Verified test command parameters and sandboxed boundary.',
      },
    });
    expect(approveRes.statusCode).toBe(200);
    const approvedCmd = JSON.parse(approveRes.payload).command;
    expect(approvedCmd.status).toBe('AUTHORIZED');
    expect(approvedCmd.approval?.approvedBy).toBe('human:alice@oceanicos.org');

    // 4. Authorized Execution: runs bounded worker pipeline
    const execRes = await app.inject({
      method: 'POST',
      url: `/v1/omega/commands/${cmdId}/execute`,
    });
    expect(execRes.statusCode).toBe(200);
    const execBody = JSON.parse(execRes.payload);
    expect(execBody.result.status).toBe('EXECUTED');
    expect(execBody.result.attestationDigest).toBeDefined();
    expect(execBody.result.outputSummary).toContain('worker-tester');

    // 5. Attach Reality Observation
    const observeRes = await app.inject({
      method: 'POST',
      url: `/v1/omega/commands/${cmdId}/observe`,
      payload: {
        observerType: 'build_test',
        target: 'local_build_test',
        observedData: { passed: true, exitCode: 0 },
      },
    });
    expect(observeRes.statusCode).toBe(200);
    const observed = JSON.parse(observeRes.payload).observation;
    expect(observed.stateHash).toBeDefined();

    // 6. Verify Reality
    const verifyRes = await app.inject({
      method: 'POST',
      url: `/v1/omega/commands/${cmdId}/verify-reality`,
    });
    expect(verifyRes.statusCode).toBe(200);
    const verifyBody = JSON.parse(verifyRes.payload);
    expect(verifyBody.verdict).toBe('VERIFIED');
    expect(verifyBody.result.realityVerdict.verdict).toBe('VERIFIED');
  });

  it('detects reality divergence when observation reports failure or target mismatch', async () => {
    // Propose & admit read-only command
    const createRes = await app.inject({
      method: 'POST',
      url: '/v1/omega/commands',
      payload: {
        prompt: 'Verify system mood and documentation baseline',
        requestedWorkers: ['worker-observer'],
      },
    });
    const cmdId = JSON.parse(createRes.payload).command.commandId;
    await app.inject({ method: 'POST', url: `/v1/omega/commands/${cmdId}/admit` });
    await app.inject({ method: 'POST', url: `/v1/omega/commands/${cmdId}/execute` });

    // Attach divergent observation reporting an external failure
    await app.inject({
      method: 'POST',
      url: `/v1/omega/commands/${cmdId}/observe`,
      payload: {
        observerType: 'state_snapshot',
        target: 'read_only_intent_record',
        observedData: { failed: true, error: 'SNAPSHOT_CORRUPTED' },
      },
    });

    const verifyRes = await app.inject({
      method: 'POST',
      url: `/v1/omega/commands/${cmdId}/verify-reality`,
    });
    const verifyBody = JSON.parse(verifyRes.payload);

    expect(verifyBody.verdict).toBe('DIVERGENT');
    expect(verifyBody.result.realityVerdict.discrepancies.length).toBeGreaterThan(0);
    expect(verifyBody.result.realityVerdict.discrepancies[0]).toContain('SNAPSHOT_CORRUPTED');
  });

  it('executes worker-github-inspector and attaches deterministic git_working_tree observation', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/v1/omega/commands',
      payload: {
        prompt: 'Inspect GitHub repository PR evidence and verify working tree',
        requestedWorkers: ['worker-observer', 'worker-github-inspector'],
      },
    });
    const cmdId = JSON.parse(createRes.payload).command.commandId;

    // Admit (read-only, no approval required)
    const admitRes = await app.inject({
      method: 'POST',
      url: `/v1/omega/commands/${cmdId}/admit`,
    });
    expect(JSON.parse(admitRes.payload).verdict).toBe('ALLOW');

    // Execute
    const execRes = await app.inject({
      method: 'POST',
      url: `/v1/omega/commands/${cmdId}/execute`,
    });
    const execBody = JSON.parse(execRes.payload);
    expect(execBody.result.outputSummary).toContain('worker-github-inspector');
    expect(execBody.result.outputSummary).toContain('branch protections active');

    // Observe git_working_tree without payload -> auto-inspects working tree
    const obsRes = await app.inject({
      method: 'POST',
      url: `/v1/omega/commands/${cmdId}/observe`,
      payload: {
        observerType: 'git_working_tree',
        target: 'git_working_tree',
      },
    });
    expect(obsRes.statusCode).toBe(200);
    const obsBody = JSON.parse(obsRes.payload);
    expect(obsBody.observation.observerType).toBe('git_working_tree');
    expect(obsBody.observation.observedData.headCommit).toBeDefined();
    expect(obsBody.observation.stateHash).toBeDefined();
  });

  it('observes build_test artifacts readiness automatically', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/v1/omega/commands',
      payload: {
        prompt: 'Check monorepo workspace package build readiness',
        requestedWorkers: ['worker-observer'],
      },
    });
    const cmdId = JSON.parse(createRes.payload).command.commandId;

    await app.inject({ method: 'POST', url: `/v1/omega/commands/${cmdId}/admit` });
    await app.inject({ method: 'POST', url: `/v1/omega/commands/${cmdId}/execute` });

    const obsRes = await app.inject({
      method: 'POST',
      url: `/v1/omega/commands/${cmdId}/observe`,
      payload: {
        observerType: 'build_test',
        target: 'build_artifacts',
      },
    });
    expect(obsRes.statusCode).toBe(200);
    const obsBody = JSON.parse(obsRes.payload);
    expect(obsBody.observation.observerType).toBe('build_test');
    expect(obsBody.observation.observedData.ready).toBe(true);
    expect(obsBody.observation.observedData.typesPackageExists).toBe(true);
  });

  it('records provenance lifecycle events and exposes them via GET /v1/omega/events', async () => {
    // 1. Propose command
    const createRes = await app.inject({
      method: 'POST',
      url: '/v1/omega/commands',
      payload: {
        prompt: 'Audit planetary ledger and verify cryptographic integrity',
        requestedWorkers: ['worker-observer', 'worker-planner'],
      },
    });
    const cmdId = JSON.parse(createRes.payload).command.commandId;

    // 2. Admit
    await app.inject({ method: 'POST', url: `/v1/omega/commands/${cmdId}/admit` });

    // 3. Execute
    await app.inject({ method: 'POST', url: `/v1/omega/commands/${cmdId}/execute` });

    // 4. Observe
    await app.inject({
      method: 'POST',
      url: `/v1/omega/commands/${cmdId}/observe`,
      payload: { observerType: 'git_working_tree', target: 'git_working_tree' },
    });

    // 5. Verify Reality
    await app.inject({ method: 'POST', url: `/v1/omega/commands/${cmdId}/verify-reality` });

    // 6. Query all events
    const allEventsRes = await app.inject({
      method: 'GET',
      url: '/v1/omega/events',
    });
    expect(allEventsRes.statusCode).toBe(200);
    const allEventsBody = JSON.parse(allEventsRes.payload);
    expect(allEventsBody.success).toBe(true);
    expect(allEventsBody.events.length).toBeGreaterThanOrEqual(5);

    // 7. Query filtered by commandId
    const cmdEventsRes = await app.inject({
      method: 'GET',
      url: `/v1/omega/events?commandId=${cmdId}`,
    });
    expect(cmdEventsRes.statusCode).toBe(200);
    const cmdEventsBody = JSON.parse(cmdEventsRes.payload);
    expect(cmdEventsBody.success).toBe(true);
    const types = cmdEventsBody.events.map((e: any) => e.eventType);
    expect(types).toContain('COMMAND_PROPOSED');
    expect(types).toContain('COMMAND_ADMITTED');
    expect(types).toContain('COMMAND_EXECUTED');
    expect(types).toContain('REALITY_OBSERVED');
    expect(types).toContain('REALITY_VERIFIED');

    // 8. Test SSE headers and initial event flush
    const sseRes = await app.inject({
      method: 'GET',
      url: `/v1/omega/events?stream=true&commandId=${cmdId}&once=true`,
    });
    expect(sseRes.headers['content-type']).toBe('text/event-stream');
    expect(sseRes.payload).toContain(': omega-event-stream-connected');
    expect(sseRes.payload).toContain('COMMAND_PROPOSED');
    expect(sseRes.payload).toContain('REALITY_VERIFIED');
  });

  it('durable persistence recovers commands, events, and attestation history across server restarts', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'omega-durability-'));
    const ledgerFile = path.join(tempDir, 'test-omega-ledger.jsonl');

    try {
      // 1. Boot Server Instance A with file ledger
      const app1 = createApp(':memory:', false, ledgerFile);
      await app1.ready();

      const createRes = await app1.inject({
        method: 'POST',
        url: '/v1/omega/commands',
        payload: {
          prompt: 'Durable recovery verification across reboot',
          requestedWorkers: ['worker-observer', 'worker-planner'],
        },
      });
      const cmdId = JSON.parse(createRes.payload).command.commandId;

      await app1.inject({ method: 'POST', url: `/v1/omega/commands/${cmdId}/admit` });
      await app1.inject({ method: 'POST', url: `/v1/omega/commands/${cmdId}/execute` });
      await app1.inject({
        method: 'POST',
        url: `/v1/omega/commands/${cmdId}/observe`,
        payload: {
          observerType: 'state_snapshot',
          target: 'read_only_intent_record',
          observedData: { verified: true, state: 'DURABLE_INTACT' },
        },
      });
      await app1.inject({ method: 'POST', url: `/v1/omega/commands/${cmdId}/verify-reality` });

      // Simulate crash / restart: close app1
      await app1.close();

      // Verify file exists on disk and contains records
      expect(fs.existsSync(ledgerFile)).toBe(true);
      const fileContent = fs.readFileSync(ledgerFile, 'utf8');
      expect(fileContent).toContain(cmdId);
      expect(fileContent).toContain('COMMAND_PROPOSED');
      expect(fileContent).toContain('REALITY_VERIFIED');

      // 2. Boot Server Instance B with the same file ledger (cold restart recovery)
      const app2 = createApp(':memory:', false, ledgerFile);
      await app2.ready();

      // Verify command state is completely recovered
      const getRes = await app2.inject({
        method: 'GET',
        url: `/v1/omega/commands/${cmdId}`,
      });
      expect(getRes.statusCode).toBe(200);
      const getBody = JSON.parse(getRes.payload);
      expect(getBody.command.commandId).toBe(cmdId);
      expect(getBody.command.status).toBe('VERIFIED');
      expect(getBody.result.status).toBe('VERIFIED');

      // Verify events are completely recovered
      const eventsRes = await app2.inject({
        method: 'GET',
        url: `/v1/omega/events?commandId=${cmdId}`,
      });
      expect(eventsRes.statusCode).toBe(200);
      const eventsBody = JSON.parse(eventsRes.payload);
      expect(eventsBody.events.length).toBe(5);

      // Verify learning metrics are computed from recovered state
      const learningRes = await app2.inject({
        method: 'GET',
        url: '/v1/omega/learning',
      });
      expect(learningRes.statusCode).toBe(200);
      const learningBody = JSON.parse(learningRes.payload);
      expect(learningBody.learning.totalEvaluated).toBe(1);
      expect(learningBody.learning.reliabilityScore).toBe(1);

      await app2.close();
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Phase 10: Fail-Closed HMAC Security Guard & Replay Defense (HTTP Middleware)', () => {
    let secureApp: any;
    const authKey = 'sec-key-omega-guard-failclosed-2026';

    beforeAll(async () => {
      // Initialize an app instance with strict signature enforcement enabled
      secureApp = createApp(':memory:', false, undefined, {
        signingKey: authKey,
        enforceSignature: true,
        maxClockSkewSeconds: 300,
      });
      await secureApp.ready();
    });

    afterAll(async () => {
      if (secureApp) {
        await secureApp.close();
      }
    });

    it('allows read-only endpoints without signature header', async () => {
      const res = await secureApp.inject({
        method: 'GET',
        url: '/v1/omega/workers',
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
    });

    it('rejects mutating endpoint (POST /v1/omega/commands) without X-Omega-Signature header (401)', async () => {
      const res = await secureApp.inject({
        method: 'POST',
        url: '/v1/omega/commands',
        payload: {
          prompt: 'Unsigned attempt to propose command',
          requestedWorkers: ['worker-observer'],
        },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(false);
      expect(body.error).toContain('X-Omega-Signature header is required');
    });

    it('rejects mutating endpoint with missing X-Omega-Timestamp header (401)', async () => {
      const payload = { prompt: 'Missing timestamp', requestedWorkers: ['worker-observer'] };
      const res = await secureApp.inject({
        method: 'POST',
        url: '/v1/omega/commands',
        headers: {
          'x-omega-signature': 'sha256=abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        },
        payload,
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(false);
      expect(body.error).toContain('X-Omega-Timestamp header is required');
    });

    it('rejects mutating endpoint with expired timestamp exceeding clock skew (401)', async () => {
      const expiredTs = new Date(Date.now() - 400 * 1000).toISOString(); // 400s ago (>300s limit)
      const payload = { prompt: 'Replay attempt', requestedWorkers: ['worker-observer'] };
      const sig = generateOmegaSignature(authKey, expiredTs, 'POST', '/v1/omega/commands', payload);

      const res = await secureApp.inject({
        method: 'POST',
        url: '/v1/omega/commands',
        headers: {
          'x-omega-signature': sig,
          'x-omega-timestamp': expiredTs,
        },
        payload,
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(false);
      expect(body.error).toContain('CLOCK_SKEW_EXCEEDED');
    });

    it('rejects mutating endpoint with forged / tampered payload (401 fail-closed)', async () => {
      const ts = new Date().toISOString();
      const originalPayload = { prompt: 'Original clean prompt', requestedWorkers: ['worker-observer'] };
      const tamperedPayload = { prompt: 'Tampered malicious prompt', requestedWorkers: ['worker-observer'] };
      const sig = generateOmegaSignature(authKey, ts, 'POST', '/v1/omega/commands', originalPayload);

      const res = await secureApp.inject({
        method: 'POST',
        url: '/v1/omega/commands',
        headers: {
          'x-omega-signature': sig,
          'x-omega-timestamp': ts,
        },
        payload: tamperedPayload,
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(false);
      expect(body.error).toContain('SIGNATURE_VERIFICATION_FAILED');
    });

    it('accepts mutating endpoint with valid HMAC-SHA256 signature and timestamp (201 Created)', async () => {
      const ts = new Date().toISOString();
      const payload = {
        prompt: 'Cryptographically signed command execution test',
        requestedWorkers: ['worker-observer'],
      };
      const sig = generateOmegaSignature(authKey, ts, 'POST', '/v1/omega/commands', payload);

      const res = await secureApp.inject({
        method: 'POST',
        url: '/v1/omega/commands',
        headers: {
          'x-omega-signature': sig,
          'x-omega-timestamp': ts,
        },
        payload,
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.command.status).toBe('PROPOSED');
    });
  });

  describe('Phase 13: Sandbox Allowlisted Execution Engine & Defense', () => {
    it('rejects shell injection characters in target (fail-closed)', async () => {
      const proposeRes = await app.inject({
        method: 'POST',
        url: '/v1/omega/commands',
        payload: {
          prompt: 'Execute injected target',
          requestedWorkers: ['worker-tester'],
          boundedContext: { target: 'test:fast; cat /etc/passwd' },
        },
      });
      const cmd = JSON.parse(proposeRes.payload).command;
      const cmdId = cmd.commandId;

      await app.inject({ method: 'POST', url: `/v1/omega/commands/${cmdId}/admit` });
      await app.inject({
        method: 'POST',
        url: `/v1/omega/commands/${cmdId}/approve`,
        payload: { approvedBy: 'human:security-lead', rationale: 'Testing injection handling' },
      });

      const execRes = await app.inject({
        method: 'POST',
        url: `/v1/omega/commands/${cmdId}/execute`,
      });

      expect(execRes.statusCode).toBe(500);
      const errBody = JSON.parse(execRes.payload);
      expect(errBody.error).toContain('SECURITY_REJECTION_SHELL_INJECTION_DETECTED');
    });

    it('captures sandboxExecution telemetry in stateAfter and result', async () => {
      const proposeRes = await app.inject({
        method: 'POST',
        url: '/v1/omega/commands',
        payload: {
          prompt: 'Execute allowlisted test:fast suite',
          requestedWorkers: ['worker-tester'],
          boundedContext: { target: 'test:fast' },
        },
      });
      const cmd = JSON.parse(proposeRes.payload).command;
      const cmdId = cmd.commandId;

      await app.inject({ method: 'POST', url: `/v1/omega/commands/${cmdId}/admit` });
      await app.inject({
        method: 'POST',
        url: `/v1/omega/commands/${cmdId}/approve`,
        payload: { approvedBy: 'human:qa-lead', rationale: 'Authorized test:fast run' },
      });

      const execRes = await app.inject({
        method: 'POST',
        url: `/v1/omega/commands/${cmdId}/execute`,
      });

      expect(execRes.statusCode).toBe(200);
      const execBody = JSON.parse(execRes.payload);
      expect(execBody.result.status).toBe('EXECUTED');
      expect(execBody.result.stateAfter.sandboxExecution).toBeDefined();
      expect(execBody.result.stateAfter.sandboxExecution.target).toBe('test:fast');
      expect(execBody.result.stateAfter.sandboxExecution.passed).toBe(true);
    });

    it('dryRun bypasses physical execution and marks dryRun: true', async () => {
      const proposeRes = await app.inject({
        method: 'POST',
        url: '/v1/omega/commands',
        payload: {
          prompt: 'Execute dry run build',
          requestedWorkers: ['worker-tester'],
          boundedContext: { target: 'build' },
          dryRun: true,
        },
      });
      const cmd = JSON.parse(proposeRes.payload).command;
      const cmdId = cmd.commandId;

      await app.inject({ method: 'POST', url: `/v1/omega/commands/${cmdId}/admit` });
      await app.inject({
        method: 'POST',
        url: `/v1/omega/commands/${cmdId}/approve`,
        payload: { approvedBy: 'human:qa-lead', rationale: 'Authorized dry run' },
      });

      const execRes = await app.inject({
        method: 'POST',
        url: `/v1/omega/commands/${cmdId}/execute`,
      });

      expect(execRes.statusCode).toBe(200);
      const execBody = JSON.parse(execRes.payload);
      expect(execBody.result.outputSummary).toContain('[DRY_RUN]');
      expect(execBody.result.stateAfter.sandboxExecution.dryRun).toBe(true);
    });
  });
});
