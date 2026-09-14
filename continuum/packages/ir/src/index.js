/**
 * Oceanicum IR (Intermediate Representation) Specification & Virtual Machine
 *
 * Step 2 execution engine: Evaluates compiled verification rules against observations.
 */
export var Opcode;
(function (Opcode) {
  /** Load field from observation metadata into stack */
  Opcode['LOAD'] = 'LOAD';
  /** Push constant primitive value onto stack */
  Opcode['CONST'] = 'CONST';
  /** Binary Equal (==) */
  Opcode['EQ'] = 'EQ';
  /** Binary Not Equal (!=) */
  Opcode['NEQ'] = 'NEQ';
  /** Binary Less Than (<) */
  Opcode['LT'] = 'LT';
  /** Binary Less Than or Equal (<=) */
  Opcode['LTE'] = 'LTE';
  /** Binary Greater Than (>) */
  Opcode['GT'] = 'GT';
  /** Binary Greater Than or Equal (>=) */
  Opcode['GTE'] = 'GTE';
  /** Logical AND */
  Opcode['AND'] = 'AND';
  /** Logical OR */
  Opcode['OR'] = 'OR';
  /** Logical NOT */
  Opcode['NOT'] = 'NOT';
  /** Store stack top as result key */
  Opcode['STORE'] = 'STORE';
  /** Assert condition on stack top with step reasoning message */
  Opcode['ASSERT'] = 'ASSERT';
})(Opcode || (Opcode = {}));
/**
 * Oceanicum VM: Stack-based virtual machine executing Oceanicum IR bytecode
 */
export class OceanicumVM {
  execute(program, context) {
    const stack = [];
    const steps = [];
    const logs = [];
    let passed = true;
    let stepCount = 0;
    for (const inst of program.instructions) {
      stepCount++;
      let stepPassed = true;
      let reasoning = `Executed ${inst.opcode}`;
      switch (inst.opcode) {
        case Opcode.LOAD: {
          const path = String(inst.operand);
          const val = this.getNestedValue(context, path);
          stack.push(val);
          reasoning = `Loaded property '${path}' = ${JSON.stringify(val)}`;
          break;
        }
        case Opcode.CONST: {
          stack.push(inst.operand);
          reasoning = `Pushed constant ${JSON.stringify(inst.operand)}`;
          break;
        }
        case Opcode.EQ: {
          const b = stack.pop();
          const a = stack.pop();
          const res = a === b;
          stack.push(res);
          reasoning = `Evaluated (${JSON.stringify(a)} == ${JSON.stringify(b)}) -> ${res}`;
          break;
        }
        case Opcode.NEQ: {
          const b = stack.pop();
          const a = stack.pop();
          const res = a !== b;
          stack.push(res);
          reasoning = `Evaluated (${JSON.stringify(a)} != ${JSON.stringify(b)}) -> ${res}`;
          break;
        }
        case Opcode.LT: {
          const b = stack.pop();
          const a = stack.pop();
          const res = a < b;
          stack.push(res);
          reasoning = `Evaluated (${a} < ${b}) -> ${res}`;
          break;
        }
        case Opcode.LTE: {
          const b = stack.pop();
          const a = stack.pop();
          const res = a <= b;
          stack.push(res);
          reasoning = `Evaluated (${a} <= ${b}) -> ${res}`;
          break;
        }
        case Opcode.GT: {
          const b = stack.pop();
          const a = stack.pop();
          const res = a > b;
          stack.push(res);
          reasoning = `Evaluated (${a} > ${b}) -> ${res}`;
          break;
        }
        case Opcode.GTE: {
          const b = stack.pop();
          const a = stack.pop();
          const res = a >= b;
          stack.push(res);
          reasoning = `Evaluated (${a} >= ${b}) -> ${res}`;
          break;
        }
        case Opcode.AND: {
          const b = Boolean(stack.pop());
          const a = Boolean(stack.pop());
          const res = a && b;
          stack.push(res);
          reasoning = `Evaluated (${a} && ${b}) -> ${res}`;
          break;
        }
        case Opcode.OR: {
          const b = Boolean(stack.pop());
          const a = Boolean(stack.pop());
          const res = a || b;
          stack.push(res);
          reasoning = `Evaluated (${a} || ${b}) -> ${res}`;
          break;
        }
        case Opcode.NOT: {
          const val = Boolean(stack.pop());
          const res = !val;
          stack.push(res);
          reasoning = `Evaluated (!${val}) -> ${res}`;
          break;
        }
        case Opcode.ASSERT: {
          const condition = Boolean(stack[stack.length - 1]);
          if (!condition) {
            stepPassed = false;
            passed = false;
          }
          reasoning = inst.operand ? String(inst.operand) : `Assert condition: ${condition}`;
          break;
        }
        case Opcode.STORE: {
          reasoning = `Stored output '${inst.operand}' = ${JSON.stringify(stack[stack.length - 1])}`;
          break;
        }
      }
      steps.push({
        step: stepCount,
        instruction: inst,
        stackState: [...stack],
        passed: stepPassed,
        reasoning,
      });
      logs.push(`[STEP ${stepCount}] ${inst.opcode}: ${reasoning}`);
    }
    return {
      passed: passed && Boolean(stack[stack.length - 1]),
      stackTop: stack[stack.length - 1],
      steps,
      logs,
    };
  }
  getNestedValue(obj, path) {
    const parts = path.split('.');
    let curr = obj;
    for (const part of parts) {
      if (curr === null || curr === undefined || typeof curr !== 'object') return undefined;
      curr = curr[part];
    }
    return curr;
  }
}
export default OceanicumVM;
//# sourceMappingURL=index.js.map
