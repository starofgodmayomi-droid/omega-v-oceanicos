#!/usr/bin/env node

type PersistenceAcknowledgement = {
  operatorId: string;
  reason: string;
  action:
    'review-partial-recovery' | 'review-key-rotation' | 'review-partial-recovery-and-key-rotation';
  acknowledgedAt: string;
  requestId: string;
};
type ReencryptionRecovery = {
  status: 'none' | 'recovered' | 'blocked';
  reason: string | null;
};
type PersistenceReencryption = {
  operatorId: string;
  reason: string;
  action: 'review-key-rotation';
  reencryptedAt: string;
  requestId: string;
  snapshotRecords: number;
  eventRecords: number;
  snapshotKeySource: string;
  eventLogKeySource: string;
};

type HealthResponse = {
  data: {
    status: 'ok';
    readiness: 'ready' | 'degraded';
    checks: {
      observer: 'ready';
      verifier: 'ready';
      attester: 'ready';
      memory: { status: 'ready' | 'degraded'; integrity: boolean; encryption: string };
      persistence: {
        mode: 'file' | 'memory';
        encryption: string;
        eventLogSource: 'disabled' | 'missing' | 'restored' | 'partial';
        eventLogReason: string | null;
        eventLogKeySource: 'none' | 'current' | 'previous' | 'mixed';
        currentKeyFingerprint: string | null;
        previousKeyFingerprint: string | null;
        rotationPending: boolean;
        operatorAction:
          | 'none'
          | 'review-partial-recovery'
          | 'review-key-rotation'
          | 'review-partial-recovery-and-key-rotation';
        acknowledgement: PersistenceAcknowledgement | null;
        reencryptionRecovery: ReencryptionRecovery;
        recoveryPolicy: { mode: string; reference: string | null; reason: string | null };
        deletionPolicy: { mode: string; reason: string | null; verified: false };
        custodyPolicy: {
          mode: string;
          reference: string | null;
          reason: string | null;
          verified: false;
        };
        coordinationPolicy: {
          mode: string;
          reference: string | null;
          reason: string | null;
          evidence: 'runtime-observed';
          scope: 'single-process';
          limitations: string[];
          verified: false;
        };
        coverage: {
          complete: false;
          surfaces: Array<{
            name: string;
            encryption: string;
            keySource: string;
            evidence: string;
          }>;
          unverifiedSurfaces: string[];
          unverifiedReasons: string[];
        };
        skippedLogEntries: number;
      };
    };
    policy: {
      attestationAlgorithm: string;
      attestationTtlMs: number | null;
      authMode: 'local' | 'required';
      readAuthConfigured: boolean;
      adminAuthConfigured: boolean;
      adminOperatorAllowlistRequired: boolean;
      revocationEnabled: boolean;
    };
  };
  timestamp: string;
};

type StateResponse = {
  data: {
    readiness: 'ready' | 'degraded';
    trustBasis: { serviceReadiness: 0 | 1 };
  };
  timestamp: string;
};

type ObservabilityResponse = {
  data: {
    runtime: {
      mode: string;
      persistence: string;
      services: string[];
      lastActivity: string | null;
      eventLogSource: 'disabled' | 'missing' | 'restored' | 'partial';
      skippedLogEntries: number;
      eventLogReason: string | null;
      eventLogEncryptionKeySource: 'none' | 'current' | 'previous' | 'mixed';
      persistenceCurrentKeyFingerprint: string | null;
      persistencePreviousKeyFingerprint: string | null;
      persistenceRotationPending: boolean;
      operatorAction:
        | 'none'
        | 'review-partial-recovery'
        | 'review-key-rotation'
        | 'review-partial-recovery-and-key-rotation';
      reencryptionRecovery: ReencryptionRecovery;
    };
    provenance: {
      recentEvents: number;
      durableEvents: number;
      skippedLogEntries: number;
      completedRuns: number;
      lastRequestId: string | null;
      lastCorrelationId: string | null;
    };
    trust: {
      verificationCoverage: number | null;
      attestationValidity: boolean | null;
    };
    memory: {
      entries: number;
      intact: boolean;
      appendOnly: boolean;
    };
  };
  timestamp: string;
};

type EventsResponse = {
  data: Array<Record<string, unknown>>;
  meta?: { window?: number; note?: string };
  timestamp: string;
};

type AuditResponse = {
  data: Array<Record<string, unknown>>;
  meta: {
    bounded: true;
    limit: number;
    total: number;
    source: string;
    skipped: number;
    keySource: string;
    filters: Record<string, string | null>;
  };
  timestamp: string;
};

type ExportResponse = {
  data: {
    observability: ObservabilityResponse['data'];
    events: Array<Record<string, unknown>>;
    runs: RunsResponse['data'];
  };
  meta: { bounded: boolean; eventWindow: number; runWindow: number };
  timestamp: string;
};

