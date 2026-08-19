/**
 * Setup for the `dom` jest project (React component tests under jsdom).
 *
 * Kept separate from jest.setup.ts because the server suites do not need
 * DOM matchers, and the DOM suites do not need a signing key.
 */
import '@testing-library/jest-dom';
import { act, configure } from '@testing-library/react';
import { webcrypto } from 'node:crypto';
import { TextDecoder as NodeTextDecoder, TextEncoder as NodeTextEncoder } from 'node:util';

jest.setTimeout(30000);

// React 18 only routes updates through act() when this flag is set. Without
// it, user-event dispatches real DOM events whose handlers update state
// outside any act scope, and React warns on every one.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Every async Testing Library helper runs inside act().
 *
 * The component's handlers await fetch, so a state update lands on a
 * microtask after the triggering interaction's own act scope has closed.
 *
 * Known rough edge, left visible rather than muted: this plus the flag above
 * clears the `ReactDOMTestUtils.act is deprecated` warnings, but React still
 * reports "update not wrapped in act" for state changes made by handlers
 * that user-event dispatches as real DOM events. The assertions are correct
 * and the suite is green; the warnings are a true signal that those updates
 * are not batched, so they stay in the output instead of being filtered into
 * silence.
 */
configure({
  asyncWrapper: async (callback) => {
    let result: unknown;
    await act(async () => {
      result = await callback();
    });
    return result;
  },

  /**
   * Lowered back to 2000ms, because the reason it was raised turned out to
   * be wrong.
   *
   * The first hypothesis was Ed25519 on the libuv threadpool under CI
   * contention. That comment recorded its own falsifier — a recurrence
   * after the change — and it recurred at five seconds, on run 350, on
   * verify (18.x) and on Windows. Five times the budget is not contention.
   *
   * The likelier cause was never timing. The panel's verify control is
   * disabled until both fields hold text, so a paste that had not yet
   * landed made the click a silent no-op: no handler ran, no result
   * rendered, and the failure surfaced as findByRole('status') timing out
   * rather than as the paste failing. The tests now wait for the control to
   * be enabled before clicking, which makes the precondition explicit.
   *
   * 2000ms leaves headroom for real Ed25519 work without concealing a
   * second silent no-op for five seconds. If the flake returns after this,
   * both explanations are wrong and the next step is capturing the DOM at
   * failure rather than adjusting this number again.
   */
  asyncUtilTimeout: 2000,
});

// jsdom implements neither of these, and App.tsx uses both: EventSource for
// the lifecycle stream, scrollIntoView when focusing a result. Absent stubs
// surface as unrelated crashes inside render, so they are provided here
// rather than worked around in each test.
class MockEventSource {
  static instances: MockEventSource[] = [];
  public listeners = new Map<string, Array<(event: MessageEvent) => void>>();
  public readyState = 0;
  public closed = false;

  // The component assigns these as properties rather than registering
  // listeners, so a mock supporting only addEventListener would silently
  // deliver nothing and every stream assertion would time out.
  public onopen: (() => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: (() => void) | null = null;

  constructor(public url: string) {
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, handler: (event: MessageEvent) => void): void {
    const existing = this.listeners.get(type) ?? [];
    existing.push(handler);
    this.listeners.set(type, existing);
  }

  removeEventListener(type: string, handler: (event: MessageEvent) => void): void {
    const existing = this.listeners.get(type) ?? [];
    this.listeners.set(
      type,
      existing.filter((candidate) => candidate !== handler)
    );
  }

  close(): void {
    this.closed = true;
    this.readyState = 2;
  }

  /** Deliver a server-sent event to whatever the component registered. */
  emit(type: string, data: unknown): void {
    const event = new MessageEvent(type, {
      data: typeof data === 'string' ? data : JSON.stringify(data),
    });
    if (type === 'message') this.onmessage?.(event);
    for (const handler of this.listeners.get(type) ?? []) {
      handler(event);
    }
  }

  open(): void {
    this.readyState = 1;
    this.onopen?.();
  }

  error(): void {
    this.onerror?.();
  }

  static reset(): void {
    MockEventSource.instances = [];
  }
}

(globalThis as unknown as { EventSource: unknown }).EventSource = MockEventSource;
(globalThis as unknown as { MockEventSource: unknown }).MockEventSource = MockEventSource;

// jsdom implements neither WebCrypto nor the TextEncoder/TextDecoder pair,
// so the offline verification panel correctly reported that it could not
// verify. Real browsers implement all three, so the absence is an artefact
// of the test environment, not of the product. Node's implementations are
// installed here so the DOM suite exercises the same path a browser would.
//
// Note what this does NOT do: it does not stub verification. Signatures are
// checked for real, and a forged one still fails.
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
}

if (typeof globalThis.TextEncoder === 'undefined') {
  Object.assign(globalThis, { TextEncoder: NodeTextEncoder, TextDecoder: NodeTextDecoder });
}

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView(): void {
    /* jsdom has no layout; nothing to do */
  };
}

beforeEach(() => {
  MockEventSource.reset();
});
