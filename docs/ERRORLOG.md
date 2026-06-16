# NxtSpeaker — Detailed Error Log

Comprehensive incident documentation for major errors (500s, build failures, deployment failures, site-down incidents). Short entries live in `docs/ERRORS.md`; incidents requiring a full root cause chain and runbook live here.

---

## 2026-06-16 — Site completely down: MIDDLEWARE_INVOCATION_FAILED (4-layer fix chain)

**Duration:** Several hours across two sessions  
**Impact:** Every request to `imvunulo.co.za` returned 500 or 404 — site fully inaccessible  
**Severity:** Critical  
**Resolved:** Yes — `imvunulo.co.za` returns HTTP 200 as of 2026-06-16

---

### Summary

What appeared to be a single error (`MIDDLEWARE_INVOCATION_FAILED`) turned out to be four separate problems stacked on top of each other. Fixing one exposed the next:

| # | Symptom | Root cause | Fix |
|---|---------|------------|-----|
| 1 | `500 MIDDLEWARE_INVOCATION_FAILED` | `ReferenceError: __dirname` in Edge Runtime | Import `NextResponse` from ESM path |
| 2 | Vercel build failure (`Expected ";" but found "with"`) | Import Attributes syntax via wrong ESM path | Use narrower ESM path (`spec-extension/response.js`) |
| 3 | DNS resolving to old host IPs | Stale A records in Vercel DNS zone | Vercel auto-corrected on domain re-association |
| 4 | `404 NOT_FOUND` on all routes including `/login` | `framework: null` on Vercel project | Set `framework: nextjs` via Vercel API |

---

### Layer 1: ReferenceError: __dirname in Edge Runtime

**Symptom:** Every request returns `500 MIDDLEWARE_INVOCATION_FAILED`. Vercel runtime logs show `ReferenceError: __dirname is not defined` sourced from `edge-middleware`.

**Why it happened:**

`middleware.ts` imported:
```ts
import { NextResponse, type NextRequest } from "next/server";
```

`next/server` resolves to `node_modules/next/server.js` which is **CommonJS** (`module.exports = ...`). On Vercel's Linux/Node 24 Turbopack production build, CJS modules are wrapped in a Node.js-style module shim that injects `__dirname`. The Edge Runtime is a V8 isolate — it does not provide `__dirname` — so the shim throws on every module load.

**Why local dev didn't reproduce it:** Turbopack's native binary handles CJS-to-Edge bundling differently on Windows vs. Linux. The shim injection only triggers on the Linux production build path.

**Why the `turbopack.resolveAlias` fix didn't work:** The `turbopack.*` config key in `next.config.ts` only affects the **Turbopack dev server**, not the production build. The alias was silently ignored on Vercel.

**Fix:**

```ts
// type-only — erased at build time, no CJS wrapper risk
import type { NextRequest } from "next/server";
// Direct ESM path: pure ESM, no CJS wrapper, no Turbopack __dirname shim
import { NextResponse } from "next/dist/esm/server/web/spec-extension/response.js";
```

Key insight: `import type` imports are completely erased at build time — they generate zero runtime code, so even a CJS source is safe as a type origin.

Also added `src/types/next-server-edge.d.ts`:
```ts
declare module "next/dist/esm/server/web/spec-extension/response.js" {
  export { NextResponse } from "next/server";
}
```

---

### Layer 2: Vercel build failure — Import Attributes syntax

**Symptom:** After the first fix attempt (importing from `next/dist/esm/server/web/exports/index.js`), Vercel's build failed with:
```
vc-file-system:__vc__ns__/0/node_modules/next/dist/esm/server/app-render/after-task-async-storage.external.js:2:109:
  ERROR: Expected ";" but found "with"
```
(Three identical errors from three different `app-render` files.)

**Why it happened:**

`next/dist/esm/server/web/exports/index.js` is the "alias index for edge runtime for tree-shaking" — but it re-exports `after` and `connection` in addition to `NextResponse`. The `after` export imports from `../../after`, which transitively pulls in:

```
after-task-async-storage.external.js
work-async-storage.external.js
work-unit-async-storage.external.js
```

These files use **Import Attributes** syntax:
```js
import ... with { type: 'commonjs' }
```

Vercel's esbuild-based edge bundler does not support Import Attributes (it's a newer ECMAScript proposal). The build fails immediately.

**Fix:**

Use `next/dist/esm/server/web/spec-extension/response.js` — the file that directly defines `NextResponse`, with no `after`/`connection` re-exports. Its full transitive dependency tree contains **zero** Import Attributes syntax.

**How to verify any ESM path is safe:**
```bash
# Check for Import Attributes in a directory subtree
grep -r "with {" node_modules/next/dist/esm/server/web/spec-extension/
# Should return nothing for a safe path
```

---

### Layer 3: DNS stale A records

**Symptom:** Even after the middleware fix and a successful build, `nslookup imvunulo.co.za` returned:
```
216.198.79.65
64.29.17.1
```
These are IP addresses for the old hosting provider, not Vercel's `76.76.21.21`.

