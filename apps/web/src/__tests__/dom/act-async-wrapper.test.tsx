import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

/**
 * The DOM harness must not run Testing Library's async helpers inside act().
 *
 * `@testing-library/react` configures its own `asyncWrapper` to *disable*
 * the act environment for the duration of `waitFor` — its source says so:
 * "We just want to run `waitFor` without IS_REACT_ACT_ENVIRONMENT". Wrapping
 * those helpers in act() instead inverts that decision, and creates a
 * circular wait:
 *
 *   findBy* opens an act scope and awaits the DOM changing
 *     → the pending state update is queued on the act queue
 *       → the queue flushes when the act callback resolves
 *         → the callback resolves when the DOM changes
 *
 * Nothing breaks the cycle, so the helper waits out its whole budget while
 * the update sits one flush away from being rendered.
 *
 * This was live in `jest.setup.dom.ts` for months and was recorded as an
 * intermittent hosted "WebCrypto stall" — the browser verification panel
 * stuck on `Checking...` — because the deadlock only bites when the update
 * lands inside the findBy* scope rather than during the click that started
 * it, which is a matter of microseconds. An instrumented reproduction showed
 * the WebCrypto path completing in 37ms, the assertion then waiting the full
 * 30s, and a single bare `act(async () => {})` immediately rendering the
 * result it had been waiting for.
 *
 * The timing here is forced rather than left to chance: the update is
 * released after the wait has begun, which is the losing order every time.
 */
describe('async Testing Library helpers see updates that arrive while they wait', () => {
  function Panel(): React.JSX.Element {
    const [value, setValue] = useState<string | null>(null);
    let release: (v: string) => void = () => {};
    const [gate] = useState(
      () =>
        new Promise<string>((resolve) => {
          release = resolve;
        })
    );
    const [releaseFn] = useState(() => release);

    return (
      <>
        <button type="button" onClick={() => void gate.then(setValue)}>
          watch
        </button>
        <button type="button" onClick={() => releaseFn('arrived')}>
          release
        </button>
        {value === null ? null : <output role="status">{value}</output>}
      </>
    );
  }

  it('renders an update released after the wait has already started', async () => {
    const user = userEvent.setup();
    render(<Panel />);

    await user.click(screen.getByRole('button', { name: 'watch' }));

    // Started, deliberately not awaited: the wait must already be in
    // progress when the update is released.
    const pending = screen.findByRole('status', undefined, { timeout: 3000 });

    screen.getByRole('button', { name: 'release' }).click();

    await expect(pending).resolves.toHaveTextContent('arrived');
  });
});
