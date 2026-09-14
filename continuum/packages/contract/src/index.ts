import * as crypto from 'crypto';

export type FieldType = 'string' | 'number' | 'boolean' | 'object' | 'array';

export interface FieldConstraint {
  type: FieldType;
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  enum?: (string | number)[];
  description?: string;
}

export type InvariantKind = 'PRECONDITION' | 'POSTCONDITION' | 'INVARIANT';

export interface BehavioralInvariant {
  name: string;
  kind: InvariantKind;
  description: string;
  expression: string; // e.g. "responseTime < 100", "statusCode == 200", "confidence >= 0.8"
}

export interface FormalContract {
  id: string;
  name: string;
  version: string;
  category: string;
  description: string;
  fields: Record<string, FieldConstraint>;
  invariants: BehavioralInvariant[];
  active: boolean;
  createdAt: string;
}

export interface ContractViolation {
  field?: string;
  invariant?: string;
  message: string;
  severity: 'ERROR' | 'WARNING';
  actualValue?: unknown;
}

export interface ContractVerificationResult {
  contractId: string;
  contractName: string;
  version: string;
  valid: boolean;
  violations: ContractViolation[];
  fieldsEvaluated: number;
  invariantsEvaluated: number;
  checkedAt: string;
}

export interface CompatibilityCheckResult {
  compatible: boolean;
  breakingChanges: string[];
}

/**
 * FormalContractEngine: Strict schema, behavioral invariants (pre/post-conditions),
 * and interface contract validation across the Ω∞v Oceanicos ecosystem.
 *
 * ```
 * 💧 Ω∞v ::= Producer ⇄ CONTRACT ⇄ Consumer ⇄ PROVENANCE
 * ```
 */
export class FormalContractEngine {
  private contracts: Map<string, FormalContract> = new Map();

  constructor() {
    this.registerDefaultContracts();
  }

  /**
   * Register default canonical contracts
   */
  private registerDefaultContracts(): void {
    this.registerContract({
      name: 'canonical-observation-contract',
      version: '1.0.0',
      category: 'observation',
      description: 'Formal contract for all incoming epistemic observations',
      fields: {
        claim: {
          type: 'string',
          required: true,
          min: 3,
          description: 'Verifiable claim statement',
        },
        category: { type: 'string', required: true, description: 'Domain category' },
        observedBy: { type: 'string', required: true, description: 'Observer identifier' },
        confidence: {
          type: 'number',
          required: false,
          min: 0,
          max: 1,
          description: 'Initial confidence score',
        },
      },
      invariants: [
        {
          name: 'claim-not-empty',
          kind: 'PRECONDITION',
          description: 'Claim must contain non-whitespace characters',
          expression: 'claim.length > 0',
        },
        {
          name: 'valid-confidence-range',
          kind: 'INVARIANT',
          description: 'Confidence if provided must be between 0 and 1',
          expression: 'confidence >= 0 && confidence <= 1',
        },
      ],
      active: true,
    });

    this.registerContract({
      name: 'health-sla-contract',
      version: '1.0.0',
      category: 'health-check',
      description: 'Formal SLA contract for system health checks',
      fields: {
        responseTime: {
          type: 'number',
          required: true,
          min: 0,
          max: 5000,
          description: 'Latency in milliseconds',
        },
        statusCode: {
          type: 'number',
          required: true,
          enum: [200, 201, 204],
          description: 'HTTP status code',
        },
      },
      invariants: [
        {
          name: 'low-latency-sla',
          kind: 'INVARIANT',
          description: 'Response time must be within acceptable SLA (< 200ms)',
          expression: 'responseTime < 200',
        },
        {
          name: 'success-status',
          kind: 'POSTCONDITION',
          description: 'Status code must indicate success',
          expression: 'statusCode == 200',
        },
      ],
      active: true,
    });
  }

  /**
   * Register a new formal contract
   */
  public registerContract(
    contract: Omit<FormalContract, 'id' | 'createdAt'> & { id?: string }
  ): FormalContract {
    const id = contract.id || `contract-${crypto.randomBytes(6).toString('hex')}`;
    const fullContract: FormalContract = {
      ...contract,
      id,
      createdAt: new Date().toISOString(),
    };

    this.contracts.set(fullContract.id, fullContract);
    this.contracts.set(fullContract.name, fullContract); // index by name too
    return fullContract;
  }

  /**
   * Get contract by ID or Name
   */
  public getContract(idOrName: string): FormalContract | null {
    return this.contracts.get(idOrName) || null;
  }

  /**
   * List all unique registered contracts
   */
  public getContracts(): FormalContract[] {
    const uniqueMap = new Map<string, FormalContract>();
    for (const contract of this.contracts.values()) {
      uniqueMap.set(contract.id, contract);
    }
    return Array.from(uniqueMap.values());
  }

