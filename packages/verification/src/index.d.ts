import { Observation, VerificationResult, VerificationRule } from '@omega-v/types';
/**
 * VerificationEngine: Applies rules to observations and produces evidence
 *
 * Step 2 of the verification loop
 */
export declare class VerificationEngine {
    private readonly cacheTtl;
    private ruleRegistry;
    private resultCache;
    /**
     * Create a new verification engine
     */
    constructor(cacheTtl?: number);
    /**
     * Register a verification rule
     */
    registerRule(rule: VerificationRule): void;
    /**
     * Get applicable rules for an observation
     */
    getApplicableRules(observation: Observation): VerificationRule[];
    /**
     * Verify an observation against registered rules
     */
    verify(observation: Observation): VerificationResult;
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
    private executeRule;
    /**
     * Generate a unique verification ID
     */
    private generateVerificationId;
    /**
     * Get a cached verification result
     */
    private getFromCache;
    /**
     * Store a verification result in cache
     */
    private setInCache;
    /**
     * Clear the cache
     */
    clearCache(): void;
    /**
     * List every registered rule, regardless of category or active state.
     *
     * getApplicableRules answers "which rules apply to this observation";
     * this answers "what is registered". Conflating the two is how /rules
     * came to report zero: it queried applicability with an empty category
     * that no rule could ever match.
     */
    getRules(): VerificationRule[];
    /**
     * Get the number of registered rules
     */
    getRuleCount(): number;
    /**
     * The rule names this engine can actually execute.
     *
     * Registration accepts any rule; execution is implemented for these. A
     * registered rule outside this set is not silently tolerated — it fails
     * verification — so publishing the list lets a caller find out before
     * submitting an observation rather than from a failed verdict afterwards.
     */
    getExecutableRuleNames(): string[];
    /**
     * Whether {@link verify} can evaluate this rule, as opposed to merely
     * holding it in the registry.
     */
    canExecute(ruleName: string): boolean;
}
export default VerificationEngine;
//# sourceMappingURL=index.d.ts.map