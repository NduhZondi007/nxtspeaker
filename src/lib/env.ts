export function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (url) {
    return url;
  }

  // Vercel injects VERCEL_URL on every deployment — production, preview,
  // and branch — with no manual configuration required. Falling back to it
  // keeps builds green (and each preview correctly self-referencing) even
  // when NEXT_PUBLIC_APP_URL hasn't been set for that environment, while
  // still failing loudly outside Vercel (e.g. local dev with no env file)
  // instead of silently pointing at the wrong domain.
  //
  // On a production deploy VERCEL_URL is the unique per-deployment hostname
  // (nxtspeaker-abc123.vercel.app), so canonical URLs, OG images and auth
  // redirects pointed at a deployment rather than the real domain. Vercel
  // exposes that domain as VERCEL_PROJECT_PRODUCTION_URL.
  const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (process.env.VERCEL_ENV === "production" && productionUrl) {
    return `https://${productionUrl}`;
  }

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }

  throw new Error("NEXT_PUBLIC_APP_URL is not set");
}
