/**
 * Which tone a status cell in the metrics row may claim.
 *
 * The row is the thing an operator glances at, so a colour there is a
 * claim: green reads as "checked, and fine". Three cells were making that
 * claim without the evidence.
 *
 *   VERIFICATION      was `className="green"` unconditionally, so a FAILED
 *                     verification rendered in the same green as a passed
 *                     one.
 *   EVENT LOG         was green unless the source was exactly `partial`,
 *                     so an absent health response — which renders the text
 *                     UNKNOWN — was coloured as verified-good.
 *   ROTATION RECOVERY was green unless the status was exactly `blocked`,
 *                     and with health absent it rendered as an empty green
 *                     cell: a positive signal with no content at all.
 *
 * All three are the same defect the verification engine was fixed for:
 * absence, or a negative result, presented as the favourable one. Fixing
 * the engine's verdict while the status row still paints unknown green
 * leaves the dashboard telling a reader something the system never
 * established.
 *
 * Neutral is the default here, deliberately. A cell earns green by being
 * known-good; anything else is at most uncoloured.
 */
export type StatusTone = 'green' | 'red' | '';

/**
 * PASSED is green, FAILED is red, and "nothing has run yet" is neither.
 *
 * READY is not a success. It means no verification has happened, and
 * colouring it green claims a result that does not exist.
 */
export function verificationTone(summary: { passed: boolean } | null | undefined): StatusTone {
  if (!summary) return '';
  return summary.passed ? 'green' : 'red';
}

/**
 * Green only when a health response actually arrived and the log is whole.
 *
 * Absent health is unknown, not healthy. The previous check asked only
 * whether the source was `partial`, and `undefined !== 'partial'` is true.
 */
export function eventLogTone(
  persistence: { eventLogSource: string } | null | undefined
): StatusTone {
  if (!persistence) return '';
  return persistence.eventLogSource === 'partial' ? 'red' : 'green';
}

/**
 * `blocked` is red, `recovered` is green, and anything else is neither.
 *
 * `none` means no rotation recovery has been attempted; the row is not
 * rendered for it. An unknown status must not inherit the green branch of
 * a two-way test, which is how an empty green cell reached the page.
 */
export function recoveryTone(
  recovery: { status: 'none' | 'recovered' | 'blocked' } | null | undefined
): StatusTone {
  if (!recovery) return '';
  if (recovery.status === 'blocked') return 'red';
  return recovery.status === 'recovered' ? 'green' : '';
}