type RunsResponse = {
  data: Array<{
    observation: { id: string; claim?: { statement?: string } };
    verification: { id: string; summary: { passed: boolean; confidence?: number } };
    attestation: { id: string; verified: boolean; attestedAt?: string; revoked?: boolean };
  }>;
  timestamp: string;
};

type LocalJobState = 'queued' | 'running' | 'succeeded' | 'failed' | 'unknown';
type LocalJobsResponse = {
  data: {
    jobs: Array<{
      id: string;
      state: LocalJobState;
      attempt: number;
      workerId: string | null;
      createdAt: string;
      updatedAt: string;
      finishedAt: string | null;
      errorClass: string | null;
    }>;
    status: {
      enabled: boolean;
      durable: boolean;
      source: 'memory' | 'file';
      encryption: 'disabled' | 'aes-256-gcm';
      counts: Record<LocalJobState, number>;
      recentWindow: number;
    };
  };
  timestamp: string;
};
type Revocation = {
  id: string;
  attestationId: string;
  reason: string;
  revokedBy: string;
  revokedAt: string;
};

type RevocationIntegrity = 'disabled' | 'legacy' | 'intact' | 'mismatch';
type RevocationsResponse = {
  data: Revocation[];
  meta?: { integrity: RevocationIntegrity; digest: string };
  timestamp: string;
};

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

function usage(): string {
  return [
    'omega health [--url URL]',
    'omega status [--url URL] [--token TOKEN]',
    'omega os [--url URL] [--token TOKEN]',
    'omega events [--url URL] [--limit N] [--token TOKEN]',
    'omega audit [--type TYPE] [--stage STAGE] [--status STATUS] [--from ISO] [--to ISO] [--limit N] [--url URL] [--token TOKEN]',
    'omega runs [--url URL] [--limit N] [--token TOKEN]',
    'omega jobs [--url URL] [--limit N] [--token TOKEN] [--job-token TOKEN]',
    'omega export [--url URL] [--token TOKEN]',
    'omega rules [--category CATEGORY] [--url URL] [--token TOKEN]',
    'omega revocations [--url URL] [--token TOKEN]',
    'omega revoke ATTESTATION_ID --reason REASON [--operator-id ID] [--url URL] [--token TOKEN] [--admin-token TOKEN]',
    'omega acknowledge-persistence --reason REASON --operator-id ID [--url URL] [--admin-token TOKEN]',
    'omega reencrypt-persistence --reason REASON --operator-id ID [--url URL] [--admin-token TOKEN]',
    'omega verify --attestation-json JSON [--url URL] [--token TOKEN]',
    'omega policy [--url URL] [--token TOKEN]',
    'omega scene [--seed SEED] [--steps N] [--branches N] [--url URL] [--token TOKEN]',
    '',
    'Read live runtime and evidence from the Omega V API.',
    '',
    'Environment:',
    '  OMEGA_API_URL  Base API URL (default: http://localhost:3000)',
  ].join('\n');
}

function baseUrl(argv: string[]): string {
  // option() treats a flag with no value as absent, which is what
  // adminToken already does. Reading argv directly meant a trailing --url
  // selected the flag branch, found undefined, and fell through to
  // localhost — silently ignoring a configured OMEGA_API_URL.
  return option(argv, '--url') || process.env.OMEGA_API_URL || 'http://localhost:3000';
}

function readToken(argv: string[]): string | undefined {
  // Same shape as baseUrl: a trailing --token must not discard a
  // configured OMEGA_READ_TOKEN and silently send an unauthenticated
  // request.
  return option(argv, '--token') || process.env.OMEGA_READ_TOKEN || undefined;
}

function requestInit(argv: string[]): RequestInit | undefined {
  const token = readToken(argv);
  return token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
}

function localJobToken(argv: string[]): string | undefined {
  return option(argv, '--job-token') || process.env.OMEGA_LOCAL_JOB_LEDGER_TOKEN || undefined;
}

function jobRequestInit(argv: string[]): RequestInit | undefined {
  const token = localJobToken(argv);
  const init = requestInit(argv);
  if (!token) return init;
  const headers = new Headers(init?.headers);
  headers.set('x-omega-local-job-token', token);
  return { ...init, headers };
}

function adminToken(argv: string[]): string | undefined {
  return option(argv, '--admin-token') || process.env.OMEGA_ADMIN_TOKEN || undefined;
}

function percent(value: number | null): string {
  return value === null ? 'UNKNOWN' : `${(value * 100).toFixed(0)}%`;
}

function option(argv: string[], name: string): string | null {
  const index = argv.indexOf(name);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : null;
}

function limit(argv: string[]): number | null {
  const index = argv.indexOf('--limit');
  if (index < 0) return null;
  const value = Number(argv[index + 1]);
  return Number.isInteger(value) && value > 0 ? value : null;
}

