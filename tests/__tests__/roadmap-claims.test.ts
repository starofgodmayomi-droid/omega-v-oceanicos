import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * A ticked roadmap box must have something behind it.
 *
 * The roadmap is the artifact that decides what counts as earned: "we do not
 * pretend later layers already exist just because they appear on the vision
 * diagram". Nothing enforced that. Phase 2 sat with two boxes unticked for
 * work that had shipped, which is the same failure pointing the other way —
 * once the checkboxes stop tracking reality in either direction, the growth
 * law is unfalsifiable.
 *
 * This pins each Phase 2 claim to an evidence anchor. A `[x]` whose anchor is
 * missing fails. A `[ ]` is ignored entirely, so the test never pressures
 * anyone into ticking a box to get green — unticking is always a safe move.
 *
 * WHAT THIS DOES NOT DO. It checks anchors, not meaning. "MINI is the
 * documented default mental model everywhere" is not mechanically decidable;
 * the anchor below checks that five named documents lead with the kernel,
 * which is evidence for the claim and not proof of it. A determined author can
 * still satisfy every anchor without satisfying the sentence. This narrows the
 * gap between claim and reality; it does not close it.
 *
 * Deliberately narrow in the manner of docs-claims.test.ts: Phase 2 only,
 * because Phase 2 is the kernel and the kernel is the part that must not drift.
 */
describe('roadmap Phase 2 claims have evidence', () => {
  const root = process.cwd();
  const roadmap = readFileSync(join(root, 'docs/ROADMAP.md'), 'utf8');

  const fileContains = (relativePath: string, needle: string) => (): boolean => {
    const absolute = join(root, relativePath);
    return existsSync(absolute) && readFileSync(absolute, 'utf8').includes(needle);
  };

  const allContain = (relativePaths: string[], pattern: RegExp) => (): boolean =>
    relativePaths.every((relativePath) => {
      const absolute = join(root, relativePath);
      return existsSync(absolute) && pattern.test(readFileSync(absolute, 'utf8'));
    });

  /** Documents that must lead with the kernel for "everywhere" to mean anything. */
  const KERNEL_DOCS = [
    'README.md',
    'docs/MINI.md',
    'packages/README.md',
    'apps/api/README.md',
    'apps/web/README.md',
  ];

  const KERNEL_PHRASE = /MINI kernel|Ω∞v MINI|Observe\s*(?:→|->)\s*Verify\s*(?:→|->)\s*Remember/i;

  const ANCHORS: Record<string, () => boolean> = {
    'Observe normalizes claims': fileContains(
      'packages/observer/src/index.ts',
      'export class Observer'
    ),
    'Verify produces evidence paths': fileContains(
      'packages/verification/src/index.ts',
      'export class VerificationEngine'
    ),
    'Remember stores append-only hash-chained memory': fileContains(
      'packages/remember/src/index.ts',
      'export class Remember'
    ),
    'MiniKernel runs one cycle without API/UI': fileContains(
      'packages/mini/src/__tests__/mini.test.ts',
      'MiniKernel'
    ),
    'MINI is the documented default mental model everywhere': allContain(
      KERNEL_DOCS,
      KERNEL_PHRASE
    ),
    'Integration tests treat MINI as the primary runtime unit': fileContains(
      'tests/integration/mini-kernel.integration.test.ts',
      "from '@omega-v/mini'"
    ),
  };

  /** The "Done when" checklist under the Phase 2 heading, and only that one. */
  const phase2 = roadmap.split('### Phase 2')[1]?.split('### Phase 3')[0] ?? '';
  const items = Array.from(phase2.matchAll(/^- \[( |x)\] (.+)$/gm)).map((match) => ({
    checked: match[1] === 'x',
    claim: match[2].trim(),
  }));

  it('finds the Phase 2 checklist', () => {
    // Guards against the parse silently matching nothing after an edit to the
    // roadmap's headings, which would make every assertion below vacuous.
    expect(items.length).toBeGreaterThan(0);
  });

  it('has an anchor defined for every Phase 2 item', () => {
    const unanchored = items.map((item) => item.claim).filter((claim) => !(claim in ANCHORS));

    // A new checklist row must arrive with a way to check it, or it is a
    // claim nothing can contradict.
    expect(unanchored).toEqual([]);
  });

  const checked = items.filter((item) => item.checked);

  it('has at least one checked item to verify', () => {
    expect(checked.length).toBeGreaterThan(0);
  });

  it.each(checked.map((item) => item.claim))('evidence exists for: %s', (claim) => {
    const anchor = ANCHORS[claim];
    expect(anchor).toBeDefined();
    expect(anchor()).toBe(true);
  });
});
