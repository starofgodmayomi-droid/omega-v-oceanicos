import { eventLogTone, recoveryTone, verificationTone } from '../status-tone';

/**
 * A colour in the metrics row is a claim. These pin that it is only made
 * when the evidence for it arrived.
 */
describe('status tone', () => {
  describe('verification', () => {
    it('does not paint a failed verification as a passing one', () => {
      // The cell was `className="green"` unconditionally: PASSED, FAILED
      // and READY all rendered green.
      expect(verificationTone({ passed: false })).toBe('red');
      expect(verificationTone({ passed: true })).toBe('green');
    });

    it('treats "nothing has run yet" as neither', () => {
      // READY is not a success. Colouring it green claims a result that
      // does not exist.
      expect(verificationTone(null)).toBe('');
      expect(verificationTone(undefined)).toBe('');
    });
  });

  describe('event log', () => {
    it('does not paint an absent health response as a healthy log', () => {
      // The old test was `source === 'partial' ? 'red' : 'green'`, and
      // `undefined !== 'partial'`, so UNKNOWN rendered green.
      expect(eventLogTone(undefined)).toBe('');
      expect(eventLogTone(null)).toBe('');
    });

    it('still reports a whole log as good and a partial one as bad', () => {
      expect(eventLogTone({ eventLogSource: 'complete' })).toBe('green');
      expect(eventLogTone({ eventLogSource: 'partial' })).toBe('red');
    });
  });

  describe('rotation recovery', () => {
    it('does not paint an unknown recovery state green', () => {
      // With health absent this rendered an empty cell carrying the green
      // class — a positive signal with no content behind it.
      expect(recoveryTone(undefined)).toBe('');
      expect(recoveryTone(null)).toBe('');
    });

    it('reports blocked as bad and recovered as good', () => {
      expect(recoveryTone({ status: 'blocked' })).toBe('red');
      expect(recoveryTone({ status: 'recovered' })).toBe('green');
    });

    it('gives "none" no tone, since nothing was attempted', () => {
      expect(recoveryTone({ status: 'none' })).toBe('');
    });
  });

  it('never returns green for an absent input on any cell', () => {
    // The shared property. Every one of these bugs was a two-way ternary
    // whose else-branch was the favourable one, so absence fell into it.
    expect([verificationTone(undefined), eventLogTone(undefined), recoveryTone(undefined)]).toEqual(
      ['', '', '']
    );
  });
});
