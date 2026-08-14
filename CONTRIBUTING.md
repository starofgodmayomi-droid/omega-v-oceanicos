# Contributing to Ω∞v Oceanicos

Thank you for joining this verification-first community. This document explains how to contribute in a way that strengthens the whole ecosystem.

> **Before you contribute code, understand the charter.** Read [CHARTER.md](CHARTER.md) and [MANIFEST.md](MANIFEST.md) first.

---

## The Verification-First Contribution Cycle

### Step 1: Observation — Identify the Gap

**What you do:**

- Use Ω∞v and observe where verification could be better
- Ask: "What would need to be true for this to work?"
- Document your observation with evidence:
  - When did you observe this?
  - What system state were you in?
  - Can others reproduce this?

**What you create:**

- An issue with:
  - **Title**: Observable problem statement
  - **Current State**: What you see now (with evidence)
  - **Expected State**: What should happen (verifiable claim)
  - **Evidence**: Steps to reproduce, logs, screenshots
  - **Confidence**: How certain are you? (70%? 95%?)

### Step 2: Verification — Propose a Solution

**What you do:**

- Read related issues and existing code
- Design a solution that can be tested
- Create a proposal that includes:
  - What verification would prove this works?
  - What would disprove it?
  - How will you know when you're done?

**What you create:**

- A PR with:
  - **Clear description**: What problem does this solve?
  - **Test plan**: How will reviewers verify this works?
  - **Before/after**: Show the improvement in evidence
  - **Trade-offs**: What else changed? (performance? complexity?)

### Step 3: Attestation — Build Trust Through Review

**What happens:**

- Reviewers verify your work against the proposal
- CI/CD automation runs tests and checks
- Evidence accumulates that the solution works

**How to prepare:**

- Run tests locally first
- Document your verification steps
- Respond to reviewer feedback with evidence
- Update your code based on test results

### Step 4: Record — Merge and Document

**What you do:**

- Address final feedback
- Merge when all checks pass
- Your contribution is now part of the attestation trail

**What we do:**

- GitHub automatically creates an immutable record
- Changelog is updated with verifiable links
- Community learns from your contribution

### Step 5: Display — Share What You've Built

**What happens:**

- Your change appears in the next release
- Documentation is updated
- Users can verify your work in production

---

## Development Workflow

### Before You Start

1. **Create an issue** describing what you want to improve
   - Include evidence of the problem
   - Explain how you'll verify the solution
   - Get initial feedback

2. **Fork and branch**
   ```bash
   git checkout -b verify/your-feature
   ```
   Branch naming convention:
   - `observe/...` — New observation or investigation
   - `verify/...` — Solution implementation
   - `attest/...` — Documentation or tests
   - `fix/...` — Bug fix with reproduction steps

### While You Develop

3. **Write tests before or alongside code**
   - Tests are how you verify your solution works
   - Tests document expected behavior
   - Tests are immutable proof

4. **Document as you go**
   - Code comments explain the "why", not just the "what"
   - Add examples in docstrings
   - Update README if behavior changes

5. **Commit with evidence**
   ```bash
   git commit -m "Verify: Add feature X (#123)

   Evidence:
   - Test coverage: 95%
   - Performance: +2ms (acceptable)
   - Compatibility: Tested on Node 18+

   Related: Fixes #123
   "
   ```

### When You're Ready

6. **Run the full verification suite**

   ```bash
   pnpm verify
   # This runs: lint, type-check, test, build
   ```

7. **Create a PR** with:
   - Link to the issue
   - Summary of changes
   - Test evidence
   - Any breaking changes (clearly marked)

8. **Respond to review feedback**
   - Review is verification; treat it as learning
   - Provide evidence for design decisions
   - Update based on feedback

---

## Code Standards

### Verification Through Code Quality

Your code should:

- **Be testable**: Every function is independently verifiable
- **Be transparent**: Code is readable; logic is clear
- **Be documented**: Future maintainers can understand intent
- **Be versioned**: Breaking changes are marked explicitly
- **Be portable**: No hidden dependencies on system state

### Linting and Formatting

```bash
# Check code style
pnpm lint

# Fix style issues automatically
pnpm lint:fix

# Type-check TypeScript
pnpm type-check

# Full format check
pnpm format:check
pnpm format:fix
```

### Testing Requirements

- **Unit tests**: Every module has tests
- **Integration tests**: Components work together
- **Regression tests**: Bugs don't come back
- **Edge case tests**: Boundary conditions are handled

Minimum standard: **80% code coverage** for new code.

```bash
pnpm test
pnpm test:coverage
```

---

## Commit and Pull Request Standards

### Commit Messages

Follow this format:

```
<type>: <subject>

<body>

<footer>
```

**Types:**

- `observe:` — New observation or investigation
- `verify:` — Feature implementation with evidence
- `attest:` — Documentation, tests, type info
- `fix:` — Bug fix with reproduction and verification
- `refactor:` — Code restructuring with test proof
- `chore:` — Maintenance, dependency updates

**Subject:**

- Imperative mood ("add feature" not "added feature")
- Lowercase
- No period at end
- Max 50 characters

**Body:**

- Explain _why_ not _what_
- Include evidence (test results, benchmarks)
- Reference issue numbers: `Fixes #123`
- Max 72 characters per line

