import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { canonicalStorageUrl, parseOwnedStorageObjectPath } from "@/lib/utils/storage";
import { containsPattern, escapePostgrestFilterValue } from "@/lib/utils/postgrest";

const PROJECT = "https://abcdefgh.supabase.co";
const USER = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";
const publicUrl = (bucket: string, path: string) =>
  `${PROJECT}/storage/v1/object/public/${bucket}/${path}`;

describe("parseOwnedStorageObjectPath", () => {
  const original = process.env.NEXT_PUBLIC_SUPABASE_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = PROJECT;
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = original;
  });

  it("returns the object path for the caller's own file in the bucket", () => {
    expect(parseOwnedStorageObjectPath(publicUrl("speaker-photos", `${USER}/a.png`), "speaker-photos", USER))
      .toBe(`${USER}/a.png`);
  });

  it("ignores a cache-busting query string", () => {
    expect(
      parseOwnedStorageObjectPath(
        `${publicUrl("speaker-avatars", `${USER}/avatar.jpg`)}?t=1699999999`,
        "speaker-avatars",
        USER
      )
    ).toBe(`${USER}/avatar.jpg`);
  });

  it("rejects a URL hosted anywhere other than this Supabase project", () => {
    expect(
      parseOwnedStorageObjectPath(
        `https://attacker.example/storage/v1/object/public/speaker-photos/${USER}/a.png`,
        "speaker-photos",
        USER
      )
    ).toBeNull();
  });

  it("rejects a path that merely contains the bucket folder as a substring", () => {
    expect(
      parseOwnedStorageObjectPath(
        `https://attacker.example/speaker-photos/${USER}/a.png`,
        "speaker-photos",
        USER
      )
    ).toBeNull();
  });

  it("rejects another user's folder", () => {
    expect(parseOwnedStorageObjectPath(publicUrl("speaker-photos", `${OTHER}/a.png`), "speaker-photos", USER))
      .toBeNull();
  });

  it("rejects a different bucket", () => {
    expect(parseOwnedStorageObjectPath(publicUrl("speaker-avatars", `${USER}/a.png`), "speaker-photos", USER))
      .toBeNull();
  });

  it("rejects path traversal", () => {
    expect(
      parseOwnedStorageObjectPath(publicUrl("speaker-photos", `${USER}/../${OTHER}/a.png`), "speaker-photos", USER)
    ).toBeNull();
  });

  it("rejects a value that is not a URL", () => {
    expect(parseOwnedStorageObjectPath("not a url", "speaker-photos", USER)).toBeNull();
  });
});

describe("canonicalStorageUrl", () => {
  it("strips the query string so the stored value round-trips", () => {
    expect(canonicalStorageUrl("https://x.co/a.png?t=1")).toBe("https://x.co/a.png");
    expect(canonicalStorageUrl("https://x.co/a.png")).toBe("https://x.co/a.png");
  });
});

describe("escapePostgrestFilterValue", () => {
  it("quotes the value so commas cannot inject extra conditions", () => {
    expect(escapePostgrestFilterValue("%a,role.eq.ADMIN%")).toBe('"%a,role.eq.ADMIN%"');
  });

  it("escapes embedded quotes and backslashes", () => {
    expect(escapePostgrestFilterValue('a"b')).toBe('"a\\"b"');
    expect(escapePostgrestFilterValue("a\\b")).toBe('"a\\\\b"');
  });
});

describe("containsPattern", () => {
  it("wraps the term for a contains match", () => {
    expect(containsPattern("ndumiso")).toBe("%ndumiso%");
  });

  it("escapes LIKE wildcards so they match literally", () => {
    expect(containsPattern("100%")).toBe("%100\\%%");
    expect(containsPattern("a_b")).toBe("%a\\_b%");
  });
});
