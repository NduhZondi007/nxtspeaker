import { test, expect } from "@playwright/test";

// Example E2E spec — replace with real credentials via environment variables
// PLAYWRIGHT_TEST_EMAIL / PLAYWRIGHT_TEST_PASSWORD must be set to run these

test.describe("Authentication", () => {
  test("unauthenticated user is redirected to /login from /client/dashboard", async ({ page }) => {
    await page.goto("/client/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated user is redirected to /login from /speaker/dashboard", async ({ page }) => {
    await page.goto("/speaker/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login page renders the sign-in form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });
});
