# @omega-v/verification

Verification rule engine for Ω∞v Oceanicos.

**Step 2 of the verification loop**: Apply rules to observations and produce evidence.

## What this engine can and cannot evaluate

A `VerificationRule` is a **declaration**. Its `definition` string is not a
language this engine interprets — execution is implemented per rule name, and
only these two are implemented today:

| rule                      | reads                   | passes when          |
| ------------------------- | ----------------------- | -------------------- |
| `response-time-threshold` | `metadata.responseTime` | `responseTime < 100` |
| `status-code-check`       | `metadata.statusCode`   | `statusCode === 200` |

`getExecutableRuleNames()` and `canExecute(name)` publish this boundary, and
the API's `GET /rules` marks each rule `executable` accordingly.

**Anything the engine cannot evaluate fails.** That includes a rule with no
implementation, and a rule whose input is absent from the observation. Both
produce an evidence step naming what could not be checked, with
`severity: 'critical'` and confidence `0`.

This is deliberate and it is the point of the package. A verification verdict
does not stay local: `summary.passed` becomes an attestation's `verified`
field, that attestation is cryptographically signed, and a signed attestation
authorizes actions through `POST /act`. An unevaluated rule reported as
passing would put an unforgeable signature on a claim nothing checked —
an assertion wearing a proof's clothes, which is the one thing this system
exists to prevent.

Earlier versions did exactly that: unrecognised rules returned
`passed: true` with the reasoning "Unknown rule; assuming pass", and a
missing numeric field was read as `0` — so an observation reporting no
timing data at all satisfied a latency threshold.

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

Registration accepts any rule. It does **not** make the rule executable — see
[what this engine can evaluate](#what-this-engine-can-and-cannot-evaluate).
A registered rule with no implementation will fail every observation it
applies to, so check `canExecute(name)` before relying on one:

```typescript
engine.registerRule(myRule);

if (!engine.canExecute(myRule.name)) {
  // This rule will fail verification, not silently pass.
  // Adding an implementation means editing RULE_IMPLEMENTATIONS.
}
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

#### `canExecute(ruleName)`

Whether `verify()` can evaluate this rule, as opposed to merely holding it in
the registry.

**Returns:** `boolean`

#### `getExecutableRuleNames()`

The rule names this engine has implementations for.

**Returns:** `string[]`

## Implementing Custom Rules

Rules are executed by name from the `RULE_IMPLEMENTATIONS` table in
`src/index.ts`. Adding one means adding an entry there:

```typescript
'my-rule': {
  requires: ['fieldTheRuleReads'],
  evaluate: (rule, observation, stepStart) => ({
    passed,
    confidence,
    evidencePath: [{ step: stepStart, rule: rule.name, /* ... */ }],
  }),
},
```

`requires` is checked before `evaluate` runs, so a missing field is reported
as "could not evaluate" rather than defaulting to a value that may happen to
pass.

Registering a rule without adding an implementation is safe but not useful:
it will fail every observation it applies to. That is the intended direction —
the engine refuses to vouch for what it did not check.

Not yet supported, and not claimed to be:

- a rule language (DSL) with a compiler
- bytecode execution (the `bytecode` field on `VerificationRule` is unused)
- user-supplied rule functions at runtime

## Testing

```bash
npm test
```

---

**Package Status:** Stable (v0.1.0)  
**Part of:** Ω∞v Oceanicos verification loop  
**Next:** DSL compiler for custom rules  
**Last Updated:** 2026-08-07
