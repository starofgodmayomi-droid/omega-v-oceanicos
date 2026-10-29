/*
 * KAI / ELION / OMEGA — the Invisible Online Computer loop.
 *
 * The actors live in the packages that declare them:
 *   @oceanicos/kai    KAI observes (Shield) + bounded authority
 *   @oceanicos/elion  ELION executes
 *   @oceanicos/omega  OMEGA verifies, failing closed
 *
 * This barrel keeps the API's own import paths stable.
 */
export * from '@oceanicos/kai';
export * from '@oceanicos/elion';
export * from '@oceanicos/omega';
