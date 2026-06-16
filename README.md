# NxtSpeaker

Africa's premier speaker booking platform. NxtSpeaker connects event organisers with world-class professional speakers across South Africa and the continent — handling discovery, booking, negotiation, and communication in one place.

---

## Overview

NxtSpeaker is a full-stack web application with two user roles:

- **Clients** — event organisers who discover speakers, submit booking requests, review hospitality riders, and chat directly with speakers
- **Speakers** — professional presenters who manage their public profile, set their fee and availability, respond to booking requests, and track earnings

---

## Features

### For Clients
- Browse and filter speakers by expertise, fee range, format (in-person / virtual / hybrid), and availability
- View full speaker profiles including bio, languages, ratings, and reviews
- Submit booking requests with full event details
- Review the speaker's hospitality rider before confirming
- Real-time chat with speakers on each booking
- Dashboard with booking stats and top speaker recommendations

### For Speakers
- Manage a public profile (photo, bio, title, expertise tags, languages, location, fee)
- Set availability for in-person, virtual, and hybrid events
- Configure a detailed hospitality rider (water, catering, green room, AV, travel, accommodation)
- Accept or decline incoming booking requests
- Chat with clients per booking
- Earnings dashboard tracking confirmed and completed fees

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Backend / Database | [Supabase](https://supabase.com) (Postgres + Auth + Storage) |
| Auth | Supabase Auth (email/password) |
| Deployment | [Vercel](https://vercel.com) |

---

## Getting Started

### Prerequisites

- Node.js 22+ (Vercel runs Node.js 24; use 22+ locally to stay compatible)
- A [Supabase](https://supabase.com) project
- (Optional) [Supabase CLI](https://supabase.com/docs/guides/cli) for local development

### 1. Clone the repository

```bash
git clone https://github.com/your-username/nxtspeaker.git
cd nxtspeaker
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy the example file and fill in your values:

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=http://localhost:3000   # use your custom domain in production
```

Find these values in your Supabase project under **Settings → API**.

> **Security:** `SUPABASE_SERVICE_ROLE_KEY` is never exposed to the browser. It is used only in server-side code (Next.js Server Actions and API routes). Never prefix it with `NEXT_PUBLIC_`.

### 4. Set up the database

Run the schema against your Supabase project. You can do this via the Supabase dashboard SQL editor or the CLI:

```bash
# Using the Supabase CLI (must be logged in and linked to your project)
supabase db push
```

Or paste the contents of `supabase/migrations/` into the **SQL Editor** in your Supabase dashboard.

The schema creates the following tables: `profiles`, `speaker_profiles`, `hospitality_riders`, `bookings`, `messages`, and `reviews`, along with all RLS policies, triggers, and functions.

### 5. Configure Supabase Auth

In your Supabase dashboard under **Authentication → URL Configuration**:

- **Site URL** → `http://localhost:3000`
- **Redirect URLs** → add `http://localhost:3000/auth/callback`

### 6. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Login and registration pages
│   ├── api/bookings/        # REST API route for bookings
│   ├── auth/callback/       # Supabase OAuth callback handler
│   ├── actions/             # Next.js Server Actions (auth, bookings, speakers, messages, reviews)
│   ├── client/              # Client-role pages (dashboard, discover, bookings, chat)
│   └── speaker/             # Speaker-role pages (dashboard, profile, bookings, rider, earnings)
├── components/
│   ├── bookings/            # Booking form, hospitality rider view
│   ├── chat/                # Chat panel
│   ├── layout/              # Sidebar, TopBar, AuthProvider
│   ├── speakers/            # Speaker cards, filters, modal
│   └── ui/                  # Shared UI components (Button, Input, Badge, Modal, Toast)
├── lib/
│   ├── supabase/            # Supabase client factories (server and browser)
│   ├── types/               # TypeScript database types
│   └── utils/               # Currency formatting, helpers
middleware.ts                 # Edge auth guard (route protection for /client and /speaker)
```

---

## Deploying to Vercel

### 1. Push to GitHub

```bash
git add -A
git commit -m "Initial deployment"
git push
```

### 2. Import on Vercel

Go to [vercel.com/new](https://vercel.com/new) and import your repository.

> **Critical:** After importing, go to **Settings → General → Framework Preset** and confirm it is set to **Next.js**. If it shows "Other" or is blank, change it to Next.js and redeploy. Without this, Vercel runs the build but ignores the output — all pages return 404.

### 3. Add environment variables

In **Settings → Environment Variables** on the Vercel dashboard, add all four variables for the **Production** environment:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous (publishable) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only, never prefix with `NEXT_PUBLIC_`) |
| `NEXT_PUBLIC_APP_URL` | Your production URL — Vercel deployment URL or custom domain (e.g. `https://imvunulo.co.za`) |

### 4. Update Supabase Auth for production

In **Authentication → URL Configuration** in your Supabase dashboard, update to your production URL (custom domain if you have one, otherwise the Vercel deployment URL):

- **Site URL** → `https://your-domain.co.za`
- **Redirect URLs** → add `https://your-domain.co.za/auth/callback`

### 5. Verify the deployment

After deploying, check the Vercel build output. A healthy Next.js deployment will have **60+ output items** (Lambda functions, static assets, edge middleware). If you see only 1–3 items, the framework adapter is not running — re-check the Framework Preset setting.

---

## Adding a Custom Domain to Vercel

### 1. Add the domain to your Vercel project

In **Settings → Domains**, click **Add**, enter your domain (e.g. `imvunulo.co.za`), and follow the prompts.

### 2. Point your domain's nameservers to Vercel

At your domain registrar (e.g. Afrihost, GoDaddy, Namecheap), update the nameservers to:

```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

This hands DNS management to Vercel. Propagation can take up to 48 hours but is typically faster.

### 3. Verify DNS is resolving correctly

Once nameservers have propagated, verify the domain resolves to Vercel's IP:

```powershell
# Query the authoritative Vercel nameserver directly
Resolve-DnsName your-domain.co.za -Server ns1.vercel-dns.com
# Should return: 76.76.21.21
```

If it still shows old IPs, the nameserver change hasn't propagated yet, or old A records exist in the Vercel DNS zone. Vercel will auto-correct the A records once the domain is properly linked to the project.

### 4. Update Supabase Auth URLs

In your Supabase dashboard under **Authentication → URL Configuration**, update:
- **Site URL** → `https://your-domain.co.za`
- **Redirect URLs** → add `https://your-domain.co.za/auth/callback`

### 5. Update environment variables

In Vercel, update `NEXT_PUBLIC_APP_URL` to `https://your-domain.co.za` for the Production environment, then redeploy.

### Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `404 NOT_FOUND` on all routes | `framework: null` — Next.js adapter not running | Settings → General → Framework Preset → set to Next.js, redeploy |
| `500 MIDDLEWARE_INVOCATION_FAILED` | CJS module in Edge Runtime or missing env var | Check runtime logs; verify all env vars are set in Vercel |
| Domain resolves to wrong IP | Stale DNS records or nameserver not propagated | Wait for propagation; query authoritative nameserver to confirm |
| `.vercel.app` URL returns 401 | SSO protection on preview URLs | Expected — only the custom domain is public |

For a detailed record of what went wrong during the initial deployment and how each issue was fixed, see [`docs/ERRORLOG.md`](docs/ERRORLOG.md).

---

## Database Schema

### Tables

| Table | Description |
|---|---|
| `profiles` | Extends Supabase Auth users with role, name, email, phone, company, avatar |
| `speaker_profiles` | Speaker-specific data — title, bio, expertise, fee, availability, ratings |
| `hospitality_riders` | Speaker requirements for events (catering, AV, travel, accommodation) |
| `bookings` | Booking requests linking a client to a speaker, with event and financial details |
| `messages` | Chat messages between a client and speaker on a booking |
| `reviews` | Client reviews of speakers after completed events |

### Row Level Security

All tables have RLS enabled. Key policies:

- Users can only read and update their own profile
- Clients can only view and create their own bookings
- Speakers can only view bookings assigned to them and update their own profile and rider
- Messages are only visible to the two participants of a booking
- Speaker profiles marked `ACTIVE` are publicly visible to all authenticated users

---

## User Roles

Roles are assigned at registration and stored in both `profiles.role` and Supabase Auth `app_metadata`. The role cannot be changed by the user after registration.

| Role | Routes |
|---|---|
| `CLIENT` | `/client/*` |
| `SPEAKER` | `/speaker/*` |

Attempting to access the wrong role's routes redirects to the correct dashboard automatically.

---

## Booking Status Flow

```
PENDING → CONFIRMED → DEPOSIT_PAID → COMPLETED
        ↘ DECLINED
```

| Status | Meaning |
|---|---|
| `PENDING` | Client submitted the request, awaiting speaker response |
| `CONFIRMED` | Speaker accepted the booking |
| `DEPOSIT_PAID` | Payment milestone recorded |
| `COMPLETED` | Event has been delivered |
| `DECLINED` | Speaker declined the request |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push to your fork: `git push origin feature/your-feature`
5. Open a pull request

Please ensure `npm run build` passes with no errors before submitting a PR.

---

## License

MIT — see [LICENSE](LICENSE) for details.
