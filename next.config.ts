import type { NextConfig } from "next";

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
  turbopack: {
    resolveAlias: {
      // next/server.js is CJS; on Linux Turbopack wraps CJS modules with a
      // Node.js module shim that injects __dirname, which crashes Edge Runtime.
      // Alias to the dedicated ESM edge-runtime export so no CJS wrapper is needed.
      "next/server": "next/dist/esm/server/web/exports/index.js",
    },
  },
};

export default nextConfig;
