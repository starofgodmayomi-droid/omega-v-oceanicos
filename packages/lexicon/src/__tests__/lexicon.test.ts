import {
  DEFAULT_LOCALE,
  LOCALES,
  VERDICT_STATES,
  isLocale,
  isReviewed,
  say,
  sayAll,
  type Locale,
  type VerdictState,
} from '../index';

const locales = Object.keys(LOCALES) as Locale[];

/**
 * The dangerous bug in a translation layer is not a missing word. It is a
 * word that means something milder than the original, because nobody who
 * reads only one of the languages can see it.
 */
describe('every locale can say every state', () => {
  it('covers the nine states an interface must express', () => {
    expect(VERDICT_STATES).toHaveLength(9);
    expect(VERDICT_STATES).toContain('DISSENTING');
    expect(VERDICT_STATES).toContain('SUPERSEDED');
  });

  it.each(locales)('%s has a term for every state', (locale) => {
    for (const state of VERDICT_STATES) {
      const term = LOCALES[locale].terms[state];
      expect(term.label.trim().length).toBeGreaterThan(0);
      expect(term.meaning.trim().length).toBeGreaterThan(0);
    }
  });

  it.each(locales)('%s omits none of the uncomfortable states', (locale) => {
    // FAILED and DISSENTING are what a translator is most tempted to skip.
    // A locale missing them can only report good news.
    for (const state of ['FAILED', 'DISSENTING', 'UNKNOWN'] as VerdictState[]) {
      expect(LOCALES[locale].terms[state]).toBeDefined();
    }
  });
});

describe('no translation softens a verdict', () => {
  it.each(VERDICT_STATES)('%s carries the same polarity in every locale', (state) => {
    const polarities = new Set(locales.map((locale) => LOCALES[locale].terms[state].polarity));

    // One state, one meaning. If Naijá called FAILED affirming while
    // English called it negating, a reader of either language would be told
    // something the other was not.
    expect(polarities.size).toBe(1);
  });

  it('keeps failure negating and dissent unresolved, in both', () => {
    for (const locale of locales) {
      expect(LOCALES[locale].terms.FAILED.polarity).toBe('negating');
      expect(LOCALES[locale].terms.DISSENTING.polarity).toBe('unresolved');
      // Dissent is not failure. Collapsing them erases the distinction the
      // dissensus engine spends real effort preserving.
      expect(LOCALES[locale].terms.DISSENTING.polarity).not.toBe(
        LOCALES[locale].terms.FAILED.polarity
      );
    }
  });

  it('never lets an attestation read as proof of correctness', () => {
    // A signature proves origin and integrity. Wording implying the
    // verification was right would be the conflation this whole system
    // prevents, printed where people actually read.
    for (const locale of locales) {
      const attested = LOCALES[locale].terms.ATTESTED.meaning.toLowerCase();
      expect(attested).toMatch(/check|sign/);
      expect(attested).not.toMatch(/\bcorrect\b|\btrue\b|\bproof\b/);
    }
  });
});

describe('review provenance', () => {
  it('says which wording a speaker has checked and which has not', () => {
    expect(isReviewed('en')).toBe(true);
    // Written by a non-native speaker. Claiming otherwise would be the
    // unbacked assertion this project removes everywhere else, and doing it
    // about someone's language would be worse than doing it about a number.
    expect(isReviewed('pcm')).toBe(false);
    expect(LOCALES.pcm.reviewedBy).toBeNull();
  });

  it('names the language as its speakers name it', () => {
    expect(LOCALES.pcm.name).toBe('Naijá');
    expect(LOCALES.pcm.code).toBe('pcm');
  });
});

describe('resolution', () => {
  it('returns the asked-for language', () => {
    expect(say('FAILED', 'pcm').label).toBe('E no pass');
    expect(say('FAILED', 'en').label).toBe('Failed');
  });

  it('falls back rather than hiding a verdict', () => {
    // A missing translation must never take a verdict off the screen.
    expect(say('DISSENTING', 'fr')).toEqual(LOCALES[DEFAULT_LOCALE].terms.DISSENTING);
    expect(say('DISSENTING', '')).toBeDefined();
  });

  it('shows both languages at once so either reader can check the other', () => {
    const both = sayAll('DISSENTING');

    expect(both.en.label).toBe('Dissenting');
    expect(both.pcm.label).toBe('Dem no gree');
  });

  it('recognises exactly the locales it ships', () => {
    expect(isLocale('pcm')).toBe(true);
    expect(isLocale('en')).toBe(true);
    expect(isLocale('yo')).toBe(false);
  });
});
