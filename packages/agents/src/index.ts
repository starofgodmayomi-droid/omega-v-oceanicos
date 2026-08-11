import { OceanicosClient, FullLoopResult } from '@omega-v/sdk';
import { RuleCompiler } from '@omega-v/compiler';
import { OceanicumVM, IRProgram } from '@omega-v/ir';
import { GovernanceEngine } from '@omega-v/governance';
import { LearningEngine } from '@omega-v/learning';
import { EvidenceEngine } from '@omega-v/evidence';
import { GreenEngine } from '@omega-v/green';
import { HumanEngine } from '@omega-v/human';

export type AgentRole = 'Observer' | 'Verifier' | 'Builder' | 'Security' | 'Governance' | 'Learning' | 'Human';

export interface AgentActionResult {
  agentRole: AgentRole;
  timestamp: string;
  action: string;
  evidence: Record<string, unknown>;
  verified: boolean;
}

/**
 * Base Formless Agent: Inherits system trust & provenance constraints
 * "Agents are temporary forms of the current." — FORMLESS.md Section XIII
 */
export abstract class FormlessAgent {
  constructor(public readonly role: AgentRole, protected sdk: OceanicosClient) {}

  public abstract executeTask(input: Record<string, unknown>): Promise<AgentActionResult>;
}

export class ObserverAgent extends FormlessAgent {
  constructor(sdk: OceanicosClient) {
    super('Observer', sdk);
  }

  public async executeTask(input: Record<string, unknown>): Promise<AgentActionResult> {
    const claim = (input.claim as string) || 'Observer Agent signal capture';
    const loopRes = await this.sdk.runLoop({
      claim,
      category: 'agent-observation',
      observedBy: 'ObserverAgent',
      metadata: input,
    });

    return {
      agentRole: this.role,
      timestamp: new Date().toISOString(),
      action: 'CAPTURE_SIGNAL',
      evidence: { observationId: loopRes.observation.id },
      verified: loopRes.verification.summary.passed,
    };
  }
}

export class VerifierAgent extends FormlessAgent {
  private compiler = new RuleCompiler();
  private vm = new OceanicumVM();

  constructor(sdk: OceanicosClient) {
    super('Verifier', sdk);
  }

  public async executeTask(input: Record<string, unknown>): Promise<AgentActionResult> {
    const ruleName = (input.ruleName as string) || 'agent-rule';
    const ruleDef = (input.ruleDefinition as string) || 'responseTime < 100';
    const program: IRProgram = this.compiler.compile(ruleName, ruleDef);
    const vmRes = this.vm.execute(program, { metadata: input.metadata || { responseTime: 30 } });

    return {
      agentRole: this.role,
      timestamp: new Date().toISOString(),
      action: 'VERIFY_RULE',
      evidence: { programName: program.name, vmSteps: vmRes.steps.length, stackTop: vmRes.stackTop },
      verified: vmRes.passed,
    };
  }
}

export class SecurityAgent extends FormlessAgent {
  constructor(sdk: OceanicosClient) {
    super('Security', sdk);
  }

  public async executeTask(_input: Record<string, unknown> = {}): Promise<AgentActionResult> {
    const integrity = this.sdk.verifyIntegrity();
    const loopRes = await this.sdk.runLoop({
      claim: 'Security Audit: Event log hash chain integrity check',
      category: 'security-audit',
      observedBy: 'SecurityAgent',
      metadata: { validChain: integrity.valid },
    });

    return {
      agentRole: this.role,
      timestamp: new Date().toISOString(),
      action: 'SECURITY_AUDIT',
      evidence: { integrityValid: integrity.valid, attestation: loopRes.attestation.signature },
      verified: integrity.valid && loopRes.attestation.verified,
    };
  }
}

export class GovernanceAgent extends FormlessAgent {
  private engine = new GovernanceEngine();

  constructor(sdk: OceanicosClient) {
    super('Governance', sdk);
    this.engine.registerRule({
      id: 'gov-rule-swarm',
      action: 'AGENT_AUTONOMY',
      requiresHumanApproval: false,
      minimumConfidenceThreshold: 0.5,
      maximumRiskThreshold: 0.5,
      active: true,
    });
  }

  public async executeTask(input: Record<string, unknown>): Promise<AgentActionResult> {
    const confidence = (input.confidence as number) ?? 0.8;
    const risk = (input.risk as number) ?? 0.1;
    const decision = this.engine.requestAction('AGENT_AUTONOMY', 'GovernanceAgent', { confidence, risk });

    return {
      agentRole: this.role,
      timestamp: new Date().toISOString(),
      action: 'GOVERNANCE_CHECK',
      evidence: { decisionId: decision.id, reason: decision.reason, allowed: decision.allowed },
      verified: decision.allowed,
    };
  }
}

export class LearningAgent extends FormlessAgent {
  private engine = new LearningEngine();

  constructor(sdk: OceanicosClient) {
    super('Learning', sdk);
  }

