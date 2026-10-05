import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarCheck, Clock, CheckCircle, Wallet, ChevronRight, EyeOff, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile, getMySpeakerProfileId } from "@/lib/auth/session";
import { createLogger } from "@/lib/logger";
import { TopBar } from "@/components/layout/TopBar";
import { BookingStatusBadge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { ActionButton } from "@/components/ui/ActionButton";
import { StatCard } from "@/components/ui/StatCard";
import { formatZAR, formatZARCents } from "@/lib/utils/currency";
import { formatDateSAST, todayInSAST } from "@/lib/utils/booking";
import { updateBookingStatus } from "@/app/actions/bookings";
import { getProfileCompleteness } from "@/lib/utils/profile-completeness";
import type { Booking, BookingStatus } from "@/lib/types/database";

const log = createLogger("speaker-dashboard");

/** Accepted and still to happen, whether or not the client has paid yet. */
const UPCOMING_STATUSES: BookingStatus[] = ["CONFIRMED", "PAID", "DEPOSIT_PAID"];
const ROW_COLUMNS =
  "id, event_name, event_date, event_format, exact_location, status, quoted_fee_zar, profiles(id, full_name)";

export default async function SpeakerDashboardPage() {
  const profile = await getMyProfile();
  if (!profile) redirect("/login");

  const speakerProfileId = await getMySpeakerProfileId();
  const supabase = await createClient();
  const today = todayInSAST();

  const { data: speakerProfile, error: spError } = speakerProfileId
    ? await supabase
        .from("speaker_profiles")
        .select("id, bio, expertise, location, speaking_fee_zar, languages, photo_urls, status")
        .eq("id", speakerProfileId)
        .maybeSingle()
    : { data: null, error: null };
  if (spError) log.error("Could not load speaker profile", { cause: spError });

  // Counts and short lists instead of every booking the speaker has ever had.
  // Guarded rather than falling back to `""`, which Postgres rejects for a
  // uuid column (22P02) instead of matching no rows.
  const [totalRes, pendingRes, upcomingCountRes, upcomingRes, deliverableRes, payoutsRes] = speakerProfileId
    ? await Promise.all([
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("speaker_id", speakerProfileId),
        supabase
          .from("bookings")
          .select(ROW_COLUMNS, { count: "exact" })
          .eq("speaker_id", speakerProfileId)
          .eq("status", "PENDING")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("speaker_id", speakerProfileId)
          .in("status", UPCOMING_STATUSES),
        supabase
          .from("bookings")
          .select(ROW_COLUMNS)
          .eq("speaker_id", speakerProfileId)
          .in("status", UPCOMING_STATUSES)
          .gte("event_date", today)
          .order("event_date", { ascending: true })
          .limit(3),
        // Paid events whose date has passed: these need "Mark delivered" to
        // start the payout hold.
        supabase
          .from("bookings")
          .select(ROW_COLUMNS)
          .eq("speaker_id", speakerProfileId)
          .eq("status", "PAID")
          .lte("event_date", today)
          .order("event_date", { ascending: true })
          .limit(10),
        // Net earnings: the speaker's share as recorded on payouts — never
        // the gross quoted fee, of which 15% is the platform's.
        supabase
          .from("payouts")
          .select("amount_cents")
          .eq("speaker_id", speakerProfileId)
          .eq("status", "PAID"),
      ])
    : [null, null, null, null, null, null];

  for (const res of [totalRes, pendingRes, upcomingCountRes, upcomingRes, deliverableRes, payoutsRes]) {
    if (res?.error) log.error("Dashboard query failed", { cause: res.error });
  }

  const pending = (pendingRes?.data ?? []) as unknown as Booking[];
  const upcoming = (upcomingRes?.data ?? []) as unknown as Booking[];
  const deliverable = (deliverableRes?.data ?? []) as unknown as Booking[];
  const paidOutCents = (payoutsRes?.data ?? []).reduce(
    (sum: number, p: { amount_cents: number | string }) => sum + Number(p.amount_cents),
    0
  );

  // One shared definition with the client-facing listing rule, so the number
  // shown here can never disagree with whether the speaker is actually visible.
  const { percent: completeness, isComplete, missing } = getProfileCompleteness(speakerProfile, profile);

  const stats = [
    { label: "Total Bookings",   value: String(totalRes?.count ?? 0),         icon: CalendarCheck, color: "var(--color-secondary)" },
    // Not orange: a stat tile is not a thing you click. See docs/DESIGN.md.
    { label: "Pending Requests", value: String(pendingRes?.count ?? 0),       icon: Clock,         color: "var(--color-primary)" },
    { label: "Confirmed Events", value: String(upcomingCountRes?.count ?? 0), icon: CheckCircle,   color: "var(--color-secondary)" },
    { label: "Net Paid Out",     value: formatZARCents(paidOutCents),          icon: Wallet,        color: "var(--color-success)", money: true },
  ];

  return (
    <div>
      <TopBar
        title={`Welcome, ${profile.full_name?.split(" ")[0] ?? "Speaker"}`}
        subtitle="Manage your bookings and profile"
      />

      <div className="p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>

        {deliverable.length > 0 && (
          <div className="bg-white border border-line rounded-[8px] overflow-hidden">
            <div className="px-5 py-4 border-b border-line">
              <h2 className="font-archivo font-bold text-primary">Events to mark delivered</h2>
              <p className="text-xs text-muted mt-0.5">
                Your payout is released 7 days after you confirm an event went ahead.
              </p>
            </div>
            <div className="divide-y divide-line">
              {deliverable.map((b) => (
                <div key={b.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink truncate">{b.event_name}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {b.profiles?.full_name ?? "Client"} · {formatDateSAST(b.event_date)}
                    </p>
                  </div>
                  <ActionButton
                    action={updateBookingStatus.bind(null, b.id, "COMPLETED")}
                    variant="gold"
                    confirm={{ message: "Confirm this event was delivered?", confirmLabel: "Yes, mark delivered" }}
                  >
                    <Trophy size={12} aria-hidden="true" /> Mark delivered
                  </ActionButton>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-line rounded-[8px] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <h2 className="font-archivo font-bold text-primary">
                Incoming Requests
                {pending.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-secondary/15 text-secondary rounded-full">
                    {pendingRes?.count ?? pending.length}
                  </span>
                )}
              </h2>
              <Link href="/speaker/bookings" className={buttonClasses({ variant: "ghost", size: "sm" })}>
                View all
              </Link>
            </div>

            {pending.length === 0 ? (
              <div className="text-center py-10">
                <Clock size={28} className="text-line mx-auto mb-3" aria-hidden="true" />
                <p className="font-archivo text-muted">No pending requests</p>
              </div>
            ) : (
              <div className="divide-y divide-line">
                {pending.map((booking) => (
                  <div key={booking.id} className="px-5 py-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-ink">{booking.event_name}</p>
                        <p className="text-xs text-muted mt-0.5">
                          {booking.profiles?.full_name ?? "Client"} · {formatDateSAST(booking.event_date)}
                        </p>
                        <p className="text-xs text-muted">{booking.exact_location} · {booking.event_format}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-space-mono font-bold text-ink">{formatZAR(booking.quoted_fee_zar)}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-start gap-2 mt-3">
                      <ActionButton action={updateBookingStatus.bind(null, booking.id, "CONFIRMED")} variant="gold">
                        Accept
                      </ActionButton>
                      <ActionButton
                        action={updateBookingStatus.bind(null, booking.id, "DECLINED")}
                        variant="outline"
                        confirm={{ message: "Decline this request?", confirmLabel: "Yes, decline" }}
                      >
                        Decline
                      </ActionButton>
                      <Link
                        href={`/speaker/bookings/${booking.id}`}
                        className={buttonClasses({ variant: "ghost", size: "sm" })}
                      >
                        View <ChevronRight size={12} aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-white border border-line rounded-[8px] p-5">
              <h2 className="font-archivo font-bold text-primary mb-3">Profile Completeness</h2>
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="flex-1 h-2 bg-soft rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={completeness}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Profile completeness"
                >
                  <div
                    className="h-full rounded-full transition-all bg-linear-to-r from-secondary to-primary"
                    style={{ width: `${completeness}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-secondary">{completeness}%</span>
              </div>

              {/* Without this, a speaker held back by the listing rule has no
                  way to discover they are invisible to clients, or why. */}
              {!isComplete && (
                <div className="mt-3 rounded-[8px] border border-secondary/30 bg-secondary/5 p-3">
                  <div className="flex items-start gap-2">
                    <EyeOff size={14} className="text-secondary shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-ink">
                        Your profile is not visible to clients yet
                      </p>
                      <p className="text-[11px] text-muted mt-0.5">
                        Profiles appear in search once they are 100% complete. Still to add:
                      </p>
                      <ul className="mt-1.5 space-y-0.5">
                        {missing.map((field) => (
                          <li key={field.key} className="text-[11px] text-ink flex items-start gap-1.5">
                            <span className="text-secondary leading-none" aria-hidden="true">•</span>
                            {field.label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {isComplete && (
                <p className="text-[11px] text-success mt-2">
                  ✓ Your profile is live and visible to clients.
                </p>
              )}

              {!isComplete && (
                <Link
                  href="/speaker/profile"
                  className={buttonClasses({ variant: "outline", size: "sm", className: "w-full mt-3" })}
                >
                  Complete Profile
                </Link>
              )}
            </div>

            <div className="bg-white border border-line rounded-[8px] overflow-hidden">
              <div className="px-5 py-4 border-b border-line">
                <h2 className="font-archivo font-bold text-primary">Upcoming Events</h2>
              </div>
              {upcoming.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-muted">No upcoming events</p>
                </div>
              ) : (
                <div className="divide-y divide-line">
                  {upcoming.map((b) => (
                    <Link key={b.id} href={`/speaker/bookings/${b.id}`} className="block">
                      <div className="flex items-center gap-3 px-4 py-3 hover:bg-soft transition-colors">
                        <div className="w-9 h-9 rounded-[4px] bg-secondary/10 flex flex-col items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-secondary">
                            {formatDateSAST(b.event_date, { month: "short" }).toUpperCase()}
                          </span>
                          <span className="text-sm font-bold text-ink leading-none">
                            {formatDateSAST(b.event_date, { day: "numeric" })}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink truncate">{b.event_name}</p>
                          <p className="text-xs text-muted truncate">{b.exact_location}</p>
                        </div>
                        <BookingStatusBadge status={b.status} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
