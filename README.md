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

- Node.js 18+
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
NEXT_PUBLIC_APP_URL=http://localhost:3000
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
└── proxy.ts                 # Next.js 16 proxy (session refresh on every request)
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

Go to [vercel.com/new](https://vercel.com/new), import your repository. Next.js is auto-detected — no extra configuration needed.

### 3. Add environment variables

In **Settings → Environment Variables** on the Vercel dashboard, add:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous (publishable) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `NEXT_PUBLIC_APP_URL` | Your Vercel deployment URL, e.g. `https://nxtspeaker.vercel.app` |

### 4. Update Supabase Auth for production

In **Authentication → URL Configuration** in your Supabase dashboard:

- **Site URL** → `https://your-app.vercel.app`
- **Redirect URLs** → add `https://your-app.vercel.app/auth/callback`

Deploy. Done.

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
