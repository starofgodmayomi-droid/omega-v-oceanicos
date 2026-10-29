/**
 * KAI — the Mind of Ω∞v Oceanicos (see ECOSYSTEM_BODY.md).
 *
 * Memory and context come from the KAI continuity primitives implemented in
 * `@oceanicos/mini`; this package is the named entry point for them, not a
 * second implementation. KAI records and recalls. It does not authorize,
 * execute, or manufacture evidence.
 */
export { KaiContinuity, kaiFromBlock, kaiUnknown, KAI_VERSION } from '@oceanicos/mini';
export type { KaiDrop, KaiSource, KaiStatus } from '@oceanicos/mini';
export { screenIntent } from './shield.js';
export type { IntentScreening, IntentScreeningDecision, IntentScreeningInput } from './shield.js';
