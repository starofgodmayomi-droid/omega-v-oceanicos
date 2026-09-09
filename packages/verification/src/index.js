/**
 * Confidence in a verification, derived from the rules that actually ran.
 *
 * The lowest rule confidence wins. A verification is only as strong as its
 * weakest applied rule, and averaging would let a confident rule carry a
 * doubtful one — the direction that overstates trust.
 *
 * No rules ran means nothing was checked, which is `0`. That is not the same
 * as `passed`, which is decided separately: a result can carry `passed: true`
 * with zero confidence, and that combination is informative rather than
 * contradictory.
 *
 * What this replaces matters more than the formula. The summary used to copy
 * `observation.confidence` — a number the submitter puts in the request body.
 * That value reached the attestation and sat inside the signed payload, so the
 * system issued unforgeable signatures over a confidence figure no rule had
 * produced. `ATTEST ≠ ASSERT` is the repository's stated principle; on this
 * field it was `ATTEST ≡ ASSERT`.
 */
function deriveConfidence(ruleResults) {
    if (ruleResults.length === 0)
        return 0;
    return Math.min(...ruleResults.map((result) => result.confidence));
}
/**
 * The rules this engine can execute, by name.
 *
 * Registering a rule does not make it executable — a `VerificationRule` is a
 * declaration, and its `definition` string is not yet a language this engine
 * interprets. This table is the honest boundary between the two, and
 * {@link VerificationEngine.getExecutableRuleNames} publishes it so callers
 * can tell a rule that will be checked from one that will only be recorded.
 */
const RULE_IMPLEMENTATIONS = {
    'response-time-threshold': {
        requires: ['responseTime'],
        evaluate: (rule, observation, stepStart) => {
            const responseTime = observation.metadata.responseTime;
            const threshold = 100;
            const passed = responseTime < threshold;
            return {
                passed,
                confidence: passed ? 0.95 : 0.7,
                evidencePath: [
                    {
                        step: stepStart,
                        rule: rule.name,
                        condition: `responseTime < ${threshold}`,
                        value: responseTime,
                        expected: threshold,
                        passed,
                        reasoning: passed
                            ? `Response time ${responseTime}ms is below ${threshold}ms threshold`
                            : `Response time ${responseTime}ms exceeds ${threshold}ms threshold`,
                        severity: passed ? undefined : 'warning',
                        evaluated: true,
                    },
                ],
            };
        },
    },
    'status-code-check': {
        requires: ['statusCode'],
        evaluate: (rule, observation, stepStart) => {
            const statusCode = observation.metadata.statusCode;
            const expected = 200;
            const passed = statusCode === expected;
            return {
                passed,
                confidence: passed ? 0.98 : 0.1,
                evidencePath: [
                    {
                        step: stepStart,
                        rule: rule.name,
                        condition: `statusCode === ${expected}`,
                        value: statusCode,
                        expected,
                        passed,
                        reasoning: passed
                            ? `Status code is ${statusCode} (expected)`
                            : `Status code is ${statusCode} (expected ${expected})`,
                        severity: passed ? undefined : 'critical',
                        evaluated: true,
                    },
                ],
            };
        },
    },
};
/**
 * VerificationEngine: Applies rules to observations and produces evidence
 *
 * Step 2 of the verification loop
 */