async function health(argv: string[], fetchImpl: FetchLike): Promise<number> {
  const endpoint = `${baseUrl(argv).replace(/\/$/, '')}/health`;
  try {
    const response = await fetchImpl(endpoint);
    const body = (await response.json()) as HealthResponse | { message?: string };
    if (!response.ok || !('data' in body)) {
      const message = 'message' in body ? body.message : undefined;
      process.stderr.write(
        `Health unavailable (${response.status}): ${message ?? 'unknown error'}\n`
      );
      return 1;
    }

    const { checks, policy } = body.data;
    process.stdout.write(
      [
        `HEALTH        ${body.data.status} / ${body.data.readiness}`,
        `CHECKS        observer=${checks.observer} verifier=${checks.verifier} attester=${checks.attester}`,
        `MEMORY        ${checks.memory.status} integrity=${checks.memory.integrity} encryption=${checks.memory.encryption}`,
        `PERSISTENCE   ${checks.persistence.mode} encryption=${checks.persistence.encryption} log=${checks.persistence.eventLogSource} skipped=${checks.persistence.skippedLogEntries} key=${checks.persistence.eventLogKeySource} rotation=${checks.persistence.rotationPending}`,
        `KEY ID        current=${checks.persistence.currentKeyFingerprint ?? 'none'} previous=${checks.persistence.previousKeyFingerprint ?? 'none'} custody=unverified-local`,
        `LOG REASON    ${checks.persistence.eventLogReason ?? 'none'}`,
        `ACTION       ${checks.persistence.operatorAction ?? 'unknown'}`,
        `ROTATION     recovery=${checks.persistence.reencryptionRecovery?.status ?? 'unknown'} reason=${checks.persistence.reencryptionRecovery?.reason ?? 'none'}`,
        `RECOVERY     policy=${checks.persistence.recoveryPolicy?.mode ?? 'unknown'} reference=${checks.persistence.recoveryPolicy?.reference ?? 'none'} reason=${checks.persistence.recoveryPolicy?.reason ?? 'none'}`,
        `DELETION     policy=${checks.persistence.deletionPolicy?.mode ?? 'unknown'} verified=${checks.persistence.deletionPolicy?.verified ?? 'unknown'} reason=${checks.persistence.deletionPolicy?.reason ?? 'none'}`,
        `CUSTODY      policy=${checks.persistence.custodyPolicy?.mode ?? 'unknown'} reference=${checks.persistence.custodyPolicy?.reference ?? 'none'} verified=${checks.persistence.custodyPolicy?.verified ?? 'unknown'} reason=${checks.persistence.custodyPolicy?.reason ?? 'none'}`,
        `COORDINATION  policy=${checks.persistence.coordinationPolicy?.mode ?? 'unknown'} scope=${checks.persistence.coordinationPolicy?.scope ?? 'unknown'} evidence=${checks.persistence.coordinationPolicy?.evidence ?? 'unknown'} verified=${checks.persistence.coordinationPolicy?.verified ?? 'unknown'} reason=${checks.persistence.coordinationPolicy?.reason ?? 'none'}`,
        `COORDINATION-LIMITS ${checks.persistence.coordinationPolicy?.limitations?.join(' | ') ?? 'unknown'}`,
        `COVERAGE     ${checks.persistence.coverage?.surfaces?.map((surface) => `${surface.name}=${surface.encryption}/${surface.keySource}`).join(', ') ?? 'unknown'}`,
        `UNVERIFIED   ${checks.persistence.coverage?.unverifiedSurfaces?.join(', ') ?? 'unknown'} complete=${checks.persistence.coverage?.complete ?? 'unknown'}`,
        `WHY          ${checks.persistence.coverage?.unverifiedReasons?.join(' | ') ?? 'unknown'}`,
        `POLICY        algorithm=${policy.attestationAlgorithm} authMode=${policy.authMode ?? 'unknown'} ttl=${policy.attestationTtlMs ?? 'off'} adminAllowlistRequired=${policy.adminOperatorAllowlistRequired ?? 'unknown'} revocation=${policy.revocationEnabled}`,
        `OBSERVED      ${body.timestamp}`,
      ].join('\n') + '\n'
    );
    return body.data.readiness === 'ready' && checks.memory.integrity ? 0 : 1;
  } catch (error) {
    process.stderr.write(
      `Health unavailable: ${error instanceof Error ? error.message : String(error)}\n`
    );
    return 1;
  }
}

