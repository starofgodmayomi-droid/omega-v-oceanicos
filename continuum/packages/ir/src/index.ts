/**
 * Oceanicum IR (Intermediate Representation) Specification & Virtual Machine
 *
 * Step 2 execution engine: Evaluates compiled verification rules against observations.
 */

export enum Opcode {
  /** Load field from observation metadata into stack */
  LOAD = 'LOAD',
  /** Push constant primitive value onto stack */
  CONST = 'CONST',
  /** Binary Equal (==) */
  EQ = 'EQ',
  /** Binary Not Equal (!=) */
  NEQ = 'NEQ',
  /** Binary Less Than (<) */
  LT = 'LT',
  /** Binary Less Than or Equal (<=) */
  LTE = 'LTE',
  /** Binary Greater Than (>) */
  GT = 'GT',
  /** Binary Greater Than or Equal (>=) */
  GTE = 'GTE',
  /** Logical AND */
  AND = 'AND',
  /** Logical OR */
  OR = 'OR',
  /** Logical NOT */
  NOT = 'NOT',
  /** String or Array substring check */
  CONTAINS = 'CONTAINS',
  /** Numeric range check */
  BETWEEN = 'BETWEEN',
  /** Store stack top as result key */
  STORE = 'STORE',
  /** Assert condition on stack top with step reasoning message */
  ASSERT = 'ASSERT',
}

export interface Instruction {
  opcode: Opcode;
  operand?: unknown;
}

export interface IRProgram {
  version: string;
  name: string;
  instructions: Instruction[];
}

export interface VMStepResult {
  step: number;
  instruction: Instruction;
  stackState: unknown[];
  passed: boolean;
  reasoning: string;
}

export interface VMExecutionResult {
  passed: boolean;
  stackTop: unknown;
  steps: VMStepResult[];
  logs: string[];
}

/**
 * Oceanicum VM: Stack-based virtual machine executing Oceanicum IR bytecode
 */
export class OceanicumVM {
  public execute(program: IRProgram, context: Record<string, unknown>): VMExecutionResult {
    const stack: unknown[] = [];
    const steps: VMStepResult[] = [];
    const logs: string[] = [];
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
          const b = stack.pop() as number;
          const a = stack.pop() as number;
          const res = a < b;
          stack.push(res);
          reasoning = `Evaluated (${a} < ${b}) -> ${res}`;
          break;
        }

        case Opcode.LTE: {
          const b = stack.pop() as number;
          const a = stack.pop() as number;
          const res = a <= b;
          stack.push(res);
          reasoning = `Evaluated (${a} <= ${b}) -> ${res}`;
          break;
        }

        case Opcode.GT: {
          const b = stack.pop() as number;
          const a = stack.pop() as number;
          const res = a > b;
          stack.push(res);
          reasoning = `Evaluated (${a} > ${b}) -> ${res}`;
          break;
        }

        case Opcode.GTE: {
          const b = stack.pop() as number;
          const a = stack.pop() as number;
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

        case Opcode.CONTAINS: {
          const needle = stack.pop();
          const haystack = stack.pop();
          let res = false;
          if (typeof haystack === 'string' && typeof needle === 'string') {
            res = haystack.includes(needle);
          } else if (Array.isArray(haystack)) {
            res = haystack.includes(needle);
          }
          stack.push(res);
          reasoning = `Evaluated (${JSON.stringify(haystack)} CONTAINS ${JSON.stringify(needle)}) -> ${res}`;
          break;
        }

        case Opcode.BETWEEN: {
          const max = stack.pop() as number;
          const min = stack.pop() as number;
          const val = stack.pop() as number;
          const res = val >= min && val <= max;
          stack.push(res);
          reasoning = `Evaluated (${val} BETWEEN [${min}, ${max}]) -> ${res}`;
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

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let curr: unknown = obj;
    for (const part of parts) {
      if (curr === null || curr === undefined || typeof curr !== 'object') return undefined;
      curr = (curr as Record<string, unknown>)[part];
    }
    return curr;
  }
}

export default OceanicumVM;
