import { FormalContractEngine } from '../index';

describe('@omega-v/contract — FormalContractEngine', () => {
  let engine: FormalContractEngine;

  beforeEach(() => {
    engine = new FormalContractEngine();
  });

  describe('Contract Registration & Retrieval', () => {
    it('should initialize with default contracts', () => {
      const contracts = engine.getContracts();
      expect(contracts.length).toBeGreaterThanOrEqual(2);
      expect(engine.getContract('canonical-observation-contract')).toBeDefined();
      expect(engine.getContract('health-sla-contract')).toBeDefined();
    });

    it('should register a custom contract and retrieve by id or name', () => {
      const custom = engine.registerContract({
        name: 'payment-sla-contract',
        version: '1.0.0',
        category: 'finance',
        description: 'Payment settlement contract',
        fields: {
          amount: { type: 'number', required: true, min: 1 },
          currency: { type: 'string', required: true, enum: ['USD', 'EUR', 'ETH'] },
          recipient: { type: 'string', required: true, min: 4 },
        },
        invariants: [
          {
            name: 'positive-settlement',
            kind: 'INVARIANT',
            description: 'Settlement amount must be positive',
            expression: 'amount > 0',
          },
        ],
        active: true,
      });

      expect(custom.id).toMatch(/^contract-/);
      expect(engine.getContract(custom.id)?.name).toBe('payment-sla-contract');
      expect(engine.getContract('payment-sla-contract')?.id).toBe(custom.id);
    });
  });

  describe('Contract Verification', () => {
    it('should verify valid data against canonical-observation-contract', () => {
      const result = engine.verify(
        {
          claim: 'API server responded in 42ms',
          category: 'health-check',
          observedBy: 'agent-observer-1',
          confidence: 0.95,
        },
        'canonical-observation-contract'
      );

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.fieldsEvaluated).toBe(4);
      expect(result.invariantsEvaluated).toBe(2);
    });

    it('should detect missing required fields', () => {
      const result = engine.verify(
        {
          category: 'health-check',
          observedBy: 'agent-observer-1',
        },
        'canonical-observation-contract'
      );

      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.field === 'claim')).toBe(true);
    });

    it('should detect type mismatch violations', () => {
      const result = engine.verify(
        {
          claim: 12345, // invalid type
          category: 'health-check',
          observedBy: 'agent-observer-1',
        },
        'canonical-observation-contract'
      );

      expect(result.valid).toBe(false);
      expect(
        result.violations.some(
          (v) => v.field === 'claim' && v.message.includes('expected type string')
        )
      ).toBe(true);
    });

    it('should detect number constraint violations', () => {
      const result = engine.verify(
        {
          responseTime: 6000, // exceeds max 5000
          statusCode: 200,
        },
        'health-sla-contract'
      );

      expect(result.valid).toBe(false);
      expect(
        result.violations.some(
          (v) => v.field === 'responseTime' && v.message.includes('exceeds maximum')
        )
      ).toBe(true);
    });

    it('should detect enum violations', () => {
      const result = engine.verify(
        {
          responseTime: 50,
          statusCode: 500, // not in [200, 201, 204]
        },
        'health-sla-contract'
      );

      expect(result.valid).toBe(false);
      expect(
        result.violations.some(
          (v) => v.field === 'statusCode' && v.message.includes('not in allowed enum')
        )
      ).toBe(true);
    });

    it('should evaluate behavioral invariants and flag failures', () => {
      const result = engine.verify(
        {
          responseTime: 350, // valid schema, but violates low-latency-sla invariant (< 200ms)
          statusCode: 200,
        },
        'health-sla-contract'
      );

      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.invariant === 'low-latency-sla')).toBe(true);
    });

    it('should throw error when verifying against nonexistent contract', () => {
      expect(() => engine.verify({}, 'nonexistent-contract')).toThrow('Formal contract not found');
    });
  });

  describe('Backward Compatibility Check', () => {
    it('should pass compatibility when adding optional fields', () => {
      const oldContract = engine.getContract('canonical-observation-contract')!;
      const newContract = {
        ...oldContract,
        version: '1.1.0',
        fields: {
          ...oldContract.fields,
          tags: { type: 'array' as const, required: false },
        },
      };

      const check = engine.checkCompatibility(oldContract, newContract);
      expect(check.compatible).toBe(true);
      expect(check.breakingChanges).toHaveLength(0);
    });

    it('should detect breaking changes when removing a field', () => {
      const oldContract = engine.getContract('canonical-observation-contract')!;
      const newContract = {
        ...oldContract,
        version: '2.0.0',
        fields: {
          claim: oldContract.fields.claim,
        },
      };

      const check = engine.checkCompatibility(oldContract, newContract);
      expect(check.compatible).toBe(false);
      expect(check.breakingChanges.length).toBeGreaterThanOrEqual(1);
    });

    it('should detect breaking changes when making an optional field required', () => {
      const oldContract = engine.getContract('canonical-observation-contract')!;
      const newContract = {
        ...oldContract,
        version: '2.0.0',
        fields: {
          ...oldContract.fields,
          confidence: { ...oldContract.fields.confidence, required: true },
        },
      };

      const check = engine.checkCompatibility(oldContract, newContract);
      expect(check.compatible).toBe(false);
      expect(check.breakingChanges.some((b) => b.includes('now required'))).toBe(true);
    });
  });
});