**Why it happened:** The domain `imvunulo.co.za` had nameservers pointing to Vercel (`ns1.vercel-dns.com`, `ns2.vercel-dns.com`), but old A records from the previous hosting provider still existed in Vercel's DNS zone. Vercel had not yet associated the domain with the project, so it hadn't overwritten the records.

**Fix:** Vercel auto-corrected the A records once the domain was properly associated with the project. The new record `76.76.21.21` appeared with a 60-second TTL.

**How to verify DNS is correct:**
```powershell
# Query the authoritative Vercel nameserver directly (bypasses local cache)
Resolve-DnsName imvunulo.co.za -Server ns1.vercel-dns.com
# Should return: 76.76.21.21
```

---

### Layer 4: framework: null — all pages return 404

**Symptom:** After DNS was fixed, every route including static ones like `/login` returned:
```
404: NOT_FOUND
Code: NOT_FOUND
```

**Why it happened:** The Vercel project had `"framework": null` in its configuration. This means:
- Vercel ran `next build` and it succeeded (producing a `.next/` directory)
- But Vercel's build system **did not use the Next.js adapter** (`@vercel/next`)
- Without the adapter, the `.next/` output is ignored — only the Edge Middleware (recognisable by its export pattern) was deployed
- All pages, API routes, and Lambda functions were missing → 404 on every route

**Fix:**

Set `framework: nextjs` via the Vercel API:
```bash
vercel api "/v9/projects/prj_lPfIKDvAJxqWfKO7orJuyGpmuEFT?teamId=team_Aq8JOjSTPapOBVHihdD3hDPf" \
  -X PATCH \
  -F "framework=nextjs"
```

Then trigger a new deployment. The build log should now include:
```
Detected Next.js version: 16.1.7
```

A healthy Next.js deployment on Vercel will have 60+ output items (Lambda functions, static assets, edge functions).

**Note on `vercel api` syntax:**
- `-F "key=value"` is the correct way to pass typed field parameters
- `-d '{"key":"value"}'` does NOT work — `-d` is a debug flag in the Vercel CLI, not a request body flag

**In the Vercel dashboard:**  
Settings → General → Framework Preset → select **Next.js**

---

### How to diagnose this class of problem next time

If you get `500 MIDDLEWARE_INVOCATION_FAILED` on Vercel:

1. **Check Vercel runtime logs** for `edge-middleware` source. The error message is the first clue.
   - `__dirname is not defined` → CJS module loaded in Edge Runtime → see Layer 1
   - `Cannot read properties of undefined` → likely an env var is missing → check Vercel dashboard env vars
   - `TypeError: ... is not a function` → likely an import that isn't available in V8 isolate

2. **Check the Vercel build log** for esbuild errors.
   - `Expected ";" but found "with"` → Import Attributes in transitive dependency → see Layer 2
   - `Module not found` → wrong import path for Edge Runtime

3. **If the build succeeds but routes return 404:**
   - Check the deployment output item count — a Next.js project should have 60+ items
   - If only 1–3 items (just middleware), the framework adapter is not running → see Layer 4
   - Verify: Settings → General → Framework Preset → must be **Next.js**

4. **If the site returns the right status codes but content is wrong:**
   - Check DNS with `Resolve-DnsName <domain> -Server ns1.vercel-dns.com`
   - Vercel's authoritative IP is `76.76.21.21`

---

### Prevention checklist (for future deployments)

- [ ] Middleware imports `NextResponse` from `next/dist/esm/server/web/spec-extension/response.js` (not `next/server` or `exports/index.js`)
- [ ] Middleware uses `import type` for all types from `"next/server"`
- [ ] Vercel project Framework Preset is set to **Next.js** (Settings → General)
- [ ] All four env vars are set in Vercel for the Production environment
- [ ] DNS verified via authoritative nameserver query before testing
- [ ] New deployment has 60+ output items (check build output tab)

---

## Navigation guide — Vercel CLI

Useful commands for diagnosing Vercel issues from the terminal:

```bash
# List all projects and their framework settings
vercel api "/v9/projects?teamId=<team-id>" | jq '.projects[] | {name, framework}'

# Get a specific project's full config
vercel api "/v9/projects/<project-id>?teamId=<team-id>"

# Patch a project setting (e.g., set framework)
vercel api "/v9/projects/<project-id>?teamId=<team-id>" -X PATCH -F "framework=nextjs"

# List deployments for a project
vercel api "/v6/deployments?projectId=<project-id>&teamId=<team-id>&limit=5"

# Get runtime logs for a deployment (most recent errors first)
vercel logs <deployment-url> --output raw

# Check env vars on a project (values of sensitive vars show as empty string — this is normal)
vercel api "/v9/projects/<project-id>/env?teamId=<team-id>"

# Re-trigger a deployment
vercel redeploy <deployment-id> --team <team-id>
```

**Project IDs for imvunulo.co.za:**
- Project ID: `prj_lPfIKDvAJxqWfKO7orJuyGpmuEFT`
- Team ID: `team_Aq8JOjSTPapOBVHihdD3hDPf`
- Project name: `nxtspeaker-trash`
