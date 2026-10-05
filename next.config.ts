import type { NextConfig } from "next";

// Deliberately no `script-src` / `default-src`: Next.js injects inline
// bootstrap scripts, and a script policy without per-request nonces breaks
// hydration. These directives carry no such risk and close the cheap attacks:
// clickjacking (frame-ancestors), <base> hijacking of relative URLs, plugin
// embeds, and forms posting credentials to a foreign origin. Yoco's hosted
// checkout is the only off-site form target the app has.
const CONTENT_SECURITY_POLICY = [
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self' https://payments.yoco.com",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [{ source: "/(.*)", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
