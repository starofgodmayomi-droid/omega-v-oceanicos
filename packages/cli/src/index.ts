import { OceanicosClient } from '@omega-v/sdk';
import { FormlessSwarm } from '@omega-v/agents';
import { EdgeObserver } from '@omega-v/edge';
import { VerificationAnalyticsEngine } from '@omega-v/analytics';
import { VerificationScheduler } from '@omega-v/scheduler';
import { TelemetryTracer, VerificationSLOEngine } from '@omega-v/telemetry';
import { VaaSGate } from '@omega-v/vaas';
import { VerificationReplayEngine } from '@omega-v/replay';
import { FormalContractEngine } from '@omega-v/contract';

export interface CLIResult {
  success: boolean;
  message: string;
  output?: unknown;
}

export class OceanicosCLI {
  private client: OceanicosClient;

  constructor(client?: OceanicosClient) {
    this.client = client || new OceanicosClient();
  }

  public async run(args: string[]): Promise<CLIResult> {
    const command = args[0] || 'help';

    switch (command) {
      case 'loop': {
        const claim = args[1] || 'Default CLI verification claim';
        const result = await this.client.runLoop({ claim });
        return {
          success: result.verification.summary.passed,
          message: `[Ω∞v CLI] Full Loop Complete: ${result.verification.summary.passed ? 'PASSED' : 'FAILED'}`,
          output: {
            observationId: result.observation.id,
            verified: result.verification.summary.passed,
            attestationId: result.attestation.id,
            signature: result.attestation.signature,
          },
        };
      }

      case 'swarm': {
        const claim = args[1] || 'CLI Swarm verification cycle';
        const swarm = new FormlessSwarm(this.client);
        const result = await swarm.executeSwarmCycle({
          claim,
          ruleName: 'cli-swarm-rule',
          ruleDefinition: 'responseTime < 100',
          metadata: { responseTime: 35 },
        });
        return {
          success: result.success,
          message: `[Ω∞v CLI] Formless Swarm Cycle: ${result.success ? 'PASSED' : 'FAILED'} (${result.agentResults.length} Agents executed)`,
          output: {
            success: result.success,
            agentsCount: result.agentResults.length,
            attestationId: result.fullLoopResult.attestation.id,
            signature: result.fullLoopResult.attestation.signature,
          },
        };
      }

      case 'metrics': {
        const metrics = this.client.getMetrics();
        return {
          success: true,
          message: '[Ω∞v CLI] System Metrics',
          output: metrics,
        };
      }

      case 'log': {
        const entries = this.client.getLogEntries();
        return {
          success: true,
          message: `[Ω∞v CLI] Provenance Log (${entries.length} entries)`,
          output: entries,
        };
      }

      case 'integrity': {
        const integrity = this.client.verifyIntegrity();
        return {
          success: integrity.valid,
          message: `[Ω∞v CLI] Chain Integrity: ${integrity.valid ? 'VALID' : 'BROKEN'}`,
          output: integrity,
        };
      }

      case 'edge': {
        const claim = args[1] || 'CLI Edge Observation';
        const edge = new EdgeObserver({ nodeId: 'cli-edge-node-1' });
        edge.capture(claim, 'cli-edge');
        const syncResult = await edge.flush();
        return {
          success: syncResult.success,
          message: `[Ω∞v CLI] Edge Observation Batch Synced: ${syncResult.batchId}`,
          output: {
            batchId: syncResult.batchId,
            merkleRoot: syncResult.merkleRoot,
            syncedCount: syncResult.syncedCount,
          },
        };
      }

      case 'analytics': {
        const entries = this.client.getLogEntries();
        const analytics = new VerificationAnalyticsEngine();
        const summary = analytics.analyzeLogs(entries);
        return {
          success: true,
          message: `[Ω∞v CLI] Verification Analytics & Efficacy (Pass Rate: ${(summary.overallPassRate * 100).toFixed(0)}%)`,
          output: summary,
        };
      }

      case 'scheduler': {
        const subCmd = args[1] || 'status';
        const intervalMs = args[2] ? Number(args[2]) : 10000;
        const claim = args[3] || 'Ω∞v CLI scheduled loop';

        const sched = new VerificationScheduler(this.client, { intervalMs, claim, maxRuns: 1 });

        if (subCmd === 'run') {
          sched.start();
          // Wait for one run to complete
          await new Promise<void>((resolve) => setTimeout(resolve, intervalMs + 500));
          sched.stop();
          const state = sched.getState();
          return {
            success: state.totalRuns > 0,
            message: `[Ω∞v CLI] Scheduler: ${state.totalRuns} runs | ${state.passedRuns} passed | ${state.failedRuns} failed`,
            output: state,
          };
        }

        return {
          success: true,
          message: '[Ω∞v CLI] Scheduler available. Use: omega-v scheduler run [intervalMs] [claim]',
          output: { status: 'IDLE', usage: 'omega-v scheduler run [intervalMs] [claim]' },
        };
      }

      case 'slo': {
        const targetRate = args[1] ? Number(args[1]) : 0.99;
        const metrics = this.client.getMetrics();
        const sloEngine = new VerificationSLOEngine();
        const evaluation = sloEngine.evaluateSLO(metrics, targetRate);
        return {
          success: evaluation.isHealthy,
          message: `[Ω∞v CLI] Verification SLO: ${evaluation.isHealthy ? 'HEALTHY' : 'DEGRADED'} (Pass Rate: ${(evaluation.actualPassRate * 100).toFixed(1)}% / Target: ${(targetRate * 100).toFixed(1)}%)`,
          output: evaluation,
        };
      }

      case 'trace': {
        const tracer = new TelemetryTracer();
        const span = tracer.startSpan('cli-trace-span', undefined, {
          command: args[1] || 'default',
        });
        tracer.addEvent(span, 'cli_invocation');
        tracer.endSpan(span, 'OK');
        const traceContext = { traceId: span.traceId, spanId: span.spanId, traceFlags: 1 };
        const traceparent = tracer.injectTraceparent(traceContext);
        return {
          success: true,
          message: `[Ω∞v CLI] Trace Context Generated: ${traceparent}`,
          output: { span, traceparent },
        };
      }

      case 'vaas': {
        const subCmd = args[1] || 'register';
        const vaasGate = new VaaSGate();

        if (subCmd === 'register') {
          const tenantName = args[2] || 'Default Organization';
          const tier = (args[3] as 'FREE' | 'PRO' | 'ENTERPRISE') || 'PRO';
          const creds = vaasGate.registerTenant(tenantName, tier);
          return {
            success: true,
            message: `[Ω∞v CLI] VaaS Tenant Registered: ${creds.tenant.name} (${creds.tenant.id})`,
            output: creds,
          };
        }

        return {
          success: true,
          message: '[Ω∞v CLI] VaaS Gateway: Use omega-v vaas register [name] [tier]',
          output: { usage: 'omega-v vaas register [name] [tier]' },
        };
      }

      case 'replay': {
        const replayEngine = new VerificationReplayEngine();
        const claim = args[1] || 'CLI Replay verification snapshot';
        const label = args[2] || undefined;

        // Phase 1: Capture a baseline snapshot
        const baselineResult = await this.client.runLoop({
          claim,
          category: 'replay-cli',
          observedBy: 'cli-replay',
          sourceSystem: 'omega-v-cli',
        });
        const baseline = replayEngine.capture(claim, baselineResult, label || 'Baseline', ['cli']);

        // Phase 2: Replay the snapshot
        const replayResult = await replayEngine.replay(baseline.id, this.client);

        return {
          success: !replayResult.diff.regressionDetected,
          message:
            `[Ω∞v CLI] Replay ${replayResult.diff.regressionDetected ? 'REGRESSION DETECTED' : 'OK — no regression'}. ` +
            `Changes: ${replayResult.diff.changes.length}, Duration: ${replayResult.durationMs}ms`,
          output: {
            baselineId: baseline.id,
            replayedId: replayResult.replayed.id,
            identical: replayResult.diff.identical,
            regressionDetected: replayResult.diff.regressionDetected,
            changes: replayResult.diff.changes.length,
            durationMs: replayResult.durationMs,
          },
        };
      }

      case 'contract': {
        const engine = new FormalContractEngine();
        const subCommand = args[1] || 'list';

        if (subCommand === 'verify') {
          const contractIdOrName = args[2] || 'health-sla-contract';
          const sampleData = { responseTime: 45, statusCode: 200 };
          const result = engine.verify(sampleData, contractIdOrName);

          return {
            success: result.valid,
            message: `[Ω∞v CLI] Contract '${result.contractName}' Verification: ${result.valid ? 'VALID (PASSED)' : 'VIOLATED (FAILED)'}`,
            output: result,
          };
        }

        const contracts = engine.getContracts();
        return {
          success: true,
          message: `[Ω∞v CLI] Formal Contracts Registered: ${contracts.length}`,
          output: contracts.map((c) => ({
            id: c.id,
            name: c.name,
            version: c.version,
            category: c.category,
            fields: Object.keys(c.fields).length,
            invariants: c.invariants.length,
          })),
        };
      }

      case 'help':
      default: {
        return {
          success: true,
          message: `Ω∞v Oceanicos CLI v0.1.0
Commands:
  omega-v loop [claim]              Execute complete verification loop
  omega-v swarm [claim]             Execute multi-agent Formless Swarm cycle
  omega-v edge [claim]              Capture & flush Merkle edge observation batch
  omega-v analytics                 Compute rule efficacy & pattern analytics
  omega-v scheduler run [ms] [claim] Run one autonomous scheduled loop
  omega-v slo [targetRate]          Evaluate Service Level Objective & error budget
  omega-v trace [name]              Generate W3C distributed trace context
  omega-v vaas register [name] [tier] Register multi-tenant VaaS organization
  omega-v replay [claim] [label]    Capture & replay verification snapshot with diff
  omega-v contract [list|verify]    List formal contracts or verify sample payload
  omega-v metrics                   Show system health and metrics
  omega-v log                       Display event provenance log
  omega-v integrity                 Verify event hash chain integrity
  omega-v help                      Show this help menu`,
        };
      }
    }
  }
}

export default OceanicosCLI;
