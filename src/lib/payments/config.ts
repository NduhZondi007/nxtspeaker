/**
 * Server-only payment configuration.
 *
 * None of these names carry a `NEXT_PUBLIC_` prefix, which is what stops
 * Next.js inlining them into a client bundle. The `assertServer` guard turns
 * an accidental client import into a loud crash rather than a silent
 * `undefined` that would fail somewhere far less obvious.
 *
 * Nothing here is evaluated at module scope on purpose: `getBaseUrl()` in
 * src/lib/env.ts is called at module scope in the root layout, and a missing
 * value there once broke every Preview build (docs/ERRORS.md). These are
 * functions so an unset key fails the one request that needs it, not the build.
 */

function assertServer(): void {
  if (typeof window !== "undefined") {
    throw new Error("Payment configuration must never be imported into a client component");
  }
}

function required(name: string): string {
  assertServer();
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Payments cannot run without it — add it to .env.local and to Vercel's Production environment.`
    );
  }
  return value;
}

/** Yoco secret key (`sk_test_…` / `sk_live_…`). Server only. */
export function getYocoSecretKey(): string {
  return required("YOCO_SECRET_KEY");
}

/** Yoco webhook signing secret (`whsec_…`). Server only. */
export function getYocoWebhookSecret(): string {
  return required("YOCO_WEBHOOK_SECRET");
}

/**
 * Replay window for webhook timestamps, in seconds.
 *
 * Yoco recommends 3 minutes. It is configurable because the window trades
 * replay protection against rejecting a *legitimate* retry: Yoco retries a
 * failed delivery 8 times with escalating backoff, and if a retry carries the
 * original timestamp rather than a fresh one, a tight window would silently
 * discard a real payment confirmation.
 */
export function getWebhookToleranceSeconds(): number {
  const raw = process.env.YOCO_WEBHOOK_TOLERANCE_SECONDS;
  if (!raw) return 180;

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 180;
}
