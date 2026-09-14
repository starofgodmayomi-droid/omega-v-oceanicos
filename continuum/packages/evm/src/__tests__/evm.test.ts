import { OceanicosVirtualMachine } from '../index';

describe('@omega-v/evm — Oceanic Verifiable Virtual Machine Engine', () => {
  let vm: OceanicosVirtualMachine;

  beforeEach(() => {
    vm = new OceanicosVirtualMachine('test-evm-secret');
  });

  it('should execute basic stack arithmetic with gas metering', () => {
    const trace = vm.execute({
      callerDid: 'did:omega:agent:coder',
      code: ['PUSH 10', 'PUSH 25', 'ADD', 'PUSH 5', 'MUL', 'RETURN'],
      gasLimit: 10000,
    });

    expect(trace.success).toBe(true);
    expect(trace.returnValue).toBe('175'); // (10 + 25) * 5 = 175
    expect(trace.gasUsed).toBeGreaterThan(0);
    expect(trace.traceHash).toMatch(/^0x/);
    expect(trace.steps).toHaveLength(6);
  });

  it('should handle storage opcodes (SSTORE, SLOAD) and compute state trie commitments', () => {
    const trace = vm.execute({
      callerDid: 'did:omega:agent:storage-user',
      code: [
        'PUSH balance',
        'PUSH 5000',
        'SSTORE',
        'PUSH balance',
        'SLOAD',
        'PUSH 1000',
        'ADD',
        'RETURN',
      ],
      initialStorage: { owner: '0x1234' },
    });

    expect(trace.success).toBe(true);
    expect(trace.returnValue).toBe('6000'); // 5000 + 1000 = 6000
    expect(trace.storageRoot).toMatch(/^0x/);
  });

  it('should deploy contracts, maintain persistent storage, and execute contract calls', () => {
    // 1. Deploy Counter Contract
    const contract = vm.deployContract({
      deployerDid: 'did:omega:agent:deployer',
      name: 'VerifiableCounter',
      code: [
        'PUSH counter',
        'SLOAD',
        'PUSH 1',
        'ADD',
        'PUSH counter',
        'SWAP',
        'SSTORE',
        'PUSH counter',
        'SLOAD',
        'RETURN',
      ],
      initialStorage: { counter: '0' },
    });

    expect(contract.address).toMatch(/^0x/);
    expect(contract.codeHash).toMatch(/^0x/);
    expect(vm.getContracts()).toHaveLength(1);

    // 2. Call contract first time => counter becomes 1
    const call1 = vm.callContract({
      callerDid: 'did:omega:agent:caller-1',
      contractAddress: contract.address,
    });
    expect(call1.success).toBe(true);
    expect(call1.returnValue).toBe('1');

    // 3. Call contract second time => counter becomes 2
    const call2 = vm.callContract({
      callerDid: 'did:omega:agent:caller-2',
      contractAddress: contract.address,
    });
    expect(call2.success).toBe(true);
    expect(call2.returnValue).toBe('2');

    // Check updated contract storage
    const updated = vm.getContract(contract.address)!;
    expect(updated.storage['counter']).toBe('2');
  });

  it('should handle REVERT opcode and halt with failure state', () => {
    const trace = vm.execute({
      callerDid: 'did:omega:agent:reverting-caller',
      code: ['PUSH 10', 'PUSH 20', 'LT', 'PUSH ERROR_INVALID_CONDITION', 'REVERT'],
    });

    expect(trace.success).toBe(false);
    expect(trace.returnValue).toBe('ERROR_INVALID_CONDITION');
  });

  it('should emit event logs during execution', () => {
    const trace = vm.execute({
      callerDid: 'did:omega:agent:logger',
      code: ['PUSH TransferEvent', 'PUSH from_alice_to_bob_100', 'LOG', 'STOP'],
    });

    expect(trace.success).toBe(true);
    expect(trace.logs).toHaveLength(1);
    expect(trace.logs[0].topic).toBe('TransferEvent');
    expect(trace.logs[0].data).toBe('from_alice_to_bob_100');
  });

  it('should compute VM global telemetry stats', () => {
    vm.execute({ callerDid: 'did:omega:agent:a', code: ['PUSH 1', 'STOP'] });
    const stats = vm.getStats();
    expect(stats.totalExecutions).toBe(1);
    expect(stats.successfulExecutions).toBe(1);
    expect(stats.totalGasConsumed).toBeGreaterThan(0);
    expect(stats.currentGlobalStateRoot).toMatch(/^0x/);
  });
});
