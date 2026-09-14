/**
 * @omega-v/evm — Oceanic Verifiable Virtual Machine (OVM)
 * Deterministic Stack Machine, Gas Metering, State Trie Commitments & Cryptographic Trace Proofs
 *
 * Ω∞v ::= REALITY ⇄ OBSERVE ⇄ EVIDENCE ⇄ VERIFY ⇄ REMEMBER ⇄ REASON ⇄ INTEND ⇄ BUILD ⇄ TEST ⇄ ATTEST ⇄ ACT ⇄ CONSEQUENCE ⇄ LEARN ⇄ AUDIT ⇄ RECOMPILE ↺∞
 */

import { createHmac, randomUUID } from 'crypto';

/* ─── Types ─────────────────────────────────────────────────────── */

export type Opcode =
  | 'PUSH'
  | 'POP'
  | 'DUP'
  | 'SWAP'
  | 'ADD'
  | 'SUB'
  | 'MUL'
  | 'DIV'
  | 'MOD'
  | 'EQ'
  | 'LT'
  | 'GT'
  | 'AND'
  | 'OR'
  | 'XOR'
  | 'NOT'
  | 'SLOAD'
  | 'SSTORE'
  | 'LOG'
  | 'REVERT'
  | 'STOP'
  | 'RETURN';

export interface VMLog {
  index: number;
  topic: string;
  data: string;
}

export interface ExecutionTraceStep {
  step: number;
  pc: number;
  op: string;
  gasRemaining: number;
  gasCost: number;
  stackSnapshot: string[];
}

export interface ExecutionTraceReceipt {
  executionId: string;
  callerDid: string;
  contractAddress?: string;
  success: boolean;
  returnValue?: string;
  gasUsed: number;
  gasRemaining: number;
  stackResult: string[];
  storageRoot: string;
  logs: VMLog[];
  traceHash: string;
  executedAt: string;
  steps: ExecutionTraceStep[];
}

export interface DeployedContract {
  address: string;
  name: string;
  deployerDid: string;
  code: string[];
  codeHash: string;
  storage: Record<string, string>;
  storageRoot: string;
  deployedAt: string;
}

export interface VMStats {
  totalExecutions: number;
  successfulExecutions: number;
  revertedExecutions: number;
  totalGasConsumed: number;
  deployedContractsCount: number;
  currentGlobalStateRoot: string;
}

/* ─── Helpers ────────────────────────────────────────────────────── */

function hmac(key: string, data: string): string {
  return '0x' + createHmac('sha256', key).update(data).digest('hex');
}

function computeStorageRoot(secret: string, storage: Record<string, string>): string {
  const sorted = Object.keys(storage)
    .sort()
    .map((k) => `${k}=${storage[k]}`)
    .join('&');
  return hmac(secret, `STORAGE_TRIE:${sorted}`);
}

/* ─── Engine ─────────────────────────────────────────────────────── */

export class OceanicosVirtualMachine {
  private readonly secret: string;
  private contracts: Map<string, DeployedContract> = new Map();
  private executionHistory: ExecutionTraceReceipt[] = [];
  private totalGasConsumed = 0;

  constructor(secret = 'ovm-omega-v-secret') {
    this.secret = secret;
  }

  /* ── 1. Contract Deployment ── */

  deployContract(opts: {
    deployerDid: string;
    name: string;
    code: string[];
    initialStorage?: Record<string, string>;
  }): DeployedContract {
    if (!opts.deployerDid.startsWith('did:')) {
      throw new Error('deployerDid must be a valid DID');
    }
    if (!Array.isArray(opts.code) || opts.code.length === 0) {
      throw new Error('Contract code cannot be empty');
    }

    const address =
      '0x' +
      hmac(
        this.secret,
        `DEPLOY:${opts.deployerDid}:${opts.name}:${opts.code.join(',')}:${Date.now()}`
      ).slice(2, 42);
    const codeHash = hmac(this.secret, opts.code.join(';'));
    const storage = { ...(opts.initialStorage ?? {}) };
    const storageRoot = computeStorageRoot(this.secret, storage);
    const now = new Date().toISOString();

    const contract: DeployedContract = {
      address,
      name: opts.name,
      deployerDid: opts.deployerDid,
      code: [...opts.code],
      codeHash,
      storage,
      storageRoot,
      deployedAt: now,
    };

    this.contracts.set(address, contract);
    return { ...contract };
  }

