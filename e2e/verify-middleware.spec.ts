import { test, expect } from "@playwright/test";

const TEST_EMAIL = `pw-verify-${Date.now()}@test.nxtspeaker.internal`;
const TEST_PASSWORD = "TestPass@2026!";
const TEST_NAME = "Playwright Tester";

test.describe.configure({ mode: "serial" });

test.describe("middleware + auth flows", () => {
  test("unauthenticated: /client/dashboard redirects once to /login (no loop)", async ({
    page,
  }) => {
    const redirects: string[] = [];
    page.on("response", (res) => {
      if (res.status() === 307 || res.status() === 302) {
        redirects.push(`${res.status()} ${res.url()} → ${res.headers()["location"] ?? ""}`);
      }
    });

    await page.goto("http://localhost:3000/client/dashboard", {
      waitUntil: "networkidle",
      timeout: 15000,
    });

    expect(page.url()).toContain("/login");
    // A loop would produce dozens of redirects; one hop is correct
    expect(redirects.length).toBeLessThan(5);
  });

  test("account creation: register as CLIENT → land on /client/discover → /client/dashboard accessible", async ({
    page,
  }) => {
    await page.goto("http://localhost:3000/register", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /event client/i }).click();
    await page.getByLabel(/full name/i).fill(TEST_NAME);
    await page.getByLabel(/email address/i).fill(TEST_EMAIL);
    await page.getByLabel(/password/i).fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /create account/i }).click();

    await page.waitForURL(/\/client\/discover/, { timeout: 25000 });
    expect(page.url()).toContain("/client/discover");

    // Full page load to dashboard — must stay there (proves session is valid
    // and middleware + RLS both work for a newly registered user)
    await page.goto("http://localhost:3000/client/dashboard", {
      waitUntil: "networkidle",
      timeout: 15000,
    });
    expect(page.url()).toContain("/client/dashboard");
  });

  test("login flow: CLIENT login lands on /client/dashboard and stays on reload", async ({
    page,
  }) => {
    await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
    await page.getByLabel(/email/i).fill(TEST_EMAIL);
    await page.getByLabel(/password/i).fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.waitForURL(/\/client\/dashboard/, { timeout: 20000 });
    expect(page.url()).toContain("/client/dashboard");

    // Reload — must still be on dashboard, not redirected to /login
    await page.reload({ waitUntil: "networkidle" });
    expect(page.url()).toContain("/client/dashboard");
  });
});
