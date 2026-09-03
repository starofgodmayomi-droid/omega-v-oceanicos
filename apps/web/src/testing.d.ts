/**
 * Registers @testing-library/jest-dom's custom matchers with TypeScript.
 *
 * The matchers are imported at runtime by jest.setup.dom.ts, but that file
 * sits outside the root tsconfig's `include` (packages/*&#47;src, apps/*&#47;src),
 * so the type augmentation never reached the component tests and every
 * `toBeInTheDocument()` failed type-check while passing at runtime. This
 * declaration lives under apps/web/src so tsc picks it up.
 */
/// <reference types="@testing-library/jest-dom" />

export {};