async function operatingSystem(argv: string[], fetchImpl: FetchLike): Promise<number> {
  const endpoint = `${baseUrl(argv).replace(/\/$/, '')}/os`;
  const response = await fetchImpl(endpoint, requestInit(argv));
  const body = (await response.json()) as {
    data?: {
      state?: string;
      tasks?: unknown[];
      events?: Array<{ sequence: number; type: string; state: string }>;
      limits?: { maxTasks?: number; maxEvents?: number };
      capabilities?: {
        shellExecution?: boolean;
        remoteMutation?: boolean;
        credentialHandling?: boolean;
        humanAuthorizationRequired?: boolean;
      };
    };
    message?: string;
  };
  if (!response.ok || !body.data) {
    process.stderr.write(
      `OS snapshot unavailable (${response.status}): ${body.message ?? 'unknown error'}\n`
    );
    return 1;
  }
  process.stdout.write(
    `OS            state=${body.data.state ?? 'unknown'} tasks=${body.data.tasks?.length ?? 0} events=${body.data.events?.length ?? 0}\n` +
      `LIMITS maxTasks=${body.data.limits?.maxTasks ?? 'UNKNOWN'} maxEvents=${body.data.limits?.maxEvents ?? 'UNKNOWN'}\n` +
      `CAPABILITIES shell=${body.data.capabilities?.shellExecution === false ? 'DISABLED' : 'UNKNOWN'} remote=${body.data.capabilities?.remoteMutation === false ? 'DISABLED' : 'UNKNOWN'} credentials=${body.data.capabilities?.credentialHandling === false ? 'DISABLED' : 'UNKNOWN'} human_gate=${body.data.capabilities?.humanAuthorizationRequired === true ? 'REQUIRED' : 'UNKNOWN'}\n`
  );
  return 0;
}

async function status(argv: string[], fetchImpl: FetchLike): Promise<number> {
  const endpoint = `${baseUrl(argv).replace(/\/$/, '')}/observability`;
  try {
    const [response, stateResponse] = await Promise.all([
      fetchImpl(endpoint, requestInit(argv)),
      fetchImpl(`${baseUrl(argv).replace(/\/$/, '')}/state`, requestInit(argv)),
    ]);
    const body = (await response.json()) as ObservabilityResponse | { error?: string };
    const stateBody = (await stateResponse.json()) as StateResponse | { error?: string };
    if (!response.ok || !stateResponse.ok || !('data' in body)) {
      process.stderr.write(`Observability unavailable (${response.status})\n`);
      return 1;
    }

    const stateData = 'data' in stateBody ? stateBody.data : undefined;
    const stateReadiness = stateData?.readiness ?? 'unknown';
    const stateServiceReadiness = stateData?.trustBasis?.serviceReadiness ?? 'unknown';
    const { runtime, provenance, trust, memory } = body.data;
    process.stdout.write(
      [
        `STATE         ${stateReadiness} service=${stateServiceReadiness}`,
        `RUNTIME       ${runtime.mode} / ${runtime.persistence}`,
        `SERVICES      ${runtime.services.join(', ')}`,
        `TRUST         verification=${percent(trust.verificationCoverage)} attestation=${
          trust.attestationValidity === null
            ? 'UNKNOWN'
            : trust.attestationValidity
              ? 'VALID'
              : 'INVALID'
        }`,
        `MEMORY        entries=${memory.entries} intact=${memory.intact} appendOnly=${memory.appendOnly}`,
        `EVENT LOG     ${runtime.eventLogSource ?? 'unknown'} skipped=${runtime.skippedLogEntries ?? 'unknown'} key=${runtime.eventLogEncryptionKeySource ?? 'unknown'} rotation=${runtime.persistenceRotationPending ?? 'unknown'}`,
        `KEY ID        current=${runtime.persistenceCurrentKeyFingerprint ?? 'none'} previous=${runtime.persistencePreviousKeyFingerprint ?? 'none'} custody=unverified-local`,
        `LOG REASON    ${runtime.eventLogReason ?? 'none'}`,
        `ACTION       ${runtime.operatorAction ?? 'unknown'}`,
        `ROTATION     recovery=${runtime.reencryptionRecovery?.status ?? 'unknown'} reason=${runtime.reencryptionRecovery?.reason ?? 'none'}`,
        `PROVENANCE    recent=${provenance.recentEvents} durable=${provenance.durableEvents} runs=${provenance.completedRuns}`,
        `LINEAGE       request=${provenance.lastRequestId || 'none'} correlation=${provenance.lastCorrelationId || 'none'}`,
        `OBSERVED      ${body.timestamp}`,
      ].join('\n') + '\n'
    );
    return stateReadiness !== 'ready' ||
      trust.attestationValidity === false ||
      !memory.intact ||
      !memory.appendOnly
      ? 1
      : 0;
  } catch (error) {
    process.stderr.write(
      `Observability unavailable: ${error instanceof Error ? error.message : String(error)}\n`
    );
    return 1;
  }
}

async function runs(argv: string[], fetchImpl: FetchLike): Promise<number> {
  const endpoint = `${baseUrl(argv).replace(/\/$/, '')}/runs`;
  try {
    const response = await fetchImpl(endpoint, requestInit(argv));
    const body = (await response.json()) as RunsResponse | { error?: string };
    if (!response.ok || !('data' in body) || !Array.isArray(body.data)) {
      process.stderr.write(`Runs unavailable (${response.status})\n`);
      return 1;
    }

    const requestedLimit = limit(argv);
    const entries = requestedLimit === null ? body.data : body.data.slice(0, requestedLimit);
    process.stdout.write(`RUNS          ${entries.length}/${body.data.length}\n`);
    for (const entry of entries) {
      process.stdout.write(
        `${entry.observation.id} verification=${entry.verification.summary.passed ? 'PASSED' : 'FAILED'} attestation=${entry.attestation.verified ? 'VALID' : 'INVALID'}\n`
      );
    }
    return 0;
  } catch (error) {
    process.stderr.write(
      `Runs unavailable: ${error instanceof Error ? error.message : String(error)}\n`
    );
    return 1;
  }
}

