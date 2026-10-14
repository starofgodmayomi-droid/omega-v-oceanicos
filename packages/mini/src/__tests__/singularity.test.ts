import { WholeEcosystemUpgradeCore } from '../index.js';

describe('WholeEcosystemUpgradeCore (V1111 Convergence)', () => {
  let core: WholeEcosystemUpgradeCore;

  beforeEach(() => {
    core = new WholeEcosystemUpgradeCore();
  });

  test('fails closed when observation is not AUTHORIZED', async () => {
    const unauthObservation = {
      status: 'UNAUTHORIZED',
      uuid: 'obs-unauth-1',
    };

    const result = await core.commitTotalCompression(
      unauthObservation as any,
      '0xprovenance_test_hash'
    );

    expect(result.status).toBe('UNKNOWN');
    expect(result.evidencePath).toContain('upgrade.missing_human_signature');
    expect(result.absoluteAuthority).toBe(false);
    expect(result.chainLength).toBe(0);
  });

  test('commits total compression and appends to hash chain when AUTHORIZED', async () => {
    const authObservation = {
      status: 'AUTHORIZED',
      uuid: 'obs-auth-1',
    };

    const result1 = await core.commitTotalCompression(
      authObservation as any,
      '0xprovenance_alpha'
    );

    expect(result1.status).toBe('VERIFIED');
    expect(result1.evidencePath[0]).toBe('packages/remember/records/upgrade.1');
    expect(result1.absoluteAuthority).toBe(false);
    expect(result1.chainLength).toBe(1);
    expect(result1.tipHash).toHaveLength(64);

    const result2 = await core.commitTotalCompression(
      authObservation as any,
      '0xprovenance_beta'
    );

    expect(result2.status).toBe('VERIFIED');
    expect(result2.chainLength).toBe(2);
    expect(result2.tipHash).not.toBe(result1.tipHash);
    expect(core.getChain()).toHaveLength(2);
  });

  test('hashChainAppend produces deterministic cryptographic links', () => {
    const chain0: string[] = [];
    const chain1 = WholeEcosystemUpgradeCore.hashChainAppend(chain0, 'payload_a');
    const chain2 = WholeEcosystemUpgradeCore.hashChainAppend(chain1, 'payload_b');

    expect(chain1).toHaveLength(1);
    expect(chain2).toHaveLength(2);
    expect(chain1[0]).not.toBe(chain2[1]);

    // Deterministic replay
    const replay1 = WholeEcosystemUpgradeCore.hashChainAppend([], 'payload_a');
    expect(replay1[0]).toBe(chain1[0]);
  });
});

describe('OceanicosKernel.upgradeTransition (Singularity Bridge)', () => {
  test('integrates WholeEcosystemUpgradeCore with canonical state transitions', async () => {
    const { OceanicosKernel } = await import('../canonical-kernel.js');
    const kernel = new OceanicosKernel('test-secret');

    const { canonicalState, upgradeResult } = await kernel.upgradeTransition({
      claim: 'Test 1111 Convergence Upgrade',
      observation: { status: 'AUTHORIZED', uuid: 'obs-singularity-test' },
      provenanceHash: '0xcanonical_upgrade_test',
    });

    expect(upgradeResult.status).toBe('VERIFIED');
    expect(upgradeResult.chainLength).toBe(1);
    expect(canonicalState.stateId).toBeDefined();
    expect(canonicalState.verificationStatus).toBe('VERIFIED');
    expect(kernel.getUpgradeCore()).toBeDefined();
    expect(kernel.getUpgradeCore()?.getChain()).toHaveLength(1);
  });
});
