# Ω∞v Brand

**One root. One current. Infinite forms.**

## The mark

`apps/web/public/omega-mark.svg`

A drop, a current, and a check — in that order and in that nesting, because
the order is the argument.

- **The drop** is the root. Everything the system produces is a form water
  takes; no form is the source.
- **The current** runs unbroken beneath it. The loop has no terminal state,
  so the line has no end cap that reads as a stop.
- **The check sits inside the drop**, not beside it. Verification is not a
  badge applied to a finished thing. It is the condition of the thing
  existing at all.

Do not add a wordmark inside the drop, do not outline it, and do not place
the check outside it. The last one inverts the meaning.

## Palette

Defined in `apps/web/src/tokens.css`.

| Token                    | Value     | Use                         |
| ------------------------ | --------- | --------------------------- |
| `--omega-abyss`          | `#071312` | page background             |
| `--omega-abyss-raised`   | `#0b1d1a` | panels                      |
| `--omega-abyss-edge`     | `#1b3b35` | borders, dividers           |
| `--omega-current`        | `#8ce8c8` | primary signal, the mark    |
| `--omega-current-bright` | `#69e7b9` | active state                |
| `--omega-current-dim`    | `#609187` | secondary text              |
| `--omega-foam`           | `#ebfaf4` | primary text                |
| `--omega-foam-muted`     | `#c8e9df` | supporting text             |
| `--omega-verified`       | `#69e7b9` | a verdict, never decoration |
| `--omega-dissent`        | `#ed9986` | a verdict, never decoration |
| `--omega-unknown`        | `#547b74` | a verdict, never decoration |

**The three verdict colours are reserved.** Green is not "nice", warm is not
"warning" and grey is not "disabled". They mean verified, dissenting and
unknown, and using them for anything else makes the interface lie in the one
register it must not.

## Honest state of the palette

`App.css` currently contains **109 distinct colours across 146 uses and no
variables** — the same abyssal green retyped at slightly different values.
The tokens above are the canonical set, not a description of what is already
there.

New work should use the tokens. The literals are debt. This document names
the debt rather than implying it does not exist, and the number above is
checked by a test so it cannot quietly grow while the document claims
otherwise.

## Voice

The system says what it can prove and names what it cannot. That governs
copy as much as code: no interface string should assert a state the runtime
has not established. `VERIFYING`, `UNKNOWN` and `DISSENTING` are legitimate
things to display. A confident green with nothing behind it is not.

Where a claim carries a limit, the limit travels with it. The verification
panel prints what a valid signature does **not** prove directly beneath the
word VALID, and that is the pattern, not an exception.
