/**
 * Jest setup file for all tests
 * Runs before any test suite
 */

// Increase timeout for integration tests
jest.setTimeout(30000);

// Suppress console errors in tests (optional)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]): void => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Not implemented: HTMLFormElement.prototype.submit')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Tests must never rely on a committed default signing key.
// AttestationService throws without one; supply an explicit test-only key.
process.env.OMEGA_SIGNING_KEY = process.env.OMEGA_SIGNING_KEY ?? 'test-only-signing-key';