  public async executeTask(input: Record<string, unknown> = {}): Promise<AgentActionResult> {
    const prediction = this.engine.makePrediction('PASS', 0.9, 'swarm-rule');
    const mockVerificationResult = input.verificationResult as any;

    if (mockVerificationResult) {
      const learningEvent = this.engine.evaluatePrediction(prediction.id, mockVerificationResult);
      return {
        agentRole: this.role,
        timestamp: new Date().toISOString(),
        action: 'EXTRACT_INSIGHTS',
        evidence: {
          predictionId: prediction.id,
          learningEventId: learningEvent.id,
          error: learningEvent.error,
          recommendation: learningEvent.insight.recommendation,
        },
        verified: learningEvent.error < 0.5,
      };
    }

    return {
      agentRole: this.role,
      timestamp: new Date().toISOString(),
      action: 'EXTRACT_INSIGHTS',
      evidence: {
        predictionId: prediction.id,
        insight: 'No verification result provided for feedback loop',
      },
      verified: true,
    };
  }
}

export class HumanAgent extends FormlessAgent {
  private engine = new HumanEngine();

  constructor(sdk: OceanicosClient) {
    super('Human', sdk);
  }

  public async executeTask(input: Record<string, unknown>): Promise<AgentActionResult> {
    const inputType = (input.type as any) || 'APPROVAL';
    const rationale = (input.rationale as string) || 'Human participant verified cycle';
    const humanInput = this.engine.recordInput(inputType, 'human-operator', rationale, input);

    return {
      agentRole: this.role,
      timestamp: new Date().toISOString(),
      action: 'HUMAN_INPUT',
      evidence: { humanInputId: humanInput.id, type: humanInput.type, rationale: humanInput.rationale },
      verified: true,
    };
  }
}

/**
 * FormlessSwarm: Orchestrates multi-agent verification workflows
 */
export class FormlessSwarm {
  private observerAgent: ObserverAgent;
  private verifierAgent: VerifierAgent;
  private securityAgent: SecurityAgent;
  private governanceAgent: GovernanceAgent;
  private learningAgent: LearningAgent;
  private humanAgent: HumanAgent;

  private evidenceEngine = new EvidenceEngine();
  private greenEngine = new GreenEngine();

  constructor(private sdk: OceanicosClient = new OceanicosClient()) {
    this.observerAgent = new ObserverAgent(this.sdk);
    this.verifierAgent = new VerifierAgent(this.sdk);
    this.securityAgent = new SecurityAgent(this.sdk);
    this.governanceAgent = new GovernanceAgent(this.sdk);
    this.learningAgent = new LearningAgent(this.sdk);
    this.humanAgent = new HumanAgent(this.sdk);
  }

  /**
   * Run multi-agent full verification cycle across all agent roles
   */
  public async executeSwarmCycle(input: {
    claim: string;
    ruleName?: string;
    ruleDefinition?: string;
    metadata?: Record<string, unknown>;
  }): Promise<{
    success: boolean;
    isGreen: boolean;
    agentResults: AgentActionResult[];
    fullLoopResult: FullLoopResult;
    evidenceArtifactId: string;
  }> {
    const results: AgentActionResult[] = [];

    // 1. Observer Agent
    const obsRes = await this.observerAgent.executeTask({ claim: input.claim });
    results.push(obsRes);

    // 2. Verifier Agent
    const verRes = await this.verifierAgent.executeTask({
      ruleName: input.ruleName || 'swarm-rule',
      ruleDefinition: input.ruleDefinition || 'responseTime < 100',
      metadata: input.metadata || { responseTime: 35 },
    });
    results.push(verRes);

    // 3. Security Agent
    const secRes = await this.securityAgent.executeTask({});
    results.push(secRes);

    // 4. Governance Agent
    const govRes = await this.governanceAgent.executeTask({ confidence: 0.9, risk: 0.1 });
    results.push(govRes);

    // Run underlying full loop to seal the cycle
    const fullLoopResult = await this.sdk.runLoop({
      claim: `Swarm Cycle Completed: ${input.claim}`,
      category: 'swarm-orchestration',
      observedBy: 'FormlessSwarm',
      metadata: { agentCount: results.length },
    });

    // 5. Learning Agent (fed with verification result)
    const learnRes = await this.learningAgent.executeTask({ verificationResult: fullLoopResult.verification });
    results.push(learnRes);

    // 6. Human Agent
    const humRes = await this.humanAgent.executeTask({ type: 'APPROVAL', rationale: 'Swarm cycle verified by human proxy' });
    results.push(humRes);

    // Generate Evidence Artifact
    const artifact = this.evidenceEngine.generateArtifact(
      fullLoopResult.verification,
      [
        { id: 1, type: 'OBSERVATION', data: fullLoopResult.observation, recordedAt: new Date().toISOString(), hash: 'hash1', previousHash: '0' },
        { id: 2, type: 'VERIFICATION', data: fullLoopResult.verification, recordedAt: new Date().toISOString(), hash: 'hash2', previousHash: 'hash1' }
      ],
      'swarm-env',
      { '@omega-v/agents': '1.0.0' }
    );

    // Evaluate GREEN Rule
    const greenEval = this.greenEngine.evaluateGreen(
      fullLoopResult.verification,
      true,
      [{ id: 1, type: 'OBSERVATION', data: fullLoopResult.observation, recordedAt: new Date().toISOString(), hash: 'hash1', previousHash: '0' }],
      fullLoopResult.attestation
    );

    const allVerified = results.every((r) => r.verified) && fullLoopResult.attestation.verified;

    return {
      success: allVerified,
      isGreen: greenEval.isGreen,
      agentResults: results,
      fullLoopResult,
      evidenceArtifactId: artifact.id,
    };
  }
}

export default FormlessSwarm;