  getContracts(): DeployedContract[] {
    return Array.from(this.contracts.values());
  }

  getContract(address: string): DeployedContract | undefined {
    return this.contracts.get(address);
  }

  /* ── 2. Bytecode Execution ── */

  execute(opts: {
    callerDid: string;
    code: string[];
    gasLimit?: number;
    initialStorage?: Record<string, string>;
    contractAddress?: string;
  }): ExecutionTraceReceipt {
    const executionId = `exec-${randomUUID().slice(0, 10)}`;
    const gasLimit = opts.gasLimit ?? 100000;
    let gasRemaining = gasLimit;
    const stack: string[] = [];
    const storage: Record<string, string> = { ...(opts.initialStorage ?? {}) };
    const logs: VMLog[] = [];
    const steps: ExecutionTraceStep[] = [];
    let success = true;
    let returnValue: string | undefined;

    let pc = 0;
    const code = opts.code;

    while (pc < code.length && gasRemaining > 0) {
      const rawInstruction = code[pc].trim();
      const parts = rawInstruction.split(/\s+/);
      const op = parts[0].toUpperCase() as Opcode;
      const arg = parts[1];

      let opCost = 3; // base cost
      if (op === 'SSTORE') opCost = 100;
      else if (op === 'SLOAD') opCost = 20;
      else if (op === 'LOG') opCost = 25;
      else if (op === 'MUL' || op === 'DIV' || op === 'MOD') opCost = 5;

      if (gasRemaining < opCost) {
        success = false;
        returnValue = 'OUT_OF_GAS';
        break;
      }
      gasRemaining -= opCost;

      // Record step snapshot
      steps.push({
        step: steps.length + 1,
        pc,
        op: rawInstruction,
        gasRemaining,
        gasCost: opCost,
        stackSnapshot: [...stack],
      });

      // Execute Opcode
      switch (op) {
        case 'PUSH': {
          if (!arg) throw new Error(`PUSH requires an argument at PC ${pc}`);
          stack.push(arg);
          break;
        }
        case 'POP': {
          if (stack.length === 0) throw new Error(`Stack underflow at PC ${pc}`);
          stack.pop();
          break;
        }
        case 'DUP': {
          if (stack.length === 0) throw new Error(`Stack underflow at PC ${pc}`);
          stack.push(stack[stack.length - 1]);
          break;
        }
        case 'SWAP': {
          if (stack.length < 2) throw new Error(`Stack underflow at PC ${pc}`);
          const a = stack.pop()!;
          const b = stack.pop()!;
          stack.push(a);
          stack.push(b);
          break;
        }
        case 'ADD': {
          if (stack.length < 2) throw new Error(`Stack underflow at PC ${pc}`);
          const b = Number(stack.pop()!);
          const a = Number(stack.pop()!);
          stack.push(String(a + b));
          break;
        }
        case 'SUB': {
          if (stack.length < 2) throw new Error(`Stack underflow at PC ${pc}`);
          const b = Number(stack.pop()!);
          const a = Number(stack.pop()!);
          stack.push(String(a - b));
          break;
        }
        case 'MUL': {
          if (stack.length < 2) throw new Error(`Stack underflow at PC ${pc}`);
          const b = Number(stack.pop()!);
          const a = Number(stack.pop()!);
          stack.push(String(a * b));
          break;
        }
        case 'DIV': {
          if (stack.length < 2) throw new Error(`Stack underflow at PC ${pc}`);
          const b = Number(stack.pop()!);
          const a = Number(stack.pop()!);
          stack.push(b === 0 ? '0' : String(Math.floor(a / b)));
          break;
        }
        case 'EQ': {
          if (stack.length < 2) throw new Error(`Stack underflow at PC ${pc}`);
          const b = stack.pop()!;
          const a = stack.pop()!;
          stack.push(a === b ? '1' : '0');
          break;
        }
        case 'LT': {
          if (stack.length < 2) throw new Error(`Stack underflow at PC ${pc}`);
          const b = Number(stack.pop()!);
          const a = Number(stack.pop()!);
          stack.push(a < b ? '1' : '0');
          break;
        }
        case 'GT': {
          if (stack.length < 2) throw new Error(`Stack underflow at PC ${pc}`);
          const b = Number(stack.pop()!);
          const a = Number(stack.pop()!);
          stack.push(a > b ? '1' : '0');
          break;
        }
        case 'SLOAD': {
          if (stack.length < 1) throw new Error(`Stack underflow at PC ${pc}`);
          const key = stack.pop()!;
          const val = storage[key] ?? '0';
          stack.push(val);
          break;
        }
        case 'SSTORE': {
          if (stack.length < 2) throw new Error(`Stack underflow at PC ${pc}`);
          const val = stack.pop()!;
          const key = stack.pop()!;
          storage[key] = val;
          break;
        }
        case 'LOG': {
          if (stack.length < 2) throw new Error(`Stack underflow at PC ${pc}`);
          const data = stack.pop()!;
          const topic = stack.pop()!;
          logs.push({ index: logs.length + 1, topic, data });
          break;
        }
        case 'RETURN': {
          returnValue = stack.length > 0 ? stack[stack.length - 1] : '0x';
          pc = code.length; // terminate
          continue;
        }
        case 'REVERT': {
          success = false;
          returnValue = stack.length > 0 ? stack.pop()! : 'REVERTED';
          pc = code.length; // terminate
          continue;
        }
        case 'STOP': {
          pc = code.length; // terminate
          continue;
        }
        default:
          break;
      }

      pc++;
    }

    const gasUsed = gasLimit - gasRemaining;
    this.totalGasConsumed += gasUsed;
    const storageRoot = computeStorageRoot(this.secret, storage);
    const now = new Date().toISOString();

    // If executed against deployed contract, persist updated storage
    if (opts.contractAddress && this.contracts.has(opts.contractAddress)) {
      const contract = this.contracts.get(opts.contractAddress)!;
      contract.storage = storage;
      contract.storageRoot = storageRoot;
    }

    const traceHash = hmac(
      this.secret,
      `TRACE:${executionId}:${opts.callerDid}:${gasUsed}:${storageRoot}:${success}:${returnValue}:${now}`
    );

    const receipt: ExecutionTraceReceipt = {
      executionId,
      callerDid: opts.callerDid,
      contractAddress: opts.contractAddress,
      success,
      returnValue: returnValue ?? (stack.length > 0 ? stack[stack.length - 1] : undefined),
      gasUsed,
      gasRemaining,
      stackResult: [...stack],
      storageRoot,
      logs,
      traceHash,
      executedAt: now,
      steps,
    };

    this.executionHistory.push(receipt);
    return receipt;
  }

