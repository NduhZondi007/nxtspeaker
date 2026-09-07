/**
 * Helpers for validating Supabase Storage public URLs that arrive from the
 * browser.
 *
 * The upload itself happens client-side (so the file never round-trips
 * through a Server Action), and the resulting public URL is then handed to a
 * Server Action to persist. That URL is untrusted input: a substring check
 * such as `url.includes("/speaker-photos/<uid>/")` is satisfied by
 * `https://attacker.example/speaker-photos/<uid>/x.png`, which would then be
 * stored on the profile and rendered to every visitor. These helpers pin the
 * URL to our own Supabase project, bucket, and the caller's own folder.
 */

const PUBLIC_OBJECT_PREFIX = "/storage/v1/object/public/";

function storageOrigin(): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  try {
    return new URL(base).origin;
  } catch {
    return null;
  }
}

/**
 * Returns the object path (`<userId>/<file>`) when `url` is a public URL for
 * `bucket` inside `userId`'s own folder on this project's Supabase Storage,
 * and `null` for anything else. Query strings (e.g. a cache-buster) are
 * ignored.
 */
export function parseOwnedStorageObjectPath(
  url: string,
  bucket: string,
  userId: string
): string | null {
  const origin = storageOrigin();
  if (!origin) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.origin !== origin) return null;

  const expectedPrefix = `${PUBLIC_OBJECT_PREFIX}${bucket}/`;
  if (!parsed.pathname.startsWith(expectedPrefix)) return null;

  const objectPath = decodeURIComponent(parsed.pathname.slice(expectedPrefix.length));
  if (!objectPath.startsWith(`${userId}/`)) return null;
  // Reject traversal and empty file names outright.
  if (objectPath.includes("..") || objectPath.endsWith("/")) return null;

  return objectPath;
}

/** The canonical form we persist: same URL with any query string removed. */
export function canonicalStorageUrl(url: string): string {
  return url.split("?")[0];
}
