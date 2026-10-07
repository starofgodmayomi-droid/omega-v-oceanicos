import {
  MAX_CONNECTOR_TIMEOUT_MS,
  type OmegaConnectorDeclaration,
} from './connector-admission.js';
import type { ConnectorExecutionObservation } from './connector-observation.js';

export const GITHUB_PUBLIC_REPOSITORY_ADAPTER = 'github-public-repository' as const;
export type GithubPublicRepositoryAdapter = typeof GITHUB_PUBLIC_REPOSITORY_ADAPTER;
const MAX_GITHUB_RESPONSE_BYTES = 64 * 1024;

export interface GithubRepoIdentity {
  readonly owner: string;
  readonly repo: string;
  readonly fullName: string;
}

export const githubPublicMetadataObservation = (fullName: string): string =>
  `github:${fullName}:metadata`;

export function parseGithubRepoScope(scope: readonly string[]): GithubRepoIdentity {
  if (scope.length !== 1) {
    throw new Error('github-public-repository adapter requires exactly one repo:owner/name scope entry');
  }
  const match = /^repo:([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/.exec(scope[0] ?? '');
  if (!match) {
    throw new Error('github-public-repository adapter scope must be repo:owner/name');
  }
  return { owner: match[1], repo: match[2], fullName: `${match[1]}/${match[2]}` };
}

/**
 * Fail closed unless this is the declared GitHub public-metadata adapter.
 * Network is not opened here; callers must invoke the handler explicitly.
 */
export function assertGithubPublicRepositoryConnector(
  connector: OmegaConnectorDeclaration,
): GithubRepoIdentity {
  if (connector.system !== 'github') {
    throw new Error('live adapter github-public-repository requires system=github');
  }
  if (connector.mode !== 'read-only') {
    throw new Error('live adapter github-public-repository requires mode=read-only');
  }
  const identity = parseGithubRepoScope(connector.scope);
  const expected = githubPublicMetadataObservation(identity.fullName);
  if (connector.expectedObservation.trim() !== expected) {
    throw new Error(`expectedObservation must be ${expected} for the github-public-repository adapter`);
  }
  return identity;
}

async function readBoundedJson(response: Response): Promise<unknown> {
  const contentLength = response.headers.get('content-length');
  const declaredBytes = contentLength === null ? NaN : Number(contentLength);
  if (Number.isFinite(declaredBytes) && declaredBytes > MAX_GITHUB_RESPONSE_BYTES) {
    await response.body?.cancel();
    throw new Error(`github response exceeded ${MAX_GITHUB_RESPONSE_BYTES} byte limit`);
  }

  if (!response.body) throw new Error('github response body is missing');
  const reader = response.body.getReader();
  const bytes = new Uint8Array(MAX_GITHUB_RESPONSE_BYTES);
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      if (totalBytes + value.byteLength > MAX_GITHUB_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error(`github response exceeded ${MAX_GITHUB_RESPONSE_BYTES} byte limit`);
      }
      bytes.set(value, totalBytes);
      totalBytes += value.byteLength;
    }
  } finally {
    reader.releaseLock();
  }

  return JSON.parse(new TextDecoder().decode(bytes.subarray(0, totalBytes)));
}

export async function observeGithubPublicRepository(options: {
  readonly owner: string;
  readonly repo: string;
  readonly timeoutMs: number;
  readonly fetchImpl?: typeof fetch;
}): Promise<ConnectorExecutionObservation> {
  const requestedTimeoutMs = options.timeoutMs;
  if (
    !Number.isSafeInteger(requestedTimeoutMs) ||
    requestedTimeoutMs <= 0 ||
    requestedTimeoutMs > MAX_CONNECTOR_TIMEOUT_MS
  ) {
    return {
      attempted: false,
      executed: false,
      error: `connector timeoutMs must be an integer from 1 to ${MAX_CONNECTOR_TIMEOUT_MS}`,
    };
  }

  const timeoutMs = Math.min(requestedTimeoutMs, MAX_CONNECTOR_TIMEOUT_MS);
  const fetchImpl = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(
      `https://api.github.com/repos/${encodeURIComponent(options.owner)}/${encodeURIComponent(options.repo)}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'omega-v-oceanicos-connector-observe',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        redirect: 'error',
        signal: controller.signal,
      },
    );
    if (!response.ok) {
      return { attempted: true, executed: false, error: `github http ${response.status}` };
    }
    const payload = (await readBoundedJson(response)) as { full_name?: unknown };
    if (typeof payload.full_name !== 'string' || !payload.full_name.trim()) {
      return { attempted: true, executed: true, error: 'github response missing full_name' };
    }
    return {
      attempted: true,
      executed: true,
      actualObservation: githubPublicMetadataObservation(payload.full_name.trim()),
    };
  } catch (error) {
    return {
      attempted: true,
      executed: false,
      error: String((error as Error)?.message ?? error),
    };
  } finally {
    clearTimeout(timer);
  }
}

export function createGithubPublicRepositoryHandler(
  connector: OmegaConnectorDeclaration,
  fetchImpl?: typeof fetch,
): () => Promise<ConnectorExecutionObservation> {
  const identity = assertGithubPublicRepositoryConnector(connector);
  return () =>
    observeGithubPublicRepository({
      owner: identity.owner,
      repo: identity.repo,
      timeoutMs: connector.timeoutMs,
      fetchImpl,
    });
}
