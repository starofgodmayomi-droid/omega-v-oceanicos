---
name: omega-max-equation-compression
description: Governs the evidence-weighted Max Equation optimization loop: Δ* = argmax_{Δ∈F} [ V_hat(Δ) * Q_E(Δ) / (R_hat(Δ) + C_hat(Δ) + ε) ] under Ω∞v = VERIFY(Δ(Intent, Reality)). Proactively selects, bounds, gates, and executes the highest-value finite slice across Notion, GitHub, and runtime surfaces without bypassing safety, policy, or human authority.
---

# 🌊 Ω Max Equation Compression & Optimization Skill

> **Universal Verification Contract**:
> $$\boxed{ \Omega_{\infty v} = \operatorname{VERIFY} \bigl( \Delta(\text{Intent},\text{Reality}) \bigr) }$$
>
> **Optimal Finite Transition**:
> $$\boxed{ \Delta^* = \underset{\Delta\in\mathcal{F}}{\arg\max}\; \left( \frac{\text{Verified Value}(\Delta)}{\text{Risk}(\Delta)+\text{Cost}(\Delta)+\varepsilon} \right) }$$
>
> **Pre-Verification Evidence-Weighted Priority Score**:
> $$\boxed{ \text{PriorityScore}(\Delta) = \frac{\widehat V(\Delta)\cdot Q_E(\Delta)}{\widehat R(\Delta)+\widehat C(\Delta)+\varepsilon} }$$

---

## 1. Purpose

Make every Notion, repository, or runtime upgrade the smallest complete, authorized change that yields the greatest evidence-supported value without bypassing safety, policy, or human authority.

- **Proactive Mood**: Continuously evaluate live candidates, identify the highest-value finite delta ($\Delta^*$), verify its boundary, and execute cleanly.
- **Radical Honest Verification**: Before a change is executed, its value is an estimate ($\widehat V$). Value is recorded as **VERIFIED** only after empirical observation satisfies explicit acceptance criteria.

---

## 2. Hard Eligibility Gate (Feasible Set $\mathcal{F}$)

A candidate transition $\Delta$ enters the feasible set $\mathcal{F}$ if and only if:
1. **Attributable Authority**: Approved by the sovereign human root (`did:omega:human:starofgodmayomi` / `ELION VAREL`) or authorized delegate.
2. **Policy Compliant**: Satisfies constitutional invariants and data safety charter.
3. **Bounded & Scoped**: Finite scope, explicit rollback/stop condition, non-destructive default.
4. **Observable Acceptance Criteria**: Defined before execution begins ($\neg\text{Evidence} \implies \text{NO CLAIM}$).

**The Score Never Overrides Hard Gates**:
- Missing authority $\implies$ `NOT_EXECUTED` / `DENY`.
- Missing evidence or observation $\implies$ `UNKNOWN` / `REVIEW`.
- Discrepancy $\implies$ `DIVERGENT` / `REVIEW`.
- Complete authorized proof $\implies$ `VERIFIED` / `ALLOW`.

---

## 3. Priority Scoring Dimensions

1. **Value Estimate ($\widehat V \ge 0$)**: Expected benefit to user, system health, or ecosystem capability.
2. **Evidence Quality ($0.0 \le Q_E \le 1.0$)**: Directness, freshness, reproducibility, and traceability of supporting evidence.
3. **Risk Estimate ($\widehat R \ge 0$)**: Regression exposure, privacy/security surface, reversibility, and blast radius.
4. **Cost Estimate ($\widehat C \ge 0$)**: Implementation complexity, review burden, cognitive load, and compute/service cost.
5. **Epsilon ($\varepsilon = 10^{-6}$)**: Prevents zero-division; does not make unsafe work acceptable.

**Tie-Breaking Hierarchy**:
1. Greater safety/data-integrity risk reduction (lower $\widehat R$).
2. Closure of a material evidence gap (higher $Q_E$).
3. Stronger dependency leverage (higher $\widehat V$).
4. Lower ongoing maintenance and delivery cost (lower $\widehat C$).

---

## 4. The 8-Phase Execution Loop

```text
OBSERVE   → Ingest canonical Notion context, GitHub commit, and runtime health.
DISTINGUISH → Separate known facts, estimates, hypotheses, and missing proof.
GATE      → Filter candidates against hard eligibility gates into F.
RANK      → Compute PriorityScore(Δ) across all eligible candidates in F.
SELECT    → Select Δ* = argmax PriorityScore(Δ).
BUILD     → Implement the smallest complete change; run all verification gates.
OBSERVE   → Inspect live runtime/external consequences on all three surfaces.
RECONCILE → Compare expected vs observed; record VERIFIED, DIVERGENT, or UNKNOWN.
```

---

## 5. Tri-Surface Operational Commands

### 1. Terminal / CLI Surface
```bash
# 1. Run Max Equation Slice Optimizer
node bin/oceanicos.mjs optimize

# 2. Inspect Full Max Equation Status & Lineage
node bin/oceanicos.mjs max-equation

# 3. Verify Entire Sovereign Test Baseline (364+ proofs)
pnpm test:all
```

### 2. API Control Plane Surface
```bash
# Evaluate candidate slices via REST API
curl -X POST http://localhost:5000/v1/verification/optimize-slice \
  -H "Content-Type: application/json" \
  -d '{"candidates":[{"id":"c1","intent":"Test slice","valueEstimate":50,"evidenceQuality":0.9,"riskEstimate":5,"costEstimate":5,"authority":true,"policy":true,"scoped":true,"acceptanceCriteria":["tests pass"]}]}'

# Healthcheck & Verification Contract
curl http://localhost:5000/health
curl http://localhost:5000/v1/verification/contract
```

### 3. Web Dashboard Surface
- Navigate to `http://localhost:3000`.
- Inspect the **Max Equation Optimization Card** and verify live contract status.