async function jobs(argv: string[], fetchImpl: FetchLike): Promise<number> {
  const endpoint = `${baseUrl(argv).replace(/\/$/, '')}/jobs`;
  const limitIndex = argv.indexOf('--limit');
  const requestedLimit = limitIndex < 0 ? 20 : Number(argv[limitIndex + 1]);
  if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 40) {
    process.stderr.write('Jobs --limit must be an integer between 1 and 40\n');
    return 2;
  }
  try {
    const response = await fetchImpl(`${endpoint}?limit=${requestedLimit}`, jobRequestInit(argv));
    const body = (await response.json()) as LocalJobsResponse | { code?: string; message?: string };
    if (!response.ok || !('data' in body) || !Array.isArray(body.data.jobs)) {
      const code = 'code' in body ? body.code : undefined;
      const message = 'message' in body ? body.message : undefined;
      process.stderr.write(
        `Jobs unavailable (${response.status})${code ? ` ${code}` : ''}: ${message ?? 'unknown error'}\n`
      );
      return 1;
    }
    if (body.data.status.durable !== false || body.data.status.source !== 'memory') {
      process.stderr.write('Jobs response contradicted the local non-durable contract\n');
      return 1;
    }
    const jobsToShow = body.data.jobs.slice(0, requestedLimit);
    const { status } = body.data;
    process.stdout.write(
      `JOBS          ${jobsToShow.length}/${body.data.jobs.length} source=${status.source} storage=${status.source} durable=${status.durable} encryption=${status.encryption} enabled=${status.enabled}\n`
    );
    process.stdout.write(
      `COUNTS        queued=${status.counts.queued} running=${status.counts.running} succeeded=${status.counts.succeeded} failed=${status.counts.failed} unknown=${status.counts.unknown} window=${status.recentWindow}\n`
    );
    for (const job of jobsToShow) {
      process.stdout.write(
        `${job.id} state=${job.state} attempt=${job.attempt} worker=${job.workerId ?? 'none'} created=${job.createdAt} updated=${job.updatedAt} finished=${job.finishedAt ?? 'none'} error=${job.errorClass ?? 'none'}\n`
      );
    }
    return 0;
  } catch (error) {
    process.stderr.write(
      `Jobs unavailable: ${error instanceof Error ? error.message : String(error)}\n`
    );
    return 1;
  }
}

async function policy(argv: string[], fetchImpl: FetchLike): Promise<number> {
  const endpoint = `${baseUrl(argv).replace(/\/$/, '')}/attest/policy`;
  try {
    const response = await fetchImpl(endpoint, requestInit(argv));
    const body = (await response.json()) as { data?: Record<string, unknown>; message?: string };
    if (!response.ok || !body.data) {
      process.stderr.write(
        `Policy unavailable (${response.status}): ${body.message ?? 'unknown error'}\n`
      );
      return 1;
    }
    process.stdout.write(`${JSON.stringify(body.data)}\n`);
    return 0;
  } catch (error) {
    process.stderr.write(
      `Policy unavailable: ${error instanceof Error ? error.message : String(error)}\n`
    );
    return 1;
  }
}
async function verifyAttestation(argv: string[], fetchImpl: FetchLike): Promise<number> {
  const rawAttestation = option(argv, '--attestation-json');
  if (!rawAttestation) {
    process.stderr.write('Usage: omega verify --attestation-json JSON [options]\n');
    return 2;
  }
  let attestation: unknown;
  try {
    attestation = JSON.parse(rawAttestation);
  } catch {
    process.stderr.write('Invalid JSON supplied to --attestation-json\n');
    return 2;
  }
  const endpoint = `${baseUrl(argv).replace(/\/$/, '')}/attest/verify`;
  try {
    const response = await fetchImpl(endpoint, {
      ...(requestInit(argv) ?? {}),
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...((requestInit(argv)?.headers as Record<string, string> | undefined) ?? {}),
      },
      body: JSON.stringify({ attestation }),
    });
    const body = (await response.json()) as {
      data?: {
        valid: boolean;
        revoked: boolean;
        expired: boolean;
        revocationIntegrity: RevocationIntegrity;
      };
      message?: string;
    };
    if (!response.ok || !body.data) {
      process.stderr.write(
        `Verification failed (${response.status}): ${body.message ?? 'unknown error'}\n`
      );
      return 1;
    }
    process.stdout.write(
      `VERIFICATION valid=${body.data.valid} revoked=${body.data.revoked} expired=${body.data.expired} registry=${body.data.revocationIntegrity}\n`
    );
    return body.data.valid && body.data.revocationIntegrity !== 'mismatch' ? 0 : 1;
  } catch (error) {
    process.stderr.write(
      `Verification failed: ${error instanceof Error ? error.message : String(error)}\n`
    );
    return 1;
  }
}
type RulesResponse = {
  data: {
    count: number;
    registered: number;
    executable: number;
    category: string | null;
    rules: Array<{ name: string; version: string; active: boolean; executable: boolean }>;
  };
};

