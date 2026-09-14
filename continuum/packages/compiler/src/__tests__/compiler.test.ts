import { RuleCompiler } from '../index';
import { OceanicumVM, Opcode } from '@omega-v/ir';

describe('RuleCompiler', () => {
  let compiler: RuleCompiler;
  let vm: OceanicumVM;

  beforeEach(() => {
    compiler = new RuleCompiler();
    vm = new OceanicumVM();
  });

  it('should compile `responseTime < 100` to valid IR instructions', () => {
    const program = compiler.compile('response-time-check', 'responseTime < 100');
    expect(program.name).toBe('response-time-check');
    expect(program.instructions).toHaveLength(4); // LOAD, CONST, LT, ASSERT
    expect(program.instructions[0]).toEqual({
      opcode: Opcode.LOAD,
      operand: 'metadata.responseTime',
    });
    expect(program.instructions[1]).toEqual({ opcode: Opcode.CONST, operand: 100 });
  });

  it('should compile and execute `statusCode == 200` in OceanicumVM', () => {
    const program = compiler.compile('status-code-check', 'statusCode == 200');
    const result = vm.execute(program, { metadata: { statusCode: 200 } });
    expect(result.passed).toBe(true);
  });

  it('should compile all comparison operators (!=, <=, >=, >)', () => {
    expect(compiler.compile('neq-rule', 'statusCode != 500').instructions[2].opcode).toBe(
      Opcode.NEQ
    );
    expect(compiler.compile('lte-rule', 'latency <= 50').instructions[2].opcode).toBe(Opcode.LTE);
    expect(compiler.compile('gte-rule', 'score >= 90').instructions[2].opcode).toBe(Opcode.GTE);
    expect(compiler.compile('gt-rule', 'cpu > 10').instructions[2].opcode).toBe(Opcode.GT);
  });

  it('should compile expression with OR `status == "ok" || status == "warning"`', () => {
    const program = compiler.compile('or-check', 'status == "ok" || status == "warning"');
    const res1 = vm.execute(program, { metadata: { status: 'ok' } });
    expect(res1.passed).toBe(true);

    const res2 = vm.execute(program, { metadata: { status: 'warning' } });
    expect(res2.passed).toBe(true);
  });

  it('should parse boolean, string, and null literals correctly', () => {
    const prog1 = compiler.compile('bool-check', 'active == true');
    expect(prog1.instructions[1].operand).toBe(true);

    const prog2 = compiler.compile('null-check', 'data == null');
    expect(prog2.instructions[1].operand).toBe(null);
  });

  it('should compile and execute `contains` string operator', () => {
    const prog = compiler.compile('contains-check', 'serviceName contains "gateway"');
    expect(prog.instructions[2].opcode).toBe(Opcode.CONTAINS);

    const res = vm.execute(prog, { metadata: { serviceName: 'production-gateway-v2' } });
    expect(res.passed).toBe(true);
  });

  it('should compile and execute `between` numeric range operator', () => {
    const prog = compiler.compile('between-check', 'responseTime between 10 50');
    expect(prog.instructions[3].opcode).toBe(Opcode.BETWEEN);

    const res1 = vm.execute(prog, { metadata: { responseTime: 25 } });
    expect(res1.passed).toBe(true);

    const res2 = vm.execute(prog, { metadata: { responseTime: 99 } });
    expect(res2.passed).toBe(false);
  });

  it('should throw clear syntax error on invalid rule syntax', () => {
    expect(() => {
      compiler.compile('invalid-rule', 'invalid syntax without operator');
    }).toThrow('Compiler Syntax Error');
  });
});
