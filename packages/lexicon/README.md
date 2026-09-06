# @omega-v/lexicon

Verdict states in the languages their readers actually speak.

**An earned expansion (+ LEGIBILITY).** The system's claim is that a person
can check an assertion without trusting whoever made it. A verdict rendered
only in English fails that for most of the people it protects: they see a
coloured badge and take its meaning on trust, which is the position this
project exists to remove them from.

## Naijá is a first-class locale

Nigerian Pidgin — `pcm` — is spoken by roughly a hundred million people across
West Africa. A verification tool that cannot say **dem no gree** to them is not
a verification tool for them.

| State        | English                               | Naijá                                      |
| ------------ | ------------------------------------- | ------------------------------------------ |
| `VERIFIED`   | The rules ran and this passed them.   | The rule dem run, and this one pass.       |
| `ATTESTED`   | Signed, so you can check it yourself. | Dem sign am, so you fit check am yourself. |
| `DISSENTING` | The checkers disagreed.               | Dem no gree.                               |
| `FAILED`     | This did not pass. Do not act on it.  | E no pass. No do anything with am.         |
| `UNKNOWN`    | Not enough evidence either way.       | Evidence no reach to talk yes or no.       |

## Language is not a security control

This is an interface layer and nothing else. Hiding meaning behind a tongue is
obscurity, not security: it fails the moment one speaker stands on the other
side, and it would make the system weaker while appearing to make it stronger.
Nothing here gates access, hides a payload, or changes what a signature covers.

## What it refuses to do

**It will not let a translation soften a verdict.** Every state carries a
polarity and a test asserts it is identical across locales. A `FAILED` reading
reassuring in one language and alarming in the other would be invisible to
anyone who reads only one of them — precisely the reader this exists for.

**It will not collapse dissent into failure.** Different states, different
polarities, in both languages, because the dissensus engine spends real effort
keeping them apart.

**It will not let an attestation read as proof of correctness.** A signature
proves origin and integrity. Wording implying the verification was right would
be the conflation this system prevents, printed where people actually read.

**It will not hide a verdict when a translation is missing.** An unknown locale
falls back to English rather than throwing. Showing English is worse than
showing Naijá; showing nothing is worse than both.

## Review provenance

`isReviewed('pcm')` returns **false**.

The Naijá wording here was written by a non-native speaker and has not been
reviewed by one. That is recorded as a gap rather than presented as finished
work — the same discipline applied to the dissensus threshold that was chosen
rather than measured. Claiming an unreviewed translation is correct would be an
unbacked assertion, and making it about someone's language is worse than making
it about a number.

**If you speak Naijá, correcting this wording is among the most valuable
contributions you can make here.** Open a pull request against
`packages/lexicon/src/index.ts` and set `reviewedBy` to your name.

## Usage

```typescript
import { say, sayAll, isReviewed } from '@omega-v/lexicon';

say('DISSENTING', 'pcm').label; // 'Dem no gree'
sayAll('ATTESTED'); // both, so either reader can check the other
isReviewed('pcm'); // false — not yet checked by a speaker
```