/**
 * Print the rule set, marking which rules the engine can actually run.
 *
 * A rule the engine holds but cannot execute fails verification rather than
 * passing quietly. That is the right direction and it is also the reason
 * this command exists: without it the only way to discover a rule the
 * engine will not evaluate is to submit an observation and read the
 * failure. The API has published `executable` since the rule list was
 * added; nothing on this side asked for it.
 *
 * REGISTERED counts every rule the engine holds. MATCHED is how many this
 * response returned, which differs when --category filters them.
 */
async function rules(argv: string[], fetchImpl: FetchLike): Promise<number> {
  const category = option(argv, '--category');
  const params = category ? `?category=${encodeURIComponent(category)}` : '';
  const endpoint = `${baseUrl(argv).replace(/\/$/, '')}/rules${params}`;
  try {
    const response = await fetchImpl(endpoint, requestInit(argv));
    const body = (await response.json()) as RulesResponse | { error?: string };
    if (!response.ok || !('data' in body) || !Array.isArray(body.data.rules)) {
      process.stderr.write(`Rules unavailable (${response.status})\n`);
      return 1;
    }
    const { count, registered, executable, rules: entries } = body.data;
    process.stdout.write(
      `RULES         matched=${count} registered=${registered} executable=${executable} category=${
        body.data.category ?? 'all'
      }\n`
    );
    for (const rule of entries) {
      // Spelled out rather than shown as a tick: "executable=false" is the
      // fact an operator needs to act on, and a symbol invites skimming.
      process.stdout.write(
        `${rule.name} v${rule.version} active=${rule.active} executable=${rule.executable}\n`
      );
    }
    // Said once, plainly, when it applies. A rule that cannot run is not a
    // rule that passes.
    if (executable < count) {
      process.stdout.write(
        `NOTE          ${count - executable} of ${count} matched rules cannot be evaluated by this engine and will fail verification\n`
      );
    }
    return 0;
  } catch (error) {
    process.stderr.write(
      `Rules unavailable: ${error instanceof Error ? error.message : String(error)}\n`
    );
    return 1;
  }
}

async function revocations(argv: string[], fetchImpl: FetchLike): Promise<number> {
  const endpoint = `${baseUrl(argv).replace(/\/$/, '')}/attest/revocations`;
  try {
    const response = await fetchImpl(endpoint, requestInit(argv));
    const body = (await response.json()) as RevocationsResponse | { error?: string };
    if (!response.ok || !('data' in body) || !Array.isArray(body.data)) {
      process.stderr.write(`Revocations unavailable (${response.status})\n`);
      return 1;
    }
    process.stdout.write(
      `REVOCATIONS   ${body.data.length} integrity=${body.meta?.integrity ?? 'unknown'}\n`
    );
    for (const entry of body.data) {
      process.stdout.write(
        `${entry.attestationId} revokedBy=${entry.revokedBy} reason=${entry.reason} at=${entry.revokedAt}\n`
      );
    }
    return 0;
  } catch (error) {
    process.stderr.write(
      `Revocations unavailable: ${error instanceof Error ? error.message : String(error)}\n`
    );
    return 1;
  }
}

async function acknowledgePersistence(argv: string[], fetchImpl: FetchLike): Promise<number> {
  const reason = option(argv, '--reason');
  const operatorId = option(argv, '--operator-id');
  if (!reason || !operatorId) {
    process.stderr.write(
      'Usage: omega acknowledge-persistence --reason REASON --operator-id ID [options]\n'
    );
    return 2;
  }
  const response = await fetchImpl(`${baseUrl(argv).replace(/\/$/, '')}/persistence/acknowledge`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(adminToken(argv) ? { Authorization: `Bearer ${adminToken(argv)}` } : {}),
      'x-omega-operator-id': operatorId,
    },
    body: JSON.stringify({ reason, operatorId }),
  });
  const body = (await response.json()) as {
    data?: { acknowledgement: PersistenceAcknowledgement; eventId: string };
    code?: string;
    message?: string;
  };
  if (!response.ok || !body.data) {
    process.stderr.write(
      `${body.code ?? 'PERSISTENCE_ACKNOWLEDGEMENT_FAILED'}: ${body.message ?? 'request failed'}\n`
    );
    return 1;
  }
  process.stdout.write(
    `ACKNOWLEDGED action=${body.data.acknowledgement.action} operator=${body.data.acknowledgement.operatorId} event=${body.data.eventId}\n`
  );
  return 0;
}

