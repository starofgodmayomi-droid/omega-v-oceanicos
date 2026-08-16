#!/usr/bin/env node

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
    attestation: { id: string; verified: boolean; attestedAt?: string };
  }>;
  timestamp: string;
};

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

function usage(): string {
  return [
    'omega status [--url URL] [--token TOKEN]',
    'omega events [--url URL] [--limit N] [--token TOKEN]',
    'omega runs [--url URL] [--limit N] [--token TOKEN]',
    'omega export [--url URL] [--token TOKEN]',
    '',
    'Read live runtime and evidence from the Omega V API.',
    '',
    'Environment:',
    '  OMEGA_API_URL  Base API URL (default: http://localhost:3000)',
  ].join('\n');
}

function baseUrl(argv: string[]): string {
  const index = argv.indexOf('--url');
  return (index >= 0 ? argv[index + 1] : process.env.OMEGA_API_URL) || 'http://localhost:3000';
}

function readToken(argv: string[]): string | undefined {
  const index = argv.indexOf('--token');
  return (index >= 0 ? argv[index + 1] : process.env.OMEGA_READ_TOKEN) || undefined;
}

function requestInit(argv: string[]): RequestInit | undefined {
  const token = readToken(argv);
  return token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
}

function percent(value: number | null): string {
  return value === null ? 'UNKNOWN' : `${(value * 100).toFixed(0)}%`;
}

function limit(argv: string[]): number | null {
  const index = argv.indexOf('--limit');
  if (index < 0) return null;
  const value = Number(argv[index + 1]);
  return Number.isInteger(value) && value > 0 ? value : null;
}

async function status(argv: string[], fetchImpl: FetchLike): Promise<number> {
  const endpoint = `${baseUrl(argv).replace(/\/$/, '')}/observability`;
  try {
    const response = await fetchImpl(endpoint, requestInit(argv));
    const body = (await response.json()) as ObservabilityResponse | { error?: string };
    if (!response.ok || !('data' in body)) {
      process.stderr.write(`Observability unavailable (${response.status})\n`);
      return 1;
    }

    const { runtime, provenance, trust, memory } = body.data;
    process.stdout.write(
      [
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
    return trust.attestationValidity === false || !memory.intact || !memory.appendOnly ? 1 : 0;
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
  if (command === 'status') return status(argv, fetchImpl);
  if (command === 'events') return events(argv, fetchImpl);
  if (command === 'runs') return runs(argv, fetchImpl);
  if (command === 'export') return evidenceExport(argv, fetchImpl);

  process.stderr.write(`Unknown command: ${command}\n\n${usage()}\n`);
  return 2;
}
