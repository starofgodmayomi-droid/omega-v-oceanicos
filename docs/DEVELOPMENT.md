# Development Setup

Get Ω∞v Oceanicos running locally with the same runtime contract used by the verification pipeline.

---

## Runtime contract

Required:

- **Git** 2.30+
- **Node.js** 22.x or 24.x
- **pnpm** 10+
- **Docker** for container verification

The repository declares Node.js `>=22.0.0` and pnpm `>=10.0.0`. Keep local development aligned with CI; do not rely on older Node/npm combinations that are outside the current project contract.

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/starofgodmayomi-droid/omega-v-oceanicos.git
cd omega-v-oceanicos
```

### 2. Install Dependencies

```bash
pnpm install --frozen-lockfile
```

### 3. Run the bounded full-stack worker

Inspect the repository without performing external actions or Git writes:

```bash
pnpm worker
```

Run the worker's verification cycle:

```bash
pnpm worker:verify
```

Run bounded continuous verification. The cycle count can be controlled with `OMEGA_WORKER_CYCLES` (1–32) and the interval with `OMEGA_WORKER_INTERVAL_MS` (0–3,600,000 milliseconds; at most one hour):

```bash
pnpm worker:continuous
```

The worker contract is evidence-bound: it can inspect and verify, but it does not silently deploy, publish, mutate Git history, or perform external actions.

### 4. Run repository verification

```bash
pnpm verify
```

For the complete verification path:

```bash
pnpm verify:full
```

### 5. Start development

```bash
pnpm dev
```

Check the current package scripts and service ports before assuming a URL; documentation must not be treated as runtime proof.

## Verification ladder

```text
INSPECT
→ BUILD
→ TYPECHECK
→ TEST
→ PACKAGE
→ CLI
→ ATTEST
→ WINDOWS
→ DOCKER
→ SMOKE
→ OBSERVE
→ AUDIT
```

A command definition, README statement, or manifest is not proof that a step executed successfully. Report a step as verified only when the corresponding command or CI job has actually run successfully.

## Project structure

```text
omega-v-oceanicos/
├── apps/                    # User-facing applications
├── packages/                # Shared libraries and kernel surfaces
├── scripts/                 # Verification and bounded worker automation
├── docs/                    # Documentation and operating contracts
├── infra/                   # Infrastructure and deployment surfaces
├── tests/                   # Integration and end-to-end tests
├── package.json             # Root runtime/workspace contract
└── pnpm-lock.yaml           # Frozen dependency resolution
```

## Operating principles

```text
REALITY > SIMULATION
EVIDENCE > ASSERTION
VERIFICATION > CONFIDENCE
PROVENANCE > MEMORY ALONE
DISSENT → PRESERVE → COMPARE → VERIFY
HUMAN AGENCY = FINAL
```
