import { createHash } from 'node:crypto';

export const REPO_BUILDER_VERSION = 'omega.repo-builder.v1' as const;

export interface RepositoryChange {
  readonly path: string;
  readonly content: string;
}

export interface RepositoryChangeProposal {
  readonly worker: 'repo-builder';
  readonly version: typeof REPO_BUILDER_VERSION;
  readonly status: 'PROPOSED';
  readonly changes: readonly RepositoryChange[];
  readonly evidence: string;
  readonly limitations: readonly string[];
}

const MAX_FILES = 8;
const MAX_FILE_BYTES = 64 * 1024;
const MAX_TOTAL_BYTES = 256 * 1024;

const boundedPath = (path: string): string => {
  const value = path.trim();
  if (!value || value.length > 240) throw new Error('path must be a non-empty bounded path');
  if (value.startsWith('/') || value.includes('..') || /[\\\0]/.test(value)) {
    throw new Error(`unsafe repository path: ${path}`);
  }
  return value;
};

const digest = (changes: readonly RepositoryChange[]): string =>
  `sha256:${createHash('sha256').update(JSON.stringify(changes)).digest('hex')}`;

/**
 * Build a bounded proposal only. This function never writes to GitHub, executes
 * commands, reads credentials, or treats a proposal as authorization.
 */
export function proposeRepositoryChange(
  changes: readonly RepositoryChange[],
): RepositoryChangeProposal {
  if (changes.length === 0) throw new Error('at least one repository change is required');
  if (changes.length > MAX_FILES) throw new Error(`repository change set exceeds ${MAX_FILES} files`);

  let totalBytes = 0;
  const normalized = changes.map((change) => {
    const path = boundedPath(change.path);
    if (typeof change.content !== 'string') throw new Error(`content must be text: ${path}`);
    const bytes = Buffer.byteLength(change.content, 'utf8');
    if (bytes > MAX_FILE_BYTES) throw new Error(`repository file exceeds ${MAX_FILE_BYTES} bytes: ${path}`);
    totalBytes += bytes;
    return { path, content: change.content };
  });

  if (totalBytes > MAX_TOTAL_BYTES) {
    throw new Error(`repository change set exceeds ${MAX_TOTAL_BYTES} bytes`);
  }

  return {
    worker: 'repo-builder',
    version: REPO_BUILDER_VERSION,
    status: 'PROPOSED',
    changes: normalized,
    evidence: digest(normalized),
    limitations: [
      'proposal is not authorization',
      'human approval is required before mutation',
      'GitHub mutation occurs outside this worker through an authorized repository connector',
      'no arbitrary shell, credentials, deployment, or self-authorization',
    ],
  };
}
