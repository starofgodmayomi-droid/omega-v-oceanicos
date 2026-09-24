import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type {
  OmegaCommandResult,
  OmegaObservation,
  OmegaRealityVerdict,
} from '@oceanicos/types';
import { parsePersistenceCoordinationPolicy } from '../persistence.js';

export class RealityObserverEngine {
  public static createObservation(
    observerType: OmegaObservation['observerType'],
    target: string,
    observedData: Record<string, unknown>
  ): OmegaObservation {
    const timestamp = new Date().toISOString();
    const serialized = JSON.stringify({ observerType, target, observedData });
    const stateHash = crypto.createHash('sha256').update(serialized).digest('hex');

    return {
      observerId: `obs_${crypto.randomUUID()}`,
      observerType,
      target,
      timestamp,
      observedData,
      stateHash,
    };
  }

  public static observeGitWorkingTree(customRepoPath?: string): OmegaObservation {
    const timestamp = new Date().toISOString();
    let statusText = 'clean';
    let headCommit = 'HEAD';
    try {
      const statusOutput = execFileSync('git', ['status', '--porcelain'], {
        encoding: 'utf8',
        timeout: 5000,
        cwd: customRepoPath || process.cwd(),
      });
      statusText = statusOutput.trim() || 'clean';
      headCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
        encoding: 'utf8',
        timeout: 5000,
        cwd: customRepoPath || process.cwd(),
      }).trim();
    } catch (err: any) {
      statusText = `git_error: ${err.message}`;
    }

    const observedData = { statusText, headCommit, isClean: statusText === 'clean' };
    const serialized = JSON.stringify({ observerType: 'git_working_tree', target: 'git_working_tree', observedData });
    const stateHash = crypto.createHash('sha256').update(serialized).digest('hex');

    return {
      observerId: `obs_git_${crypto.randomUUID()}`,
      observerType: 'git_working_tree',
      target: 'git_working_tree',
      timestamp,
      observedData,
      stateHash,
    };
  }

  public static async observeApiHealth(targetUrl: string = 'http://127.0.0.1:5000/health'): Promise<OmegaObservation> {
    const timestamp = new Date().toISOString();
    const startTime = Date.now();
    let observedData: Record<string, unknown>;
    try {
      const res = await fetch(targetUrl, { signal: AbortSignal.timeout(3000) });
      const latencyMs = Date.now() - startTime;
      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      observedData = {
        statusCode: res.status,
        statusText: res.statusText,
        ok: res.ok,
        latencyMs,
        body: json,
        isHealthy: res.ok && json.status === 'ok',
      };
    } catch (err: any) {
      observedData = {
        statusCode: 0,
        ok: false,
        isHealthy: false,
        error: err.message,
        failed: true,
      };
    }

    const serialized = JSON.stringify({ observerType: 'api_health', target: targetUrl, observedData });
    const stateHash = crypto.createHash('sha256').update(serialized).digest('hex');

    return {
      observerId: `obs_api_${crypto.randomUUID()}`,
      observerType: 'api_health',
      target: targetUrl,
      timestamp,
      observedData,
      stateHash,
    };
  }

  public static observeBuildArtifacts(workspaceRoot?: string): OmegaObservation {
    const timestamp = new Date().toISOString();
    const root = workspaceRoot || process.cwd();
    let observedData: Record<string, unknown>;
    try {
      const typesPkg = existsSync(path.join(root, 'packages/types/package.json'));
      const miniPkg = existsSync(path.join(root, 'packages/mini/package.json'));
      const apiPkg = existsSync(path.join(root, 'apps/api/package.json'));
      const webPkg = existsSync(path.join(root, 'apps/web/package.json'));
      observedData = {
        typesPackageExists: typesPkg,
        miniPackageExists: miniPkg,
        apiPackageExists: apiPkg,
        webPackageExists: webPkg,
        ready: typesPkg && miniPkg && apiPkg && webPkg,
      };
    } catch (err: any) {
      observedData = { ready: false, error: err.message, failed: true };
    }

    const serialized = JSON.stringify({ observerType: 'build_test', target: 'build_artifacts', observedData });
    const stateHash = crypto.createHash('sha256').update(serialized).digest('hex');

    return {
      observerId: `obs_bld_${crypto.randomUUID()}`,
      observerType: 'build_test',
      target: 'build_artifacts',
      timestamp,
      observedData,
      stateHash,
    };
  }

  public static observeCoordinationEvidence(
    customMode?: string,
    customReference?: string,
    target: string = 'coordination_boundary'
  ): OmegaObservation {
    const timestamp = new Date().toISOString();
    const mode = customMode || process.env.OMEGA_PERSISTENCE_COORDINATION_MODE || 'local-single-process';
    const reference = customReference || process.env.OMEGA_PERSISTENCE_COORDINATION_REF || null;
    const policy = parsePersistenceCoordinationPolicy(mode, reference ?? undefined);

    const observedData = {
      mode: policy.mode,
      reference: policy.reference,
      reason: policy.reason,
      evidence: policy.evidence,
      scope: policy.scope,
      limitations: policy.limitations,
      verified: policy.verified,
      isConfigured: policy.mode !== 'invalid',
    };

    const serialized = JSON.stringify({ observerType: 'coordination_probe', target, observedData });
    const stateHash = crypto.createHash('sha256').update(serialized).digest('hex');

    return {
      observerId: `obs_coord_${crypto.randomUUID()}`,
      observerType: 'coordination_probe',
      target,
      timestamp,
      observedData,
      stateHash,
    };
  }

  public static verifyReality(
    result: OmegaCommandResult,
    observation?: OmegaObservation
  ): OmegaRealityVerdict {
    const evaluatedAt = new Date().toISOString();

    if (result.status !== 'EXECUTED' && result.status !== 'ATTESTED' && result.status !== 'UNKNOWN') {
      return {
        verdict: 'NOT_EXECUTED',
        discrepancies: [`Command is in status ${result.status}, not EXECUTED or UNKNOWN.`],
        evaluatedAt,
      };
    }

    if (!observation) {
      return {
        verdict: 'UNKNOWN',
        discrepancies: ['No external reality observation was attached.'],
        evaluatedAt,
      };
    }

    // Hash of claimed state after
    const claimedSerialized = JSON.stringify(result.stateAfter || {});
    const claimedHash = crypto.createHash('sha256').update(claimedSerialized).digest('hex');
    const observedHash = observation.stateHash;

    const discrepancies: string[] = [];
    let receiptVerified = false;
    let stateDiffSummary: string | undefined = undefined;

    // Cross-validate C5 ExecutionReceipt if present
    if (result.receipt) {
      stateDiffSummary = result.receipt.stateDiff?.summary;
      if (result.receipt.status === 'FAILURE' || result.receipt.exitCode !== 0) {
        discrepancies.push(`Executor recorded execution failure (exit code ${result.receipt.exitCode}).`);
      }
      if (result.attestationDigest && result.receipt.executionAttestationDigest !== result.attestationDigest) {
        discrepancies.push('Attestation digest mismatch between execution receipt and command result.');
      } else {
        receiptVerified = true;
      }
    }

    // Check target match
    const claimedTarget = result.stateAfter?.transitionTarget;
    if (claimedTarget && claimedTarget !== observation.target) {
      discrepancies.push(
        `Target mismatch: claimed "${claimedTarget}" but observed "${observation.target}".`
      );
    }

    // Check specific state observations if provided
    if (observation.observedData && typeof observation.observedData === 'object') {
      const isFailed = observation.observedData.failed === true || observation.observedData.error;
      if (isFailed) {
        discrepancies.push(`External observer reported failure: ${observation.observedData.error || 'unknown failure'}`);
      }
    }

    if (discrepancies.length > 0) {
      return {
        verdict: 'DIVERGENT',
        claimedStateHash: claimedHash,
        observedStateHash: observedHash,
        discrepancies,
        evaluatedAt,
        receiptVerified,
        stateDiffSummary,
        reconciliationDetails: {
          claimedTarget,
          observedTarget: observation.target,
          discrepancyCount: discrepancies.length,
        },
      };
    }

    return {
      verdict: 'VERIFIED',
      claimedStateHash: claimedHash,
      observedStateHash: observedHash,
      discrepancies: [],
      evaluatedAt,
      receiptVerified,
      stateDiffSummary,
      reconciliationDetails: {
        claimedTarget,
        observedTarget: observation.target,
        discrepancyCount: 0,
      },
    };
  }
}
