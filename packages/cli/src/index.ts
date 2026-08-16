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

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

function usage(): string {
  return [
    'omega status [--url URL]',
    'omega events [--url URL] [--limit N]',
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
    const response = await fetchImpl(endpoint);
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

async function events(argv: string[], fetchImpl: FetchLike): Promise<number> {
  const endpoint = `${baseUrl(argv).replace(/\/$/, '')}/events`;
  try {
    const response = await fetchImpl(endpoint);
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

  process.stderr.write(`Unknown command: ${command}\n\n${usage()}\n`);
  return 2;
}
