# UI kit — NXT Speaker client portal

Interactive recreation of the signed-in client app. Open `index.html`.

Click through: Dashboard → Find Speakers → filter → open a speaker sheet → Request booking →
3-step wizard → Send request → lands on My Bookings with the success toast.

## Screens and their sources

| Screen | Repo source |
|---|---|
| Dashboard | `src/app/client/dashboard/page.tsx` (stat cards with the gradient top rule, recent bookings list, quick actions, top speakers) |
| Find Speakers | `src/app/client/discover/DiscoverClient.tsx` + `components/speakers/SpeakerFilters.tsx`, `SpeakerCard.tsx` |
| Speaker sheet | `src/components/speakers/SpeakerModal.tsx` |
| Booking wizard | `src/components/bookings/BookingForm.tsx` (3 steps: event, logistics, hospitality rider) |
| My Bookings | `src/app/client/bookings/page.tsx` + `components/ui/Badge.tsx` |
| Shell | `src/components/layout/Sidebar.tsx`, `TopBar.tsx` |

## Deliberate abbreviations

- 8 speakers and 5 bookings stand in for full data sets.
- Supabase queries, auth and realtime are replaced with fixtures — this is a visual/interaction kit.
- Booking-wizard field list is representative; the real `BookingForm` collects more logistics fields.
- No speaker photography was supplied, so cards use the app's navy-initial fallback.

The speaker and admin portals are not in this kit — see the caveats in the root `README.md`.
