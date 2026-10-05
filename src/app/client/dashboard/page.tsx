import { redirect } from "next/navigation";
import Link from "next/link";
import { Search, CalendarCheck, TrendingUp, DollarSign } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/auth/session";
import { createLogger } from "@/lib/logger";
import { TopBar } from "@/components/layout/TopBar";
import { BookingStatusBadge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { formatZAR } from "@/lib/utils/currency";
import { BOOKING_LIST_COLUMNS, formatDateSAST } from "@/lib/utils/booking";
import { isSpeakerListable } from "@/lib/utils/profile-completeness";
import type { Booking, BookingStatus, SpeakerProfile } from "@/lib/types/database";

const log = createLogger("client-dashboard");

/** Everything still in flight — PAID included: the event has not happened yet. */
const ACTIVE_STATUSES: BookingStatus[] = ["PENDING", "CONFIRMED", "PAID", "DEPOSIT_PAID"];

/** What the listability rule reads, plus what the widget shows. No email/phone. */
const SPEAKER_WIDGET_COLUMNS =
  "id, title, speaking_fee_zar, status, bio, expertise, languages, location, photo_urls, avg_rating, " +
  "profiles(id, full_name, avatar_url)";

/**
 * The greeting used to be hardcoded to "Good morning", so it was wrong for
 * two thirds of the day. Rendered server-side, so the hour is pinned to SAST
 * rather than the deploy region's clock.
 */
function greeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-ZA", {
      hour: "numeric",
      hour12: false,
      timeZone: "Africa/Johannesburg",
    }).format(new Date())
  );

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function ClientDashboardPage() {
  const profile = await getMyProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();

  // The recent-bookings list is capped at 5 for display, but the headline
  // stats must cover the client's whole history — computing them from the
  // same truncated list under-reported "Events Completed" and "Total Spent"
  // for anyone with more than five bookings.
  const [recentRes, historyRes, speakersRes] = await Promise.all([
    supabase
      .from("bookings")
      .select(`${BOOKING_LIST_COLUMNS}, speaker_profiles(id, profiles(id, full_name, avatar_url))`)
      .eq("client_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("bookings").select("status, quoted_fee_zar").eq("client_id", profile.id),
    // Not `.limit(4)`, and no separate head-count: incomplete profiles are
    // filtered out below, so limiting in SQL would under-fill the widget and
    // a `head: true` count would still include the hidden speakers.
    supabase
      .from("speaker_profiles")
      .select(SPEAKER_WIDGET_COLUMNS)
      .eq("status", "ACTIVE")
      .eq("available", true)
      .order("avg_rating", { ascending: false }),
  ]);

  if (recentRes.error) log.error("Could not load recent bookings", { cause: recentRes.error });
  if (historyRes.error) log.error("Could not load booking history", { cause: historyRes.error });
  if (speakersRes.error) log.error("Could not load speakers", { cause: speakersRes.error });

  const bookings = (recentRes.data ?? []) as unknown as Booking[];
  // Same listability rule as /client/discover — see getSpeakers.
  const speakers = ((speakersRes.data ?? []) as unknown as SpeakerProfile[]).filter((sp) => isSpeakerListable(sp));
  const speakerCount = speakers.length;
  const history = (historyRes.data ?? []) as Pick<Booking, "status" | "quoted_fee_zar">[];

  const activeBookings    = history.filter((b) => ACTIVE_STATUSES.includes(b.status)).length;
  const completedBookings = history.filter((b) => b.status === "COMPLETED").length;
  const totalSpent        = history.filter((b) => b.status === "COMPLETED").reduce((sum: number, b) => sum + Number(b.quoted_fee_zar), 0);

  const stats = [
    // Not orange: a stat tile is not a thing you click. See docs/DESIGN.md.
    { label: "Active Bookings",    value: String(activeBookings),    icon: CalendarCheck, color: "var(--color-secondary)" },
    { label: "Events Completed",   value: String(completedBookings), icon: TrendingUp,    color: "var(--color-secondary)" },
    { label: "Total Spent",        value: formatZAR(totalSpent),     icon: DollarSign,    color: "var(--color-primary)", money: true },
    { label: "Speakers Available", value: String(speakerCount),      icon: Search,        color: "var(--color-secondary)" },
  ];

  return (
    <div>
      <TopBar
        title={`${greeting()}, ${profile.full_name?.split(" ")[0] ?? "there"}`}
        subtitle="Here's what's happening with your bookings"
      />

      <div className="p-4 sm:p-6 space-y-8">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-line rounded-[8px] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <h2 className="font-archivo font-bold text-primary">Recent Bookings</h2>
              <Link href="/client/bookings" className={buttonClasses({ variant: "ghost", size: "sm" })}>
                View all
              </Link>
            </div>
            {bookings.length === 0 ? (
              <div className="text-center py-12">
                <CalendarCheck size={32} className="text-line mx-auto mb-3" />
                <p className="font-archivo text-muted">No bookings yet</p>
                <p className="text-sm text-muted mt-1">Find a speaker to get started</p>
                <Link href="/client/discover" className={buttonClasses({ variant: "gold", size: "sm", className: "mt-4" })}>
                  Find Speakers
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-line">
                {bookings.map((booking: Booking) => (
                  <Link key={booking.id} href={`/client/bookings/${booking.id}`} className="block">
                    <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-soft transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-ink truncate">{booking.event_name}</p>
                        <p className="text-xs text-muted mt-0.5">
                          {booking.speaker_profiles?.profiles?.full_name ?? "Speaker"} ·{" "}
                          {formatDateSAST(booking.event_date)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <BookingStatusBadge status={booking.status} />
                        <p className="text-xs font-space-mono font-bold text-ink mt-1">{formatZAR(booking.quoted_fee_zar)}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-white border border-line rounded-[8px] p-5">
              <h2 className="font-archivo font-bold text-primary mb-4">Quick Actions</h2>
              <div className="space-y-2">
                <Link
                  href="/client/discover"
                  className={buttonClasses({ variant: "gold", className: "w-full justify-start gap-3" })}
                >
                  <Search size={16} aria-hidden="true" /> Find Speakers
                </Link>
                <Link
                  href="/client/bookings"
                  className={buttonClasses({ variant: "outline", className: "w-full justify-start gap-3" })}
                >
                  <CalendarCheck size={16} aria-hidden="true" /> View Bookings
                </Link>
              </div>
            </div>

            {speakers.length > 0 && (
              <div className="bg-white border border-line rounded-[8px] overflow-hidden">
                <div className="px-5 py-4 border-b border-line">
                  <h2 className="font-archivo font-bold text-primary">Top Speakers</h2>
                </div>
                <div className="divide-y divide-line">
                  {speakers.slice(0, 3).map((sp: SpeakerProfile) => (
                    <Link key={sp.id} href="/client/discover" className="block">
                      <div className="flex items-center gap-3 px-4 py-3 hover:bg-soft transition-colors">
                        <div className="w-9 h-9 rounded-[4px] bg-secondary/20 flex items-center justify-center text-sm font-bold text-secondary shrink-0">
                          {sp.profiles?.full_name?.charAt(0) ?? "S"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink truncate">{sp.profiles?.full_name}</p>
                          <p className="text-xs text-muted truncate">{sp.title}</p>
                        </div>
                        <p className="text-xs font-space-mono font-bold text-secondary shrink-0">{formatZAR(sp.speaking_fee_zar)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