**Example:**

```
verify: add event observer for async tasks

The verification system needs to observe and verify asynchronous
task completion. This adds an EventObserver that:
- Captures task state transitions
- Records timing information
- Creates verifiable proof of completion

Evidence:
- Tests: 12 new integration tests, all passing
- Coverage: 87% for observer module
- Performance: <100ms overhead on task lifecycle

Fixes #45
```

### Pull Request Template

Your PR description should include:

```markdown
## What This Verifies

Fixes #[issue number]

[Clear statement of the problem]

## How I Verified It

- [ ] Tests pass locally
- [ ] New tests added
- [ ] Documentation updated
- [ ] No breaking changes (or breaking changes marked)

## Evidence

- Test results: [paste output or screenshot]
- Performance impact: [if applicable]
- Screenshots: [if applicable]

## Checklist

- [ ] I read CHARTER.md
- [ ] Tests are green
- [ ] Code follows linting standards
- [ ] Commits follow the message format
- [ ] I've verified this works
```

---

## Special Contribution Paths

### Documentation

Documentation is verification of knowledge.

- **README updates**: Keep examples current and tested
- **API docs**: Keep signatures in sync with code
- **Guides**: Include "how to verify this works" sections
- **Changelog**: Record what changed and why

```bash
# Test documentation examples
npm run docs:test

# Build documentation site
npm run docs:build
```

### Bug Reports

Report a bug:

1. **Create a minimal reproduction**

   ```bash
   git clone https://github.com/starofgodmayomi-droid/omega-v-oceanicos.git
   cd omega-v-oceanicos
   # [Steps to reproduce the bug]
   ```

2. **Include evidence**
   - System info (OS, Node version, etc.)
   - Error output
   - Code that triggers the bug
   - Expected vs. actual behavior

3. **Label it**
   - `bug` — Something is broken
   - `regression` — Used to work, now doesn't
   - `critical` — System doesn't work

### Feature Requests

Propose a feature:

1. **Start with an issue**
   - Explain the problem it solves
   - Show how you'd use it
   - How would you verify it works?

2. **Share your vision**
   - Sketch the API or behavior
   - Show examples
   - Discuss trade-offs

3. **Join the discussion**
   - Other contributors might have evidence to share
   - Together, you'll design something better

---

## Getting Help

### Questions

- **How do I use Ω∞v?** → See [docs/](docs/)
- **How do I set up development?** → See [DEVELOPMENT.md](docs/DEVELOPMENT.md)
- **How does feature X work?** → File an issue with `question` label
- **I'm stuck on my PR** → Comment on your PR; maintainers will help

### Discussion

- GitHub Discussions: For design questions and proposals
- Issues: For specific, reproducible problems
- PR comments: For feedback on in-flight work

---

## Review and Feedback Process

### What to Expect from Reviewers

Reviewers will:

- Check that the code solves the stated problem
- Verify test coverage and quality
- Ensure consistency with project standards
- Ask clarifying questions
- Suggest improvements based on evidence

Reviewers will **not**:

- Rewrite your code for you
- Block PRs on stylistic preferences
- Require changes without explanation

### How to Respond to Feedback

1. **Assume good intent** — Reviewers are verifying, not judging
2. **Ask for evidence** — "Why?" questions are welcome
3. **Provide evidence for your choices** — Explain trade-offs
4. **Update based on feedback** — Make changes and push
5. **Re-request review** — Let reviewers know you've responded

### Disagreement? Use Verification

If you disagree with feedback:

1. State your disagreement clearly
2. Provide evidence for your position
3. Ask: "How could we verify which approach is better?"
4. Defer to maintainers if still stuck
5. Record the decision (even if you didn't win)

---

## Becoming a Maintainer

Maintainers are trusted to:

- Review and merge PRs
- Release new versions
- Manage issues and discussions
- Uphold the verification ethic

**Path to maintainership:**

1. Contribute consistently with high-quality work
2. Show understanding of the charter and principles
3. Demonstrate good judgment in reviews
4. Be nominated by an existing maintainer
5. Accepted by community consensus

---

## Code of Conduct

This community follows a simple principle:

> **Treat all contributors as co-observers seeking truth together.**

That means:

- ✓ Disagree strongly on evidence
- ✓ Demand rigor and verification
- ✓ Help others learn and improve
- ✓ Celebrate when someone finds a bug or suggests improvement
- ✗ Dismiss ideas without evidence
- ✗ Attack the person, not the problem
- ✗ Use authority to shut down discussion
- ✗ Ignore evidence that contradicts your view

**Violations** of this code will result in:

1. A recorded conversation (transparent)
2. An opportunity to understand the impact
3. A chance to repair (if the community agrees)
4. Removal from the project (if needed)

All of this is verifiable and recorded.

---

## Questions?

- **Not sure where to start?** Read [CHARTER.md](CHARTER.md)
- **Ready to code?** Pick an issue labeled `good first issue`
- **Want to discuss design?** Open a discussion in GitHub
- **Found a problem with these guidelines?** File an issue!

Welcome to Ω∞v Oceanicos. We verify together.

---

**Last Updated:** 2026-08-07  
**Status:** Living document — will evolve with community feedback
