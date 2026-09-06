/**
 * Verdict states in the languages their readers actually speak.
 *
 * The system's claim is that a person can check an assertion without
 * trusting whoever made it. A verdict rendered only in English fails that
 * for most of the people it is meant to protect: they see a coloured badge
 * and take its meaning on trust, which is the position this project exists
 * to remove them from.
 *
 * Naijá — Nigerian Pidgin, ISO 639-3 `pcm` — is a first-class locale here
 * rather than a courtesy translation. It is spoken by roughly a hundred
 * million people across West Africa, and a verification tool that cannot say
 * "dem no gree" to them is not a verification tool for them.
 *
 * This is an interface layer and nothing else. Language is never a security
 * control: hiding meaning behind a tongue is obscurity, it fails the moment
 * one speaker stands on the other side, and it would make the system weaker
 * while appearing to make it stronger. Nothing here gates access, hides a
 * payload, or changes what a signature covers.
 */

/** The states an interface must be able to express. */
export const VERDICT_STATES = [
  'OBSERVED',
  'UNVERIFIED',
  'VERIFYING',
  'VERIFIED',
  'ATTESTED',
  'DISSENTING',
  'FAILED',
  'SUPERSEDED',
  'UNKNOWN',
] as const;

export type VerdictState = (typeof VERDICT_STATES)[number];

export type Locale = 'en' | 'pcm';

/**
 * Whether a state is good news, bad news, or neither.
 *
 * Carried per state and asserted identical across locales. A translation
 * that softens FAILED into something reassuring is the most damaging bug
 * this package could have, and it would be invisible to anyone who reads
 * only one of the two languages.
 */
export type Polarity = 'affirming' | 'negating' | 'pending' | 'unresolved';

export interface Term {
  label: string;
  meaning: string;
  polarity: Polarity;
}

export interface LocaleRecord {
  code: Locale;
  /** What speakers call the language themselves. */
  name: string;
  /**
   * Who checked this wording, or null.
   *
   * Same discipline as policy provenance. An unreviewed translation is not
   * evidence the words are right, and claiming otherwise about someone's
   * language would be worse than claiming it about a number.
   */
  reviewedBy: string | null;
  terms: Record<VerdictState, Term>;
}

const english: LocaleRecord = {
  code: 'en',
  name: 'English',
  reviewedBy: 'project maintainers',
  terms: {
    OBSERVED: {
      label: 'Observed',
      meaning: 'Someone recorded this. Nobody has checked it yet.',
      polarity: 'pending',
    },
    UNVERIFIED: {
      label: 'Unverified',
      meaning: 'No rule has been applied to this. Do not rely on it.',
      polarity: 'pending',
    },
    VERIFYING: {
      label: 'Verifying',
      meaning: 'Checks are running now. Wait for the result.',
      polarity: 'pending',
    },
    VERIFIED: {
      label: 'Verified',
      meaning: 'The rules ran and this passed them.',
      polarity: 'affirming',
    },
    ATTESTED: {
      label: 'Attested',
      meaning: 'Signed, so you can check it yourself without trusting us.',
      polarity: 'affirming',
    },
    DISSENTING: {
      label: 'Dissenting',
      meaning: 'The checkers disagreed. Nobody has decided who is right.',
      polarity: 'unresolved',
    },
    FAILED: {
      label: 'Failed',
      meaning: 'The rules ran and this did not pass. Do not act on it.',
      polarity: 'negating',
    },
    SUPERSEDED: {
      label: 'Superseded',
      meaning: 'Something newer replaced this. It was kept, not deleted.',
      polarity: 'unresolved',
    },
    UNKNOWN: {
      label: 'Unknown',
      meaning: 'There is not enough evidence to say either way.',
      polarity: 'unresolved',
    },
  },
};

const naija: LocaleRecord = {
  code: 'pcm',
  name: 'Naijá',
  // Written by a non-native speaker and not yet reviewed by one. See the
  // README: correcting this is the most valuable contribution available.
  reviewedBy: null,
  terms: {
    OBSERVED: {
      label: 'Dem don see am',
      meaning: 'Person record this one. Nobody never check am.',
      polarity: 'pending',
    },
    UNVERIFIED: {
      label: 'Dem never check am',
      meaning: 'No rule never run for this one. No lean on am.',
      polarity: 'pending',
    },
    VERIFYING: {
      label: 'Dem dey check am',
      meaning: 'Check dey run now now. Wait make e finish.',
      polarity: 'pending',
    },
    VERIFIED: {
      label: 'E don pass check',
      meaning: 'The rule dem run, and this one pass.',
      polarity: 'affirming',
    },
    ATTESTED: {
      label: 'Dem don sign am',
      meaning: 'Dem sign am, so you fit check am yourself. You no need trust us.',
      polarity: 'affirming',
    },
    DISSENTING: {
      label: 'Dem no gree',
      meaning: 'The people wey check am no gree among demsef. Nobody never decide.',
      polarity: 'unresolved',
    },
    FAILED: {
      label: 'E no pass',
      meaning: 'The rule dem run, and this one no pass. No do anything with am.',
      polarity: 'negating',
    },
    SUPERSEDED: {
      label: 'Another one don replace am',
      meaning: 'New one don take him place. Dem keep this one, dem no delete am.',
      polarity: 'unresolved',
    },
    UNKNOWN: {
      label: 'We no sabi',
      meaning: 'Evidence no reach to talk yes or no.',
      polarity: 'unresolved',
    },
  },
};

export const LOCALES: Record<Locale, LocaleRecord> = { en: english, pcm: naija };

export const DEFAULT_LOCALE: Locale = 'en';

export function isLocale(candidate: string): candidate is Locale {
  return candidate === 'en' || candidate === 'pcm';
}

/**
 * Resolve a verdict into one language.
 *
 * Falls back rather than throwing for an unknown code, because a missing
 * translation must never take a verdict off the screen. Showing English is
 * worse than showing Naijá; showing nothing is worse than both.
 */
export function say(state: VerdictState, locale: string = DEFAULT_LOCALE): Term {
  return (isLocale(locale) ? LOCALES[locale] : LOCALES[DEFAULT_LOCALE]).terms[state];
}

/** Whether a locale's wording has been checked by a speaker. */
export function isReviewed(locale: Locale): boolean {
  return LOCALES[locale].reviewedBy !== null;
}

/** Every locale's rendering of one state, so either reader can check the other. */
export function sayAll(state: VerdictState): Record<Locale, Term> {
  return { en: english.terms[state], pcm: naija.terms[state] };
}
