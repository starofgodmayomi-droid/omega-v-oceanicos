import { OceanicumVM, Opcode, IRProgram } from '../index';

describe('OceanicumVM (IR Execution Engine)', () => {
  let vm: OceanicumVM;

  beforeEach(() => {
    vm = new OceanicumVM();
  });

  it('should execute a simple comparison program (responseTime < 100)', () => {
    const program: IRProgram = {
      name: 'response-time-check',
      version: '1.0.0',
      instructions: [
        { opcode: Opcode.LOAD, operand: 'metadata.responseTime' },
        { opcode: Opcode.CONST, operand: 100 },
        { opcode: Opcode.LT },
        { opcode: Opcode.ASSERT, operand: 'Response time must be below 100ms' },
      ],
    };

    const result = vm.execute(program, { metadata: { responseTime: 45 } });
    expect(result.passed).toBe(true);
    expect(result.stackTop).toBe(true);
    expect(result.steps).toHaveLength(4);
  });

  it('should fail assertion when threshold exceeded', () => {
    const program: IRProgram = {
      name: 'response-time-check',
      version: '1.0.0',
      instructions: [
        { opcode: Opcode.LOAD, operand: 'metadata.responseTime' },
        { opcode: Opcode.CONST, operand: 100 },
        { opcode: Opcode.LT },
        { opcode: Opcode.ASSERT, operand: 'Response time must be below 100ms' },
      ],
    };

    const result = vm.execute(program, { metadata: { responseTime: 250 } });
    expect(result.passed).toBe(false);
    expect(result.stackTop).toBe(false);
  });

  it('should execute comparison opcodes LTE, GTE, GT, NEQ', () => {
    const program: IRProgram = {
      name: 'multi-cmp-test',
      version: '1.0.0',
      instructions: [
        { opcode: Opcode.LOAD, operand: 'val' },
        { opcode: Opcode.CONST, operand: 10 },
        { opcode: Opcode.LTE },
        { opcode: Opcode.LOAD, operand: 'val' },
        { opcode: Opcode.CONST, operand: 5 },
        { opcode: Opcode.GTE },
        { opcode: Opcode.AND },
        { opcode: Opcode.LOAD, operand: 'val' },
        { opcode: Opcode.CONST, operand: 0 },
        { opcode: Opcode.NEQ },
        { opcode: Opcode.AND },
        { opcode: Opcode.STORE, operand: 'isValid' },
      ],
    };

    const res = vm.execute(program, { val: 8 });
    expect(res.passed).toBe(true);
  });

  it('should execute logical OR and NOT opcodes', () => {
    const program: IRProgram = {
      name: 'logical-test',
      version: '1.0.0',
      instructions: [
        { opcode: Opcode.LOAD, operand: 'flag' },
        { opcode: Opcode.NOT },
        { opcode: Opcode.LOAD, operand: 'alt' },
        { opcode: Opcode.OR },
      ],
    };

    const res = vm.execute(program, { flag: true, alt: true });
    expect(res.passed).toBe(true);
  });
});
