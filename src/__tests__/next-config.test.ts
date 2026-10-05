import { describe, it, expect } from "vitest";
import nextConfig from "../../next.config";

async function headersFor(source: string): Promise<Record<string, string>> {
  expect(nextConfig.headers).toBeTypeOf("function");
  const rules = await nextConfig.headers!();
  const rule = rules.find((r) => r.source === source);
  expect(rule, `no header rule for ${source}`).toBeDefined();
  return Object.fromEntries(rule!.headers.map((h) => [h.key, h.value]));
}

describe("next.config / headers", () => {
  it("sends the baseline security headers on every route", async () => {
    const headers = await headersFor("/(.*)");

    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["Permissions-Policy"]).toBe("camera=(), microphone=(), geolocation=()");
  });

  it("sends a CSP that blocks framing, base hijacking, plugins and foreign form posts", async () => {
    const csp = (await headersFor("/(.*)"))["Content-Security-Policy"];
    const directives = Object.fromEntries(
      csp.split(";").map((d) => d.trim()).filter(Boolean).map((d) => {
        const [name, ...values] = d.split(/\s+/);
        return [name, values.join(" ")];
      })
    );

    expect(directives["frame-ancestors"]).toBe("'none'");
    expect(directives["base-uri"]).toBe("'self'");
    expect(directives["object-src"]).toBe("'none'");
    // Yoco's hosted checkout is reached by redirect, but a form post to it must
    // still be allowed; nothing else may receive a form submission.
    expect(directives["form-action"]).toBe("'self' https://payments.yoco.com");
  });

  it("does not ship a script-src/default-src policy that would block Next's inline bootstrap scripts", async () => {
    const csp = (await headersFor("/(.*)"))["Content-Security-Policy"];
    expect(csp).not.toMatch(/script-src/);
    expect(csp).not.toMatch(/default-src/);
  });

  it("keeps the Supabase storage image allow-list", () => {
    expect(nextConfig.images?.remotePatterns).toEqual([
      expect.objectContaining({ hostname: "*.supabase.co" }),
    ]);
  });
});
