// Type declarations for the Next.js ESM Edge Runtime export of next/server.
// next/dist/esm/server/web/exports/index.js ships no .d.ts; this tells
// TypeScript what it exports so middleware.ts can import from it directly.
declare module "next/dist/esm/server/web/exports/index.js" {
  export { NextResponse } from "next/server";
}
