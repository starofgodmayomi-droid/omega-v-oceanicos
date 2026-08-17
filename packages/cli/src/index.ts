#!/usr/bin/env node

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
        skippedLogEntries: number;
      };
    };
    policy: {
      attestationAlgorithm: string;
      attestationTtlMs: number | null;
      readAuthConfigured: boolean;
      adminAuthConfigured: boolean;
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
    'omega events [--url URL] [--limit N] [--token TOKEN]',
    'omega audit [--type TYPE] [--stage STAGE] [--status STATUS] [--from ISO] [--to ISO] [--limit N] [--url URL] [--token TOKEN]',
    'omega runs [--url URL] [--limit N] [--token TOKEN]',
    'omega export [--url URL] [--token TOKEN]',
    'omega revocations [--url URL] [--token TOKEN]',
    'omega revoke ATTESTATION_ID --reason REASON [--operator-id ID] [--url URL] [--token TOKEN] [--admin-token TOKEN]',
    'omega verify --attestation-json JSON [--url URL] [--token TOKEN]',
    'omega policy [--url URL] [--token TOKEN]',
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
        `PERSISTENCE   ${checks.persistence.mode} encryption=${checks.persistence.encryption} log=${checks.persistence.eventLogSource} skipped=${checks.persistence.skippedLogEntries}`,
        `POLICY        algorithm=${policy.attestationAlgorithm} ttl=${policy.attestationTtlMs ?? 'off'} revocation=${policy.revocationEnabled}`,
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
  if (command === 'events') return events(argv, fetchImpl);
  if (command === 'audit') return audit(argv, fetchImpl);
  if (command === 'runs') return runs(argv, fetchImpl);
  if (command === 'export') return evidenceExport(argv, fetchImpl);
  if (command === 'revocations') return revocations(argv, fetchImpl);
  if (command === 'verify') return verifyAttestation(argv, fetchImpl);
  if (command === 'policy') return policy(argv, fetchImpl);
  if (command === 'revoke') return revoke(argv, fetchImpl);

  process.stderr.write(`Unknown command: ${command}\n\n${usage()}\n`);
  return 2;
}
