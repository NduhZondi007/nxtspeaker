# NxtSpeaker — Claude Code Configuration

## Project Overview

Speaker booking platform for South Africa. Clients discover and book speakers; speakers manage their profiles, bookings, and earnings.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript (strict) · Supabase (Postgres + Auth + Realtime + Storage) · Tailwind CSS 4 · Zod · Vercel Edge

**Key paths:**
- `src/app/` — App Router pages and server actions
- `src/components/` — React components (ui/, layout/, speakers/, bookings/, chat/)
- `src/lib/` — Supabase clients, hooks, types, utils
- `supabase/migrations/` — All DB schema changes live here
- `middleware.ts` — Edge auth guard
- `docs/ERRORS.md` — Error log (append every non-trivial error encountered)
- `docs/ERRORLOG.md` — Detailed incident log for major errors (full root cause analysis, fix chain, runbook)
- `docs/CHANGELOG.md` — All changes recorded here

---

## Development Approach: TDD (Red → Green → Refactor)

**Every feature, fix, or chore follows this cycle — no exceptions.**

```
1. RED   — Write a failing test that describes the desired behaviour
2. GREEN — Write the minimum code to make it pass
3. REFACTOR — Clean up without changing behaviour; tests must still pass
```

### What to test

| Layer | What to test | Tool |
|---|---|---|
| Pure functions (`src/lib/utils/`) | All exported functions | Vitest |
| Server actions (`src/app/actions/`) | Input validation, auth guards, error paths | Vitest + mock Supabase |
| API routes (`src/app/api/`) | HTTP method handling, status codes | Vitest + Next.js test helpers |
| React components | Render, user interactions, edge states | Vitest + React Testing Library |
| Auth flows, booking flows, chat | Full happy path + sad path | Playwright |

### Test file convention

- Unit/integration: `src/__tests__/<mirror-path>.test.ts(x)` — mirrors `src/` structure
- E2E: `e2e/<feature>.spec.ts`
- Test names: `describe("functionName / ComponentName")` → `it("does X when Y")`

### Testing setup (run once if not already done)

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install -D playwright @playwright/test
npx playwright install
```

---

## Commands

```bash
# Development
npm run dev              # Start dev server (localhost:3000)
npm run type-check       # TypeScript check — run before every commit

# Testing
npm run test             # Vitest watch mode
npm run test:run         # Vitest single run (CI)
npm run test:e2e         # Playwright E2E
npm run test:e2e:ui      # Playwright with browser UI

# Quality
npm run lint             # ESLint
npm run build            # Production build — run before pushing

# Database
npx supabase db diff     # Preview schema changes
npx supabase migration new <name>   # Create a migration
npx supabase db push     # Apply migrations to remote
```

---

## Commit Process

Every commit follows this exact sequence. Do not skip steps.

### 1. Pre-commit checks (all must pass)
```bash
npm run type-check   # Zero TypeScript errors
npm run lint         # Zero lint errors
npm run test:run     # All tests green
npm run build        # Build must succeed
```

### 2. Stage only intentional files
```bash
git add <specific files>    # Never use `git add .` or `git add -A`
git status                  # Confirm staged set is correct
```

### 3. Commit message format (Conventional Commits)

```
<type>(<scope>): <short imperative description>

[optional body — the WHY, not the WHAT]

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

**Types:**
| Type | When to use |
|---|---|
| `feat` | New user-facing feature |
| `fix` | Bug fix |
| `test` | Adding or fixing tests |
| `refactor` | Code change with no behaviour change |
| `chore` | Build, deps, config, CI |
| `docs` | Documentation only |
| `perf` | Performance improvement |
| `security` | Security fix or hardening |
| `migration` | Database migration |

**Scope examples:** `auth`, `bookings`, `speakers`, `chat`, `middleware`, `db`, `ui`

**Good examples:**
```
feat(bookings): add cancellation reason field to booking form
fix(middleware): guard against missing Supabase env vars on edge runtime
security(actions): fetch speaker fee server-side instead of trusting client input
test(bookings): add unit tests for createBooking input validation
migration(db): replace COUNT race condition with booking_number_seq sequence
```

### 4. Update CHANGELOG.md
After committing, append the entry to `docs/CHANGELOG.md` under the correct `[Unreleased]` section. See CHANGELOG format below.

### 5. Log errors (if any were encountered during this work)
Append to `docs/ERRORS.md` using the error entry format. See Error Log section below.

---

## Error Log (`docs/ERRORS.md`)

**Append an entry whenever:**
- A bug is discovered and fixed
- A non-obvious error is encountered during development or deployment
- A security issue is identified
- A Vercel/Supabase/infrastructure error occurs

