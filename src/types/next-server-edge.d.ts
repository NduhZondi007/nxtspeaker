// Type declarations for the Next.js ESM spec-extension response module.
// next/dist/esm/server/web/spec-extension/response.js ships no .d.ts; this
// tells TypeScript what it exports so middleware.ts can import from it directly.
declare module "next/dist/esm/server/web/spec-extension/response.js" {
  export { NextResponse } from "next/server";
}
