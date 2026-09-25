import { Observer } from '@oceanicos/observer';
import { VerificationEngine } from '@oceanicos/verification';
import { AttestationService } from '@oceanicos/attestation';

describe('Ω∞v Oceanicos Integration — Verification Loop', () => {
  let observer: Observer;
  let verificationEngine: VerificationEngine;
  let attestationService: AttestationService;

  beforeEach(() => {
    observer = new Observer();
    verificationEngine = new VerificationEngine();
    attestationService = new AttestationService('integration-test-key-v1', '1.0');

    verificationEngine.registerRule({
      name: 'response-time-threshold',
      version: '1.0.5',
      appliesTo: ['health-check'],
      definition: 'responseTime < 100',
      description: 'Verify response time is below 100ms',
      createdAt: new Date().toISOString(),
      active: true,
    });

    verificationEngine.registerRule({
      name: 'status-code-check',
      version: '1.2.0',
      appliesTo: ['health-check'],
      definition: 'statusCode == 200',
      description: 'Verify HTTP status code is 200 OK',
      createdAt: new Date().toISOString(),
      active: true,
    });
  });

  it('should complete full cycle: Observe → Verify → Attest', () => {
    // 1. Observe
    const observation = observer.observe({
      claim: 'Production Gateway operational',
      category: 'health-check',
      source: {
        system: 'production-gateway',
        version: '2.4.0',
        environment: 'production',
      },
      observedBy: 'automated-telemetry',
      metadata: {
        statusCode: 200,
        responseTime: 35,
      },
      confidence: 0.99,
      confidenceReason: '1000 consecutive HTTP 200 responses under 50ms',
    });

    expect(observation).toBeDefined();
    expect(observation.status).toBe('normalized');

    // 2. Verify
    const verificationResult = verificationEngine.verify(observation);
    expect(verificationResult.summary.passed).toBe(true);
    expect(verificationResult.summary.rulesPassed).toBe(2);
    expect(verificationResult.evidencePath.length).toBeGreaterThanOrEqual(2);

    // 3. Attest
    const attestation = attestationService.attest(verificationResult, {
      attestedBy: 'omega-v-attestor-service',
    });

    expect(attestation.verified).toBe(true);
    expect(attestation.signature).toMatch(/^0x/);
    expect(attestation.status).toBe('signed');

    // 4. Validate Attestation Signature
    const isValid = attestationService.verify(attestation);
    expect(isValid).toBe(true);
  });
});
