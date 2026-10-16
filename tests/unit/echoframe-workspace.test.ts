import { describe, expect, it } from '@jest/globals';
import { EchoframeWorkspace } from '../../packages/generative/src/workspace.js';

describe('ECHOFRAME Workspace Engine (@oceanicos/generative)', () => {
  const workspace = new EchoframeWorkspace('did:omega:human:starofgodmayomi');

  it('lists the core template descriptors', () => {
    const templates = workspace.listTemplates();
    expect(templates.length).toBe(4);
    const types = templates.map((t) => t.type);
    expect(types).toContain('primitive');
    expect(types).toContain('route');
    expect(types).toContain('agent');
    expect(types).toContain('contract');
  });

  it('synthesizes a verified primitive template', () => {
    const artifact = workspace.synthesizeTemplate('primitive', 'WaveSensor', {
      sanctum: 'HOLY_PLACE',
      failClosed: true,
    });

    expect(artifact.name).toBe('WaveSensor');
    expect(artifact.type).toBe('primitive');
    expect(artifact.suggestedPath).toBe('packages/wavesensor/src/index.ts');
    expect(artifact.code).toContain('class WaveSensorPrimitive');
    expect(artifact.code).toContain('Ω∞v ::= VERIFY(ΔREALITY)');
    expect(artifact.verificationGate.failClosed).toBe(true);
    expect(artifact.digest.length).toBe(64);
    expect(artifact.verificationGate.hashProof.length).toBe(64);
  });

  it('synthesizes a route contract template', () => {
    const artifact = workspace.synthesizeTemplate('route', 'TensorStream');
    expect(artifact.name).toBe('TensorStream');
    expect(artifact.type).toBe('route');
    expect(artifact.suggestedPath).toBe('apps/api/src/routes/tensorstream-route.ts');
    expect(artifact.code).toContain('registerTensorStreamRoute');
  });

  it('synthesizes an agent template with human consent gate', () => {
    const artifact = workspace.synthesizeTemplate('agent', 'Sentinel');
    expect(artifact.name).toBe('Sentinel');
    expect(artifact.type).toBe('agent');
    expect(artifact.code).toContain('HUMAN_CONSENT_REQUIRED');
  });

  it('synthesizes a specification contract template', () => {
    const artifact = workspace.synthesizeTemplate('contract', 'PlanetaryWave', {
      sanctum: 'HOLY_OF_HOLIES',
    });
    expect(artifact.name).toBe('PlanetaryWave');
    expect(artifact.type).toBe('contract');
    expect(artifact.suggestedPath).toBe('contracts/PLANETARYWAVE_CONTRACT.md');
    expect(artifact.code).toContain('POSSIBLE ≠ KNOWN ≠ BUILT ≠ EXECUTED ≠ OBSERVED ≠ VERIFIED');
  });

  it('simulates a transition concept without hallucinations', () => {
    const sim = workspace.simulateTransition('Continuous Tensor Ocean Wave');
    expect(sim.concept).toBe('Continuous Tensor Ocean Wave');
    expect(sim.epistemicState).toBe('BUILT');
    expect(sim.harmonicResonanceHz).toBe(432.1);
    expect(sim.entropyLevel).toBeLessThan(0.01);
  });
});
