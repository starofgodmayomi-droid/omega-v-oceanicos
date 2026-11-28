# AVRØ HOUSE — Brand House Charter

**Status:** Proposed brand-house layer; review before merge.  
**Parent identity:** AVRØ HOUSE  
**Platform identity:** OCEANICOS  
**Verification identity:** Ω∞v

## Purpose

AVRØ HOUSE is the parent creative and engineering studio identity for the projects in this repository. It governs the shared story, naming hierarchy, visual consistency, and standards of expression across technology, products, services, and future ventures.

This charter extends the existing `docs/BRAND.md`; it does not replace it, rewrite runtime identity, or change the OCEANICOS product contract.

## Brand architecture

```text
AVRØ HOUSE — parent studio / brand house
├── OCEANICOS — verified intelligence platform
│   ├── OMEGA OS — operating environment
│   └── Ω∞v — verification and evidence engine
└── AVRØ HOUSE ventures — future products and expressions
    ├── Fashion & Lifestyle — retail, apparel, accessories, culture
    └── Future ventures — introduced only with a defined purpose and owner
```

A venture is not a product feature. A product feature is not a separate brand. New sub-brands require an explicit name, audience, offer, owner, and reason to exist.

## Brand promise

**One root. One current. Infinite forms.**

The house creates coherent identities and useful experiences across different domains while keeping each product's actual capabilities, limits, and evidence visible.

## Brand principles

1. **Reality before performance:** say what exists; distinguish shipped, tested, proposed, and imagined work.
2. **One house, distinct expressions:** share the parent identity without forcing every venture into the same product category.
3. **Human authority:** brand language never implies permission or autonomous control.
4. **Useful elegance:** visual polish supports clarity, accessibility, and recognition.
5. **Consistency with room to evolve:** new surfaces use the tokens and naming rules of their own product layer.

## Visual direction

The technology-facing identity remains governed by `docs/BRAND.md` and the existing web design tokens. This brand-house extension uses the following restrained expression for house-level collateral:

- Ocean Black `#071312` — foundation and contrast.
- Electric Green `#00FF66` — signal, energy, and accent.
- White `#FFFFFF` — clarity and legibility.
- Optional neutral grey `#A7B0AD` — secondary information only.

Do not repurpose semantic verdict colors as decoration. Product interfaces must use canonical CSS tokens rather than hard-coded palette values.

## Mark and logo rules

- Use the house wordmark `AVRØ HOUSE` for formal identity; preserve the Ø character.
- The star is the sole optional emblem accent in this starter system.
- Do not add a crown, orbital ring, universe cycle, or decorative crest to the starter mark.
- Keep clear space around the mark; never stretch, skew, or add unapproved effects.
- Use the horizontal lockup for headers and footers; use the compact emblem for avatars and favicons only where the brand name is otherwise visible.
- SVG assets in `docs/brand-house/assets/` are editable vector starting points, not trademark clearance or proof of uniqueness.

## Voice

Confident, clear, modern, warm, precise. Be expressive in storytelling and exact in product claims. Avoid inflated claims such as limitless intelligence, guaranteed outcomes, or capabilities not demonstrated by the repository.

## Surface guidance

| Surface | Identity | Rule |
|---|---|---|
| Repository and studio | AVRØ HOUSE × OCEANICOS | House first, platform clear |
| Product UI | OCEANICOS | Use product tokens and accessibility standards |
| Verification and technical evidence | Ω∞v | Describe exact evidence and scope |
| Fashion & lifestyle venture | AVRØ HOUSE / Fashion & Lifestyle | Distinct retail expression under the parent house |
| Social profiles | AVRØ HOUSE | Keep avatar simple; use wordmark in bio/header |

## Governance

Before publishing a new venture identity, record its audience, positioning, offer, visual assets, approved channels, owner, and review date. Before changing existing repository brand assets, inspect references and downstream usage. Prefer additive changes and a reviewable pull request.

## Non-goals

This charter does not claim that a storefront, social account, legal entity, trademark, deployment, or commercial operation has been created. Those require separate implementation and verification.

## Canonical references

- [`docs/BRAND.md`](../BRAND.md) — canonical AVRØ HOUSE × OCEANICOS brand system.
- [`docs/brand-house/assets/`](assets/) — starter SVG lockups.
- [`apps/web/src/tokens.css`](../../apps/web/src/tokens.css) — existing product design tokens.
