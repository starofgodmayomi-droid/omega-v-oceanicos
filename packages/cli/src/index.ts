import { OceanicosClient } from '@omega-v/sdk';
import { FormlessSwarm } from '@omega-v/agents';
import { EdgeObserver } from '@omega-v/edge';
import { VerificationAnalyticsEngine } from '@omega-v/analytics';
import { VerificationScheduler } from '@omega-v/scheduler';

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