**Format:**
```markdown
## YYYY-MM-DD · <type> · <short title>

**Type:** bug | config | security | infrastructure | data | performance
**Affected:** <file or system>
**Severity:** low | medium | high | critical

**What happened:**
One paragraph describing the symptom and how it was discovered.

**Root cause:**
One paragraph explaining why it happened.

**Fix:**
What was changed to resolve it.

**Prevention:**
What guard/test/check was added to prevent recurrence.
```

---

## Detailed Incident Log (`docs/ERRORLOG.md`)

For **major incidents** — 500 errors, build failures, deployment failures, or any situation where the site is fully down — a short `ERRORS.md` entry is not enough. These require a full entry in `docs/ERRORLOG.md`.

**Mandatory for:**
- HTTP 500 errors on production that affect all users
- Vercel/Supabase build or deployment failures
- Site-down incidents (all routes failing)
- Multi-layer problems where fixing one issue revealed the next
- Any error that took more than 30 minutes to diagnose

**What a ERRORLOG.md entry must include:**
1. **Summary table** — each layer of the problem, its root cause, and its fix
2. **Per-layer analysis** — symptom, why it happened, what was tried first and why it failed, the actual fix
3. **How to diagnose this class of problem next time** — decision tree / checklist
4. **Prevention checklist** — concrete items to verify before the next deployment

**Format:**
```markdown
## YYYY-MM-DD — <title of incident>

**Duration:** <how long the site was affected>
**Impact:** <what users experienced>
**Severity:** Critical | High | Medium
**Resolved:** Yes / No

### Summary
| # | Symptom | Root cause | Fix |
|---|---------|------------|-----|
| 1 | ... | ... | ... |

### Layer N: <name>
**Symptom:** ...
**Why it happened:** ...
**Fix:** ...

### How to diagnose this class of problem next time
...

### Prevention checklist
- [ ] ...
```

---

## Handover Ritual

**Run this at the end of every session**, whether the session ends naturally or is interrupted. The goal is zero knowledge loss between sessions.

### Handover checklist

Claude must complete these steps before the session closes:

- [ ] **Summarise the session** — what was built, changed, or investigated
- [ ] **List open tasks** — anything started but not finished, in priority order
- [ ] **Document errors** — append any bugs/errors to `docs/ERRORS.md`; write a full incident entry in `docs/ERRORLOG.md` for any major error (500s, build failures, site-down)
- [ ] **Update changelog** — append all commits made this session to `docs/CHANGELOG.md`
- [ ] **Note key decisions** — any architectural choices made and why
- [ ] **State next steps** — the exact next action the next session should take
- [ ] **Save memory** — update relevant memory files under `.claude/projects/.../memory/`
- [ ] **Verify clean state** — `git status` should be clean or have only intentional uncommitted changes

### Handover output format

At the end of the session, output a handover block:

```
---
## Session Handover — YYYY-MM-DD

### Done
- <bullet per completed task>

### In Progress / Open
- <bullet with exact state — which file, which line, what was the blocker>

### Key Decisions
- <decision>: <rationale>

### Errors Documented
- <title> → docs/ERRORS.md

### Next Session: Start Here
<One clear instruction for exactly what to do first next session>

### Git State
<output of git status>
---
```

---

## Database Changes

- **All schema changes must be migrations** — never edit the DB directly in production
- Create: `npx supabase migration new <descriptive-name>`
- File lands in `supabase/migrations/YYYYMMDDHHMMSS_<name>.sql`
- Write the SQL, test locally, then `npx supabase db push`
- Commit the migration file with type `migration`

**RLS rules:** Every table must have RLS enabled. Every policy must be tested in Supabase Studio before pushing.

---

## Code Standards

### TypeScript
- Strict mode is on — no `any`, no `@ts-ignore`
- Prefer explicit return types on exported functions
- Use Zod for all external input validation (form data, API payloads)

### Server Actions
- Always call `supabase.auth.getUser()` — never trust client-supplied user IDs
- Whitelist fields explicitly — never spread untrusted input into DB queries
- Return `{ error: string }` or `{ data: T }` — never throw from actions

### Components
- No business logic in components — data fetching belongs in Server Components or actions
- Props interfaces above the component, not inline
- No `console.log` left in committed code

### Security
- Never read role from `raw_user_meta_data` — use `raw_app_meta_data` (server-only) or the `profiles` table
- Never trust quoted fees from the client — always fetch from DB server-side
- Service role key must never appear in client-side code

---

## Environment Variables

| Variable | Where used | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + server + middleware | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + server + middleware | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only — never expose to client | Yes |
| `NEXT_PUBLIC_APP_URL` | Auth redirects | Yes (prod) |

**Vercel:** All four must be set under Settings → Environment Variables → Production.

---

## Project Memory

Claude memory files live at:
`C:\Users\Mancinza\.claude\projects\C--Users-Mancinza-Documents-New-folder--2--nxtspeaker\memory\`

Update memory after each session's handover. Do not store code patterns or git history — store decisions, preferences, and context not derivable from the code.
