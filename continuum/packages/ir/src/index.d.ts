/**
 * Oceanicum IR (Intermediate Representation) Specification & Virtual Machine
 *
 * Step 2 execution engine: Evaluates compiled verification rules against observations.
 */
export declare enum Opcode {
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
export declare class OceanicumVM {
  execute(program: IRProgram, context: Record<string, unknown>): VMExecutionResult;
  private getNestedValue;
}
export default OceanicumVM;
//# sourceMappingURL=index.d.ts.map