export class VerificationEngine {
    /**
     * Create a new verification engine
     */
    constructor(cacheTtl = 60000) {
        this.cacheTtl = cacheTtl;
        this.ruleRegistry = new Map();
        this.resultCache = new Map();
    }
    /**
     * Register a verification rule
     */
    registerRule(rule) {
        const key = `${rule.name}:${rule.version}`;
        this.ruleRegistry.set(key, rule);
    }
    /**
     * Get applicable rules for an observation
     */
    getApplicableRules(observation) {
        const applicable = [];
        for (const rule of this.ruleRegistry.values()) {
            if (rule.active && rule.appliesTo.includes(observation.claim.category)) {
                applicable.push(rule);
            }
        }
        return applicable;
    }
    /**
     * Verify an observation against registered rules
     */
    verify(observation) {
        // Check cache first
        const cached = this.getFromCache(observation.id);
        if (cached) {
            return cached;
        }
        // Get applicable rules
        const rules = this.getApplicableRules(observation);
        // Execute each rule
        const evidencePath = [];
        const ruleResults = [];
        const ruleVersions = {};
        let stepNumber = 1;
        let allPassed = true;
        for (const rule of rules) {
            const result = this.executeRule(rule, observation, stepNumber);
            ruleResults.push({
                name: rule.name,
                passed: result.passed,
                confidence: result.confidence,
                details: result.details,
            });
            evidencePath.push(...result.evidencePath);
            ruleVersions[rule.name] = rule.version;
            if (!result.passed) {
                allPassed = false;
            }
            stepNumber += result.evidencePath.length;
        }
        // Create verification result
        const verificationResult = {
            id: this.generateVerificationId(),
            observationId: observation.id,
            timestamp: new Date().toISOString(),
            summary: {
                passed: allPassed,
                confidence: deriveConfidence(ruleResults),
                claimedConfidence: observation.confidence,
                rulesApplied: rules.length,
                rulesPassed: ruleResults.filter((r) => r.passed).length,
                rulesFailed: ruleResults.filter((r) => !r.passed).length,
            },
            rules: ruleResults,
            evidencePath,
            ruleVersions,
            status: 'completed',
        };
        // Cache result
        this.setInCache(observation.id, verificationResult);
        return verificationResult;
    }
    /**
     * Execute a single rule and return evidence.
     *
     * A rule this engine has no implementation for does not pass. Neither does
     * a rule whose input is missing from the observation. Both are recorded as
     * failures naming what could not be checked.
     *
     * The alternative — the behaviour this replaces — was to return passed:true
     * for any unrecognised rule, and to read a missing numeric field as 0. Both
     * turn absent evidence into favourable evidence, and that verdict does not
     * stay local: it reaches summary.passed, then a signed attestation with
     * verified:true, then action authorisation. A signature over a claim nobody
     * checked is an assertion wearing a proof's clothes, which is the one thing
     * this system exists to not do.
     */
    executeRule(rule, observation, stepStart) {
        const implementation = RULE_IMPLEMENTATIONS[rule.name];
        if (!implementation) {
            return {
                passed: false,
                confidence: 0,
                details: `No implementation registered for rule "${rule.name}"`,
                evidencePath: [
                    {
                        step: stepStart,
                        rule: rule.name,
                        condition: 'rule-not-executable',
                        value: null,
                        passed: false,
                        reasoning: `This engine has no implementation for "${rule.name}", so the rule was ` +
                            `not evaluated. An unevaluated rule is recorded as a failure rather ` +
                            `than assumed to pass.`,
                        severity: 'critical',
                        evaluated: false,
                    },
                ],
            };
        }
        const missing = implementation.requires.filter((field) => observation.metadata[field] === undefined || observation.metadata[field] === null);
        if (missing.length > 0) {
            return {
                passed: false,
                confidence: 0,
                details: `Observation is missing ${missing.join(', ')}`,
                evidencePath: [
                    {
                        step: stepStart,
                        rule: rule.name,
                        condition: `requires ${implementation.requires.join(', ')}`,
                        value: null,
                        expected: implementation.requires,
                        passed: false,
                        reasoning: `Observation does not carry ${missing.join(', ')}, so "${rule.name}" ` +
                            `could not be evaluated. Absent input is recorded as a failure rather ` +
                            `than read as a passing value.`,
                        severity: 'critical',
                        evaluated: false,
                    },
                ],
            };
        }
        return implementation.evaluate(rule, observation, stepStart);
    }
    /**
     * Generate a unique verification ID
     */
    generateVerificationId() {
        return `ver-${new Date().toISOString().split('T')[0]}-${Math.random()
            .toString(36)
            .substring(7)}`;
    }
    /**
     * Get a cached verification result
     */
    getFromCache(observationId) {
        const cached = this.resultCache.get(observationId);
        if (!cached) {
            return null;
        }
        if (Date.now() - cached.time > this.cacheTtl) {
            this.resultCache.delete(observationId);
            return null;
        }
        return cached.result;
    }
    /**
     * Store a verification result in cache
     */
    setInCache(observationId, result) {
        this.resultCache.set(observationId, {
            result,
            time: Date.now(),
        });
    }
    /**
     * Clear the cache
     */
    clearCache() {
        this.resultCache.clear();
    }
    /**
     * List every registered rule, regardless of category or active state.
     *
     * getApplicableRules answers "which rules apply to this observation";
     * this answers "what is registered". Conflating the two is how /rules
     * came to report zero: it queried applicability with an empty category
     * that no rule could ever match.
     */
    getRules() {
        return Array.from(this.ruleRegistry.values());
    }
    /**
     * Get the number of registered rules
     */
    getRuleCount() {
        return this.ruleRegistry.size;
    }
    /**
     * The rule names this engine can actually execute.
     *
     * Registration accepts any rule; execution is implemented for these. A
     * registered rule outside this set is not silently tolerated — it fails
     * verification — so publishing the list lets a caller find out before
     * submitting an observation rather than from a failed verdict afterwards.
     */
    getExecutableRuleNames() {
        return Object.keys(RULE_IMPLEMENTATIONS);
    }
    /**
     * Whether {@link verify} can evaluate this rule, as opposed to merely
     * holding it in the registry.
     */
    canExecute(ruleName) {
        return ruleName in RULE_IMPLEMENTATIONS;
    }
}
export default VerificationEngine;
//# sourceMappingURL=index.js.map