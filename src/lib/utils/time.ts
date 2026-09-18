/**
 * Request-time clock reads for Server Components.
 *
 * `Date.now()` called directly in a component body trips the
 * `react-hooks/purity` rule, which is right for a component that React may
 * re-render: an impure read makes the output unstable. An async Server
 * Component is different — it runs once per request on the server and reading
 * the clock is the intended behaviour, not a bug.
 *
 * Isolating the read here keeps the rule doing its job everywhere else, and
 * gives a single place to stub the clock if these surfaces ever need
 * deterministic tests.
 */

/** Milliseconds since the epoch, read at request time. */
export function requestNowMs(): number {
  return Date.now();
}

/** ISO timestamp, read at request time. */
export function requestNowIso(): string {
  return new Date().toISOString();
}