async function reencryptPersistence(argv: string[], fetchImpl: FetchLike): Promise<number> {
  const reason = option(argv, '--reason');
  const operatorId = option(argv, '--operator-id');
  if (!reason || !operatorId) {
    process.stderr.write(
      'Usage: omega reencrypt-persistence --reason REASON --operator-id ID [options]\n'
    );
    return 2;
  }
  try {
    const response = await fetchImpl(`${baseUrl(argv).replace(/\/$/, '')}/persistence/reencrypt`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(adminToken(argv) ? { Authorization: `Bearer ${adminToken(argv)}` } : {}),
        'x-omega-operator-id': operatorId,
      },
      body: JSON.stringify({ reason, operatorId }),
    });
    const body = (await response.json()) as {
      data?: { reencrypted: PersistenceReencryption; eventId: string };
      code?: string;
      message?: string;
    };
    if (!response.ok || !body.data) {
      process.stderr.write(
        `${body.code ?? 'PERSISTENCE_REENCRYPTION_FAILED'}: ${body.message ?? 'request failed'}\n`
      );
      return 1;
    }
    const result = body.data.reencrypted;
    process.stdout.write(
      `REENCRYPTED snapshot=${result.snapshotRecords} events=${result.eventRecords} operator=${result.operatorId} event=${body.data.eventId}\n`
    );
    return 0;
  } catch (error) {
    process.stderr.write(
      `Persistence re-encryption failed: ${error instanceof Error ? error.message : String(error)}\n`
    );
    return 1;
  }
}
async function revoke(argv: string[], fetchImpl: FetchLike): Promise<number> {
  const attestationId = argv[1];
  const reason = option(argv, '--reason');
  if (!attestationId || !reason) {
    process.stderr.write('Usage: omega revoke ATTESTATION_ID --reason REASON [options]\n');
    return 2;
  }
  const endpoint = `${baseUrl(argv).replace(/\/$/, '')}/attest/revoke`;
  try {
    const response = await fetchImpl(endpoint, {
      ...(requestInit(argv) ?? {}),
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(adminToken(argv) ? { Authorization: `Bearer ${adminToken(argv)}` } : {}),
        ...(option(argv, '--operator-id')
          ? { 'x-omega-operator-id': option(argv, '--operator-id') as string }
          : {}),
      },
      body: JSON.stringify({
        attestationId,
        reason,
        revokedBy: option(argv, '--operator-id') || 'omega-cli',
      }),
    });
    const body = (await response.json()) as { data?: Revocation; message?: string };
    if (!response.ok || !body.data) {
      process.stderr.write(
        `Revocation failed (${response.status}): ${body.message ?? 'unknown error'}\n`
      );
      return 1;
    }
    process.stdout.write(
      `REVOKED       ${body.data.attestationId} by=${body.data.revokedBy} reason=${body.data.reason}\n`
    );
    return 0;
  } catch (error) {
    process.stderr.write(
      `Revocation failed: ${error instanceof Error ? error.message : String(error)}\n`
    );
    return 1;
  }
}

async function evidenceExport(argv: string[], fetchImpl: FetchLike): Promise<number> {
  const endpoint = `${baseUrl(argv).replace(/\/$/, '')}/evidence/export`;
  try {
    const response = await fetchImpl(endpoint, requestInit(argv));
    const body = (await response.json()) as ExportResponse | { error?: string };
    if (!response.ok || !('data' in body) || !('meta' in body)) {
      process.stderr.write(`Evidence export unavailable (${response.status})\n`);
      return 1;
    }
    process.stdout.write(`${JSON.stringify(body)}\n`);
    return body.data.observability.memory.intact && body.data.observability.memory.appendOnly
      ? 0
      : 1;
  } catch (error) {
    process.stderr.write(
      `Evidence export unavailable: ${error instanceof Error ? error.message : String(error)}\n`
    );
    return 1;
  }
}

async function audit(argv: string[], fetchImpl: FetchLike): Promise<number> {
  const params = new URLSearchParams();
  for (const name of ['--type', '--stage', '--status', '--from', '--to', '--limit']) {
    const value = option(argv, name);
    if (value !== null) params.set(name.slice(2), value);
  }
  const suffix = params.toString() ? `?${params.toString()}` : '';
  const endpoint = `${baseUrl(argv).replace(/\/$/, '')}/audit/events${suffix}`;
  try {
    const response = await fetchImpl(endpoint, requestInit(argv));
    const body = (await response.json()) as AuditResponse | { error?: string; message?: string };
    if (!response.ok || !('data' in body) || !('meta' in body)) {
      process.stderr.write(
        `Audit unavailable (${response.status}): ${'message' in body ? (body.message ?? 'unknown error') : 'unknown error'}\n`
      );
      return 1;
    }
    process.stdout.write(
      [
        `AUDIT         ${body.data.length}/${body.meta.total} source=${body.meta.source} key=${body.meta.keySource}`,
        `FILTERS       ${JSON.stringify(body.meta.filters)}`,
        ...body.data.map((entry) => JSON.stringify(entry)),
        `OBSERVED      ${body.timestamp}`,
      ].join('\n') + '\n'
    );
    return 0;
  } catch (error) {
    process.stderr.write(
      `Audit unavailable: ${error instanceof Error ? error.message : String(error)}\n`
    );
    return 1;
  }
}