  /* ── 3. Call Deployed Contract ── */

  callContract(opts: {
    callerDid: string;
    contractAddress: string;
    gasLimit?: number;
  }): ExecutionTraceReceipt {
    const contract = this.contracts.get(opts.contractAddress);
    if (!contract) {
      throw new Error(`Contract ${opts.contractAddress} not found`);
    }

    return this.execute({
      callerDid: opts.callerDid,
      code: contract.code,
      gasLimit: opts.gasLimit,
      initialStorage: contract.storage,
      contractAddress: contract.address,
    });
  }

  /* ── 4. Query & Telemetry ── */

  getExecutionHistory(): ExecutionTraceReceipt[] {
    return [...this.executionHistory];
  }

  getStats(): VMStats {
    const total = this.executionHistory.length;
    const successful = this.executionHistory.filter((e) => e.success).length;
    const reverted = total - successful;

    const allStorage: Record<string, string> = {};
    for (const c of this.contracts.values()) {
      for (const [k, v] of Object.entries(c.storage)) {
        allStorage[`${c.address}:${k}`] = v;
      }
    }

    return {
      totalExecutions: total,
      successfulExecutions: successful,
      revertedExecutions: reverted,
      totalGasConsumed: this.totalGasConsumed,
      deployedContractsCount: this.contracts.size,
      currentGlobalStateRoot: computeStorageRoot(this.secret, allStorage),
    };
  }
}