  /**
   * Verify data against a contract schema and invariants
   */
  public verify(
    data: Record<string, unknown>,
    contractIdOrName: string,
    context: Record<string, unknown> = {}
  ): ContractVerificationResult {
    const contract = this.getContract(contractIdOrName);
    if (!contract) {
      throw new Error(`Formal contract not found: ${contractIdOrName}`);
    }

    const violations: ContractViolation[] = [];
    let fieldsEvaluated = 0;
    let invariantsEvaluated = 0;

    // 1. Schema Validation
    for (const [fieldName, constraint] of Object.entries(contract.fields)) {
      fieldsEvaluated++;
      const value = data[fieldName];

      // Required check
      if (value === undefined || value === null) {
        if (constraint.required) {
          violations.push({
            field: fieldName,
            message: `Field '${fieldName}' is required by contract ${contract.name}`,
            severity: 'ERROR',
            actualValue: value,
          });
        }
        continue;
      }

      // Type check
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== constraint.type) {
        violations.push({
          field: fieldName,
          message: `Field '${fieldName}' expected type ${constraint.type}, received ${actualType}`,
          severity: 'ERROR',
          actualValue: value,
        });
        continue;
      }

      // Number range check
      if (constraint.type === 'number' && typeof value === 'number') {
        if (constraint.min !== undefined && value < constraint.min) {
          violations.push({
            field: fieldName,
            message: `Field '${fieldName}' value ${value} is below minimum ${constraint.min}`,
            severity: 'ERROR',
            actualValue: value,
          });
        }
        if (constraint.max !== undefined && value > constraint.max) {
          violations.push({
            field: fieldName,
            message: `Field '${fieldName}' value ${value} exceeds maximum ${constraint.max}`,
            severity: 'ERROR',
            actualValue: value,
          });
        }
      }

      // String length and pattern check
      if (constraint.type === 'string' && typeof value === 'string') {
        if (constraint.min !== undefined && value.length < constraint.min) {
          violations.push({
            field: fieldName,
            message: `Field '${fieldName}' length ${value.length} is below minimum length ${constraint.min}`,
            severity: 'ERROR',
            actualValue: value,
          });
        }
        if (constraint.max !== undefined && value.length > constraint.max) {
          violations.push({
            field: fieldName,
            message: `Field '${fieldName}' length ${value.length} exceeds maximum length ${constraint.max}`,
            severity: 'ERROR',
            actualValue: value,
          });
        }
        if (constraint.pattern) {
          const regex = new RegExp(constraint.pattern);
          if (!regex.test(value)) {
            violations.push({
              field: fieldName,
              message: `Field '${fieldName}' value does not match required pattern ${constraint.pattern}`,
              severity: 'ERROR',
              actualValue: value,
            });
          }
        }
      }

      // Enum check
      if (constraint.enum && !constraint.enum.includes(value as string | number)) {
        violations.push({
          field: fieldName,
          message: `Field '${fieldName}' value '${String(value)}' is not in allowed enum [${constraint.enum.join(', ')}]`,
          severity: 'ERROR',
          actualValue: value,
        });
      }
    }

    // 2. Behavioral Invariants Evaluation
    const combinedScope = { ...data, ...context };
    for (const invariant of contract.invariants) {
      invariantsEvaluated++;
      const passed = this.evaluateExpression(invariant.expression, combinedScope);
      if (!passed) {
        violations.push({
          invariant: invariant.name,
          message: `Behavioral invariant '${invariant.name}' [${invariant.kind}] failed: ${invariant.description} (${invariant.expression})`,
          severity: 'ERROR',
        });
      }
    }

    return {
      contractId: contract.id,
      contractName: contract.name,
      version: contract.version,
      valid: violations.length === 0,
      violations,
      fieldsEvaluated,
      invariantsEvaluated,
      checkedAt: new Date().toISOString(),
    };
  }

  /**
   * Check backward compatibility between two contract versions
   */
  public checkCompatibility(
    oldContract: FormalContract,
    newContract: FormalContract
  ): CompatibilityCheckResult {
    const breakingChanges: string[] = [];

    // Check removed fields
    for (const oldFieldName of Object.keys(oldContract.fields)) {
      if (!newContract.fields[oldFieldName]) {
        breakingChanges.push(`Field '${oldFieldName}' was removed in new version`);
      }
    }

    // Check newly required fields
    for (const [newFieldName, constraint] of Object.entries(newContract.fields)) {
      const oldConstraint = oldContract.fields[newFieldName];
      if (constraint.required && (!oldConstraint || !oldConstraint.required)) {
        breakingChanges.push(`Field '${newFieldName}' is now required`);
      }
      if (oldConstraint && oldConstraint.type !== constraint.type) {
        breakingChanges.push(
          `Field '${newFieldName}' changed type from ${oldConstraint.type} to ${constraint.type}`
        );
      }
    }

    return {
      compatible: breakingChanges.length === 0,
      breakingChanges,
    };
  }

  /**
   * Simple safe expression evaluator for invariants
   */
  private evaluateExpression(expr: string, scope: Record<string, unknown>): boolean {
    try {
      // Basic expression evaluation with simple comparison operators
      // Supports: ==, !=, <, <=, >, >=, &&, ||
      const keys = Object.keys(scope);
      const values = Object.values(scope);

      // Use Function constructor with isolated scope args
      const fn = new Function(...keys, `return Boolean(${expr});`);
      return Boolean(fn(...values));
    } catch {
      return false;
    }
  }
}

export default FormalContractEngine;
