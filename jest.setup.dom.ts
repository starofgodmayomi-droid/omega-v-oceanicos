/**
 * Setup for the `dom` jest project (React component tests under jsdom).
 *
 * Kept separate from jest.setup.ts because the server suites do not need
 * DOM matchers, and the DOM suites do not need a signing key.
 */
import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { webcrypto } from 'node:crypto';
import { TextDecoder as NodeTextDecoder, TextEncoder as NodeTextEncoder } from 'node:util';

jest.setTimeout(30000);

// React only routes updates through act() when this flag is set. Without it,
// user-event dispatches real DOM events whose handlers update state outside
// any act scope, and React warns on every one. Testing Library turns the
// flag off for the duration of its async helpers and restores it after —
// see the note on asyncWrapper below for why that matters.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Testing Library's async helpers are left alone.
 *
 * This block used to override `asyncWrapper` so that every `findBy*` and
 * `waitFor` ran inside `act()`. That inverts a deliberate decision in
 * `@testing-library/react`, whose own configuration disables the act
 * environment for exactly those helpers — its source says "We just want to
 * run `waitFor` without IS_REACT_ACT_ENVIRONMENT".
 *
 * Wrapping them in act() instead creates a circular wait: the helper opens
 * an act scope and waits for the DOM to change, the state update that would
 * change it is queued on the act queue, and that queue is flushed when the
 * act callback resolves — which cannot happen until the DOM changes. The
 * update sits one flush away for the entire budget.
 *
 * It only bites when the update lands inside the helper's scope rather than
 * during the interaction that started it, so it presented as an intermittent
 * hosted failure of the browser verification panel and was recorded as a
 * WebCrypto stall. It was not one. An instrumented run showed importKey and
 * verify settling 37ms after the click, the assertion then waiting its full
 * 30 seconds, and one bare `act(async () => {})` rendering the VALID result
 * immediately.
 *
 * `act-async-wrapper.test.tsx` forces that ordering deterministically and
 * fails if this override comes back.
 *
 * The original reason for the override — `ReactDOMTestUtils.act is
 * deprecated` warnings — no longer applies: Testing Library uses `React.act`
 * whenever it exists, and this workspace is on React 19.
 */
configure({
  /**
   * Lowered back to 2000ms, because the reason it was raised turned out to
   * be wrong.
   *
   * The first hypothesis was Ed25519 on the libuv threadpool under CI
   * contention. That comment recorded its own falsifier — a recurrence
   * after the change — and it recurred at five seconds, on run 350, on
   * verify (18.x) and on Windows. Five times the budget is not contention.
   *
   * The second was a paste that had not landed, making the click on a
   * still-disabled control a silent no-op. The tests now wait for the
   * control to be enabled, which makes that precondition explicit and is
   * worth keeping — but it was not the cause either.
   *
   * The cause was the act-wrapping asyncWrapper described above, and no
   * value of this number could have fixed it: the wait never ends, so a
   * larger budget only buys a longer wait. That is why raising it from 15s
   * to 30s in PR #185 changed nothing.
   *
   * 2000ms is kept because it is a reasonable budget for real Ed25519 work
   * and short enough that a genuine stall is reported quickly.
   */
  asyncUtilTimeout: 2000,
});

/**
 * Report what escapes the test, because the last flake left no trace of its
 * cause.
 *
 * CI has intermittently failed a trailing block of this file with the
 * container rendered as `<body><div /></body>` — nothing mounted, rather
 * than a shell missing one panel. The note on asyncUtilTimeout above asked
 * that the next step be capturing the DOM at failure instead of raising the
 * number again. The DOM was captured, and it is empty, which is the part no
 * existing output explains.
 *
 * What has been ruled out by measurement, so nobody repeats it:
 *   - not gradual slowness: every test here passes with asyncUtilTimeout
 *     lowered to 150ms, so a normal mount finishes an order of magnitude
 *     inside even the old budget. The failure is bimodal, not marginal.
 *   - not an unmocked route on mount: every path App fetches while mounting
 *     is in the harness defaults. `/api/scene/simulate` is not, but it is
 *     reached only from a user-triggered handler that already catches.
 *   - not an early return or error boundary: App has neither.
 *
 * An empty container implies the tree never committed or was torn down, and
 * an error thrown from an effect does exactly that while surfacing as a
 * rejection rather than a failed assertion. These handlers make that visible
 * the next time it happens instead of leaving another empty DOM to puzzle
 * over. They change no behaviour and silence nothing.
 */
const reportEscaped = (label: string) => (value: unknown) => {
  console.error(`${label}:`, value instanceof Error ? (value.stack ?? value.message) : value);
};
process.on('unhandledRejection', reportEscaped('dom test unhandled rejection'));
process.on('uncaughtException', reportEscaped('dom test uncaught exception'));

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

// jsdom's crypto surface varies across Node/jsdom versions: some releases
// expose a partial `crypto.subtle` object even though the async Ed25519
// implementation is not reliable for this suite. Install Node's real
// WebCrypto implementation unconditionally so Node 20, Node 22, and local
// runs exercise the same actual primitive. This is not a verification stub:
// signatures are checked for real, and a forged one still fails.
Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });

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