async function scene(argv: string[], fetchImpl: FetchLike): Promise<number> {
  const seed = option(argv, '--seed');
  const steps = option(argv, '--steps');
  const branches = option(argv, '--branches');
  const endpoint = `${baseUrl(argv).replace(/\/$/, '')}/scene/simulate`;
  try {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(requestInit(argv)?.headers ?? {}) },
      body: JSON.stringify({
        ...(seed ? { seed } : {}),
        ...(steps ? { steps: Number(steps) } : {}),
        ...(branches ? { branches: Number(branches) } : {}),
      }),
    });
    const body = (await response.json()) as {
      data?: {
        equation: string;
        states: string[];
        terminalState: string;
        branches: Array<{ perspective: string; terminalState: string }>;
        branchCount: number;
        continuation: string;
        provenance: { ruleVersion: string; verified: boolean; deterministic: boolean };
      };
      message?: string;
    };
    if (!response.ok || !body.data) {
      process.stderr.write(
        `Scene unavailable (${response.status}): ${body.message ?? 'unknown error'}\\n`
      );
      return 1;
    }
    process.stdout.write(
      [
        `SCENE         ${body.data.terminalState} states=${body.data.states.length} branches=${body.data.branchCount}`,
        `EQUATION      ${body.data.equation}`,
        `TRACE         ${body.data.states.join(' → ')}`,
        `PERSPECTIVES  ${body.data.branches.map((branch) => `${branch.perspective}=${branch.terminalState}`).join(', ')}`,
        `CONTINUATION  ${body.data.continuation}`,
        `PROVENANCE    rule=${body.data.provenance.ruleVersion} deterministic=${body.data.provenance.deterministic} verified=${body.data.provenance.verified}`,
      ].join('\\n') + '\\n'
    );
    return 0;
  } catch (error) {
    process.stderr.write(
      `Scene unavailable: ${error instanceof Error ? error.message : String(error)}\\n`
    );
    return 1;
  }
}

async function events(argv: string[], fetchImpl: FetchLike): Promise<number> {
  const endpoint = `${baseUrl(argv).replace(/\/$/, '')}/events`;
  try {
    const response = await fetchImpl(endpoint, requestInit(argv));
    const body = (await response.json()) as EventsResponse | { error?: string };
    if (!response.ok || !('data' in body) || !Array.isArray(body.data)) {
      process.stderr.write(`Events unavailable (${response.status})\n`);
      return 1;
    }

    const requestedLimit = limit(argv);
    const entries = requestedLimit === null ? body.data : body.data.slice(0, requestedLimit);
    process.stdout.write(`EVENTS        ${entries.length}/${body.data.length}\n`);
    for (const entry of entries) {
      process.stdout.write(`${JSON.stringify(entry)}\n`);
    }
    return 0;
  } catch (error) {
    process.stderr.write(
      `Events unavailable: ${error instanceof Error ? error.message : String(error)}\n`
    );
    return 1;
  }
}

export async function run(
  argv: string[],
  fetchImpl: FetchLike = globalThis.fetch
): Promise<number> {
  const command = argv[0] || 'status';
  if (command === '--help' || command === '-h' || command === 'help') {
    process.stdout.write(`${usage()}\n`);
    return 0;
  }
  if (command === 'health') return health(argv, fetchImpl);
  if (command === 'status') return status(argv, fetchImpl);
  if (command === 'os') return operatingSystem(argv, fetchImpl);
  if (command === 'events') return events(argv, fetchImpl);
  if (command === 'audit') return audit(argv, fetchImpl);
  if (command === 'runs') return runs(argv, fetchImpl);
  if (command === 'jobs') return jobs(argv, fetchImpl);
  if (command === 'export') return evidenceExport(argv, fetchImpl);
  if (command === 'rules') return rules(argv, fetchImpl);
  if (command === 'revocations') return revocations(argv, fetchImpl);
  if (command === 'verify') return verifyAttestation(argv, fetchImpl);
  if (command === 'policy') return policy(argv, fetchImpl);
  if (command === 'scene') return scene(argv, fetchImpl);
  if (command === 'revoke') return revoke(argv, fetchImpl);
  if (command === 'acknowledge-persistence') return acknowledgePersistence(argv, fetchImpl);
  if (command === 'reencrypt-persistence') return reencryptPersistence(argv, fetchImpl);

  process.stderr.write(`Unknown command: ${command}\n\n${usage()}\n`);
  return 2;
}
