# @omega-v/verification

Verification rule engine for Ω∞v Oceanicos.

**Step 2 of the verification loop**: Apply rules to observations and produce evidence.

## Installation

```bash
npm install @omega-v/verification
```

## Usage

```typescript
import { VerificationEngine } from '@omega-v/verification';

const engine = new VerificationEngine();

// Register rules
engine.registerRule({
  name: 'response-time-threshold',
  version: '1.0.5',
  appliesTo: ['health-check'],
  definition: 'responseTime < 100',
  description: 'Verify response time is below 100ms',
  createdAt: new Date().toISOString(),
  active: true,
});

// Verify an observation
const result = engine.verify(observation);

console.log(result.summary.passed); // true/false
console.log(result.evidencePath); // Step-by-step reasoning
console.log(result.ruleVersions); // Which rule versions were used
```

## Features

### Rule Registration

Register custom verification rules:

```typescript
engine.registerRule({
  name: 'rule-name',
  version: '1.0.0',
  appliesTo: ['category1', 'category2'],
  definition: 'condition expression',
  description: 'Human-readable description',
  createdAt: new Date().toISOString(),
  active: true,
});
```

### Rule Matching

Automatically applies only relevant rules:

```typescript
const observation = {
  claim: { category: 'health-check' },
  /* ... */
};

const applicableRules = engine.getApplicableRules(observation);
// Only returns rules with appliesTo: ['health-check']
```

### Evidence Paths

Every verification produces a detailed evidence trail:

```typescript
{
  step: 1,
  rule: 'response-time-threshold',
  condition: 'responseTime < 100',
  value: 45,
  expected: 100,
  passed: true,
  reasoning: 'Response time 45ms is below 100ms threshold'
}
```

### Caching

Results are cached by observation ID (default TTL: 60 seconds):

```typescript
const result1 = engine.verify(observation); // Executes
const result2 = engine.verify(observation); // Returns cached
```

## API

### Constructor

```typescript
new VerificationEngine(cacheTtl?: number)
```

- `cacheTtl` — Cache time-to-live in milliseconds (default: 60000)

### Methods

#### `registerRule(rule)`

Register a verification rule.

#### `getApplicableRules(observation)`

Get all active rules that apply to an observation's category.

**Returns:** `VerificationRule[]`

#### `verify(observation)`

Verify an observation against all applicable rules.

**Parameters:** `Observation`  
**Returns:** `VerificationResult`

**Result includes:**

- `summary` — Overall pass/fail and statistics
- `rules` — Results from each rule
- `evidencePath` — Step-by-step reasoning
- `ruleVersions` — Which rule versions were used

#### `clearCache()`

Clear all cached verification results.

#### `getRuleCount()`

Get the number of registered rules.

**Returns:** `number`

## Built-in Rules

The engine comes with example rules for demonstration:

- `response-time-threshold` (v1.0.5) — Check response time < 100ms
- `status-code-check` (v1.2.0) — Check HTTP status code == 200

## Implementing Custom Rules

In v0.1.0, rules are implemented as built-in examples. Future versions will support:

- Rule language (DSL) with compiler
- Bytecode execution
- User-defined rule functions

For now, extend the `executeRule()` method to add custom rules.

## Testing

```bash
npm test
```

---

**Package Status:** Stable (v0.1.0)  
**Part of:** Ω∞v Oceanicos verification loop  
**Next:** DSL compiler for custom rules  
**Last Updated:** 2026-08-07
