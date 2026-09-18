import { test, expect } from "@playwright/test";
import { createHmac } from "node:crypto";

/**
 * Escrow payment flow.
 *
 * Most of this runs with no external dependency. The one test that needs a
 * real Yoco checkout is gated behind YOCO_E2E, because the existing suite has
 * no external dependencies and CI must stay green without Yoco credentials.
 *
 * To run the full flow locally:
 *   1. Set YOCO_SECRET_KEY to a test key (sk_test_…) and YOCO_WEBHOOK_SECRET
 *      to the whsec_… secret Yoco returns when you register the endpoint.
 *   2. Expose the dev server with a tunnel (ngrok / cloudflared) so Yoco can
 *      reach /api/webhooks/yoco, and point the Yoco webhook at it.
 *   3. Run with YOCO_E2E=1 and PLAYWRIGHT_BASE_URL set to the tunnel URL.
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const WEBHOOK_PATH = "/api/webhooks/yoco";

test.describe("payment webhook — reachability and rejection", () => {
  // The middleware matcher excludes api/webhooks. If that exclusion regresses,
  // this request comes back as a redirect to /login instead of a 400, and the
  // provider silently stops being able to confirm payments.
  test("is not intercepted by the auth middleware", async ({ request }) => {
    const response = await request.post(`${BASE_URL}${WEBHOOK_PATH}`, {
      data: { type: "payment.succeeded" },
      headers: { "content-type": "application/json" },
      maxRedirects: 0,
    });

    expect(response.status()).not.toBe(302);
    expect(response.status()).not.toBe(307);
    expect(response.url()).not.toContain("/login");
  });

  test("rejects an unsigned request", async ({ request }) => {
    const response = await request.post(`${BASE_URL}${WEBHOOK_PATH}`, {
      data: { type: "payment.succeeded", payload: { amount: 100 } },
      headers: { "content-type": "application/json" },
    });

    expect(response.status()).toBe(400);
  });

  test("rejects a request with a forged signature", async ({ request }) => {
    const body = JSON.stringify({ type: "payment.succeeded", payload: { amount: 100 } });

    const response = await request.post(`${BASE_URL}${WEBHOOK_PATH}`, {
      data: body,
      headers: {
        "content-type": "application/json",
        "webhook-id": "msg_forged",
        "webhook-timestamp": String(Math.floor(Date.now() / 1000)),
        "webhook-signature": "v1,bm90LWEtcmVhbC1zaWduYXR1cmU=",
      },
    });

    expect(response.status()).toBe(400);
  });

  test("rejects a replayed timestamp even with an otherwise valid signature", async ({
    request,
  }) => {
    test.skip(!process.env.YOCO_WEBHOOK_SECRET, "needs YOCO_WEBHOOK_SECRET to sign");

    const secret = process.env.YOCO_WEBHOOK_SECRET as string;
    const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");

    const id = "msg_replay";
    // Well outside the 3-minute tolerance.
    const timestamp = String(Math.floor(Date.now() / 1000) - 3600);
    const body = JSON.stringify({ type: "payment.succeeded", payload: { amount: 100 } });
    const signature = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64");

    const response = await request.post(`${BASE_URL}${WEBHOOK_PATH}`, {
      data: body,
      headers: {
        "content-type": "application/json",
        "webhook-id": id,
        "webhook-timestamp": timestamp,
        "webhook-signature": `v1,${signature}`,
      },
    });

    expect(response.status()).toBe(400);
  });

  test("does not accept GET", async ({ request }) => {
    const response = await request.get(`${BASE_URL}${WEBHOOK_PATH}`);
    expect(response.status()).toBe(405);
  });
});

test.describe("payment flow", () => {
  test.skip(
    !process.env.YOCO_E2E,
    "Needs Yoco test credentials and a tunnel so the webhook can reach this server. See the header of this file."
  );

  test("a client can pay a confirmed booking and reach Yoco's checkout", async ({ page }) => {
    // Assumes a seeded CONFIRMED booking owned by the signed-in test client.
    const bookingId = process.env.YOCO_E2E_BOOKING_ID;
    test.skip(!bookingId, "Set YOCO_E2E_BOOKING_ID to a CONFIRMED booking");

    await page.goto(`${BASE_URL}/client/bookings/${bookingId}`);

    await expect(page.getByText("Secure your booking")).toBeVisible();

    await page.getByRole("button", { name: /^Pay R/ }).click();

    // The redirect leaves the app entirely — assert we reached the provider
    // rather than trying to drive Yoco's hosted page.
    await page.waitForURL(/payments\.yoco\.com/, { timeout: 20_000 });
    expect(page.url()).toContain("payments.yoco.com");
  });

  test("a cancelled checkout leaves the booking payable", async ({ page }) => {
    const bookingId = process.env.YOCO_E2E_BOOKING_ID;
    test.skip(!bookingId, "Set YOCO_E2E_BOOKING_ID to a CONFIRMED booking");

    await page.goto(`${BASE_URL}/client/bookings/${bookingId}/payment?state=cancelled`);

    await expect(page.getByText("Payment cancelled")).toBeVisible();
    await expect(page.getByText("You have not been charged.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Resume payment" })).toBeVisible();
  });
});

test.describe("earnings disclose the commission", () => {
  test.skip(!process.env.YOCO_E2E, "Needs a seeded, paid booking");

  test("a speaker sees net, not gross", async ({ page }) => {
    await page.goto(`${BASE_URL}/speaker/earnings`);

    // The deduction must be stated, not left to be inferred.
    await expect(page.getByText(/15% platform commission/)).toBeVisible();
    await expect(page.getByText("You receive").first()).toBeVisible();
  });
});
