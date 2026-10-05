import { describe, it, expect, afterEach } from "vitest";
import { getBaseUrl } from "@/lib/env";

const ENV_KEYS = [
  "NEXT_PUBLIC_APP_URL",
  "VERCEL_URL",
  "VERCEL_ENV",
  "VERCEL_PROJECT_PRODUCTION_URL",
] as const;

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

  it("uses the stable production domain on a Vercel production deploy, not the per-deploy URL", () => {
    process.env.VERCEL_ENV = "production";
    process.env.VERCEL_URL = "nxtspeaker-abc123.vercel.app";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "www.nxtspeaker.co.za";
    expect(getBaseUrl()).toBe("https://www.nxtspeaker.co.za");
  });

  it("keeps the per-deploy VERCEL_URL on preview deploys", () => {
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_URL = "nxtspeaker-git-branch.vercel.app";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "www.nxtspeaker.co.za";
    expect(getBaseUrl()).toBe("https://nxtspeaker-git-branch.vercel.app");
  });

  it("falls back to VERCEL_URL in production when the production URL is not exposed", () => {
    process.env.VERCEL_ENV = "production";
    process.env.VERCEL_URL = "nxtspeaker-abc123.vercel.app";
    expect(getBaseUrl()).toBe("https://nxtspeaker-abc123.vercel.app");
  });

  it("still prefers an explicit NEXT_PUBLIC_APP_URL in production", () => {
    process.env.VERCEL_ENV = "production";
    process.env.NEXT_PUBLIC_APP_URL = "https://nxtspeaker.co.za";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "www.nxtspeaker.co.za";
    expect(getBaseUrl()).toBe("https://nxtspeaker.co.za");
  });

  it("throws when neither NEXT_PUBLIC_APP_URL nor VERCEL_URL is set", () => {
    expect(() => getBaseUrl()).toThrow("NEXT_PUBLIC_APP_URL is not set");
  });
});
