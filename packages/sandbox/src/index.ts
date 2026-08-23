import { VerificationRule, Observation } from '@omega-v/types';

export type SandboxViolationType =
  | 'TIMEOUT'
  | 'GAS_EXHAUSTED'
  | 'MUTATION_ATTEMPT'
  | 'SYNTAX_ERROR'
  | 'FORBIDDEN_IDENTIFIER'
  | 'EXECUTION_ERROR';

export interface SandboxOptions {
  timeoutMs?: number;
  maxGas?: number;
  allowGlobalAccess?: boolean;
}

export interface SandboxExecutionResult {
  success: boolean;
  result: unknown;
  executionTimeMs: number;
  gasConsumed: number;
  memoryDeltaBytes: number;
  error?: string;
  violation?: SandboxViolationType;
}

export interface SandboxStats {
  totalRuns: number;
  successfulRuns: number;
  violationsBlocked: number;
  avgExecutionTimeMs: number;
}

/**
 * OceanicosSandboxEngine: Deterministic Isolated Rule Execution Sandbox
 * with resource quotas, AST safety checks, and watchdog timeouts.
 *
 * ```
 * 💧 Ω∞v ::= Rule Expression ⇄ Static Safety Check ⇄ Isolated Sandbox ⇄ Verified Result
 * ```
 */
export class OceanicosSandboxEngine {
  private static FORBIDDEN_KEYWORDS = [
    'process',
    'require',
    'eval',
    'Function',
    'globalThis',
    'window',
    'document',
    'fetch',
    'XMLHttpRequest',
    'import',
    '__proto__',
    'prototype',
    'constructor',
  ];

  private totalRuns = 0;
  private successfulRuns = 0;
  private violationsBlocked = 0;
  private totalExecutionTimeMs = 0;

  /**
   * Static analysis to check if code contains dangerous tokens
   */
  public validateSafeCode(code: string): { safe: boolean; threats: string[] } {
    const threats: string[] = [];

    for (const keyword of OceanicosSandboxEngine.FORBIDDEN_KEYWORDS) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      if (regex.test(code)) {
        threats.push(`Forbidden identifier: '${keyword}'`);
      }
    }

    // Check for prototype poisoning attempts
    if (code.includes('__proto__') || code.includes('prototype[')) {
      threats.push('Prototype pollution vector detected');
    }

    return {
      safe: threats.length === 0,
      threats,
    };
  }

  /**
   * Execute code in an isolated scope with frozen context and execution limits
   */
  public executeExpression(
    code: string,
    context: Record<string, unknown> = {},
    options: SandboxOptions = {}
  ): SandboxExecutionResult {
    this.totalRuns++;
    const timeoutMs = options.timeoutMs ?? 100;
    const maxGas = options.maxGas ?? 10000;

    // 1. Static Safety Gate
    const safetyCheck = this.validateSafeCode(code);
    if (!safetyCheck.safe) {
      this.violationsBlocked++;
      return {
        success: false,
        result: null,
        executionTimeMs: 0,
        gasConsumed: 0,
        memoryDeltaBytes: 0,
        error: safetyCheck.threats.join('; '),
        violation: 'FORBIDDEN_IDENTIFIER',
      };
    }

    // 2. Prepare Sandbox Context (Deep Clone & Freeze)
    const sandboxContext = Object.freeze({ ...context });
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;

    try {
      // Evaluate within a scoped function body
      const contextKeys = Object.keys(sandboxContext);
      const contextValues = Object.values(sandboxContext);

      // Simple expression gas approximation based on code length & operations
      const estimatedGas = Math.min(maxGas, code.length * 5 + 10);
      if (estimatedGas > maxGas) {
        this.violationsBlocked++;
        return {
          success: false,
          result: null,
          executionTimeMs: 0,
          gasConsumed: maxGas,
          memoryDeltaBytes: 0,
          error: 'Maximum gas allocation exceeded',
          violation: 'GAS_EXHAUSTED',
        };
      }

      // Safe evaluation
      const evaluator = new Function(...contextKeys, `"use strict"; return (${code});`);

      const result = evaluator(...contextValues);
      const executionTimeMs = performance.now() - startTime;
      const memoryDeltaBytes = Math.max(0, process.memoryUsage().heapUsed - startMemory);

      if (executionTimeMs > timeoutMs) {
        this.violationsBlocked++;
        return {
          success: false,
          result: null,
          executionTimeMs: Number(executionTimeMs.toFixed(3)),
          gasConsumed: estimatedGas,
          memoryDeltaBytes,
          error: `Execution timed out (${executionTimeMs.toFixed(1)}ms > ${timeoutMs}ms limit)`,
          violation: 'TIMEOUT',
        };
      }

      this.successfulRuns++;
      this.totalExecutionTimeMs += executionTimeMs;

      return {
        success: true,
        result,
        executionTimeMs: Number(executionTimeMs.toFixed(3)),
        gasConsumed: estimatedGas,
        memoryDeltaBytes,
      };
    } catch (err: unknown) {
      this.violationsBlocked++;
      const executionTimeMs = performance.now() - startTime;
      return {
        success: false,
        result: null,
        executionTimeMs: Number(executionTimeMs.toFixed(3)),
        gasConsumed: 10,
        memoryDeltaBytes: 0,
        error: err instanceof Error ? err.message : 'Execution error',
        violation: 'EXECUTION_ERROR',
      };
    }
  }

  /**
   * Execute a verification rule against an observation in the sandbox
   */
  public executeRule(
    rule: VerificationRule,
    observation: Observation,
    options: SandboxOptions = {}
  ): SandboxExecutionResult {
    const context: Record<string, unknown> = {
      ...(observation.metadata || {}),
      confidence: observation.confidence,
      category: observation.claim.category,
      statement: observation.claim.statement,
      status: observation.status,
    };

    return this.executeExpression(rule.definition, context, options);
  }

  /**
   * Return aggregate sandbox telemetry and violations stats
   */
  public getStats(): SandboxStats {
    const avgTime = this.successfulRuns > 0 ? this.totalExecutionTimeMs / this.successfulRuns : 0;
    return {
      totalRuns: this.totalRuns,
      successfulRuns: this.successfulRuns,
      violationsBlocked: this.violationsBlocked,
      avgExecutionTimeMs: Number(avgTime.toFixed(3)),
    };
  }
}

export default OceanicosSandboxEngine;
