import { describe, it, expect, afterEach } from "vitest";
import { getBaseUrl } from "@/lib/env";

const ENV_KEYS = ["NEXT_PUBLIC_APP_URL", "VERCEL_URL"] as const;

describe("getBaseUrl", () => {
  afterEach(() => {
    for (const key of ENV_KEYS) delete process.env[key];
  });

  it("returns NEXT_PUBLIC_APP_URL when it is set", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://www.nxtspeaker.co.za";
    expect(getBaseUrl()).toBe("https://www.nxtspeaker.co.za");
  });

  it("prefers NEXT_PUBLIC_APP_URL over VERCEL_URL when both are set", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://www.nxtspeaker.co.za";
    process.env.VERCEL_URL = "nxtspeaker-git-some-branch.vercel.app";
    expect(getBaseUrl()).toBe("https://www.nxtspeaker.co.za");
  });

  it("falls back to Vercel's auto-injected VERCEL_URL when NEXT_PUBLIC_APP_URL is unset", () => {
    process.env.VERCEL_URL = "nxtspeaker-git-some-branch.vercel.app";
    expect(getBaseUrl()).toBe("https://nxtspeaker-git-some-branch.vercel.app");
  });

  it("throws when neither NEXT_PUBLIC_APP_URL nor VERCEL_URL is set", () => {
    expect(() => getBaseUrl()).toThrow("NEXT_PUBLIC_APP_URL is not set");
  });
});
