import Link from "next/link";
import { Users2, Mic2, CalendarCheck, DollarSign, Wallet, Eye, ChevronRight } from "lucide-react";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { createLogger } from "@/lib/logger";
import { TopBar } from "@/components/layout/TopBar";
import { BookingStatusBadge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { formatZARCents } from "@/lib/utils/currency";
import { formatDateSAST } from "@/lib/utils/booking";
import type { Booking, Profile } from "@/lib/types/database";

const log = createLogger("admin-dashboard");

/** Row shape of `admin_money_totals()` — bigint cents, possibly as strings. */
interface MoneyTotals {
  collected: number | string;
  commission: number | string;
  owed: number | string;
  refunded: number | string;
  payouts_open: number | string;
  payouts_paid: number | string;
}

export default async function AdminDashboardPage() {
  await requireRole("ADMIN");

  const supabase = await createClient();
  const service = createServiceClient();

  const [usersRes, speakersRes, bookingsCountRes, recentBookingsRes, recentUsersRes, moneyRes] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("speaker_profiles").select("id", { count: "exact", head: true }).eq("status", "ACTIVE"),
    supabase.from("bookings").select("id", { count: "exact", head: true }),
    supabase
      .from("bookings")
      .select("id, event_name, event_date, status, profiles(id, full_name), speaker_profiles(id, profiles(id, full_name))")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("profiles")
      .select("id, full_name, role")
      .order("created_at", { ascending: false })
      .limit(5),
    // Revenue is the platform's commission on payments actually captured —
    // not gross booking value, which is the speakers' money passing through.
    // Aggregated in SQL rather than fetching every payment and payout row.
    service.rpc("admin_money_totals"),
  ]);

  for (const res of [usersRes, speakersRes, bookingsCountRes, recentBookingsRes, recentUsersRes]) {
    if (res.error) log.error("Dashboard query failed", { cause: res.error });
  }
  if (moneyRes.error) log.error("admin_money_totals failed", { cause: moneyRes.error });

  const bookings = (recentBookingsRes.data ?? []) as unknown as Booking[];
  const users = (recentUsersRes.data ?? []) as Pick<Profile, "id" | "full_name" | "role">[];

  // A set-returning function arrives as an array; a json one as an object.
  const totals = (Array.isArray(moneyRes.data) ? moneyRes.data[0] : moneyRes.data) as MoneyTotals | null;
  // A failed aggregate shows a dash, never a misleading R 0.00.
  const money = (value: number | string | undefined) =>
    moneyRes.error || !totals || value === undefined ? "—" : formatZARCents(Number(value));

  const stats = [
    { label: "Total Users",       value: String(usersRes.count ?? 0),         icon: Users2,        color: "var(--color-secondary)" },
    // Not orange: a stat tile is not a thing you click. See docs/DESIGN.md.
    { label: "Active Speakers",   value: String(speakersRes.count ?? 0),      icon: Mic2,          color: "var(--color-secondary)" },
    { label: "Total Bookings",    value: String(bookingsCountRes.count ?? 0), icon: CalendarCheck, color: "var(--color-primary)" },
    { label: "Commission Earned", value: money(totals?.commission),           icon: DollarSign,    color: "var(--color-success)", money: true },
    // Under escrow this is the number that matters for solvency: money the
    // platform is holding that belongs to somebody else.
    { label: "Owed to Speakers",  value: money(totals?.owed),                 icon: Wallet,        color: "var(--color-secondary)", money: true },
  ];

  return (
    <div>
      <TopBar title="Admin Dashboard" subtitle="Platform overview" />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>

        {/* View as portal */}
        <div className="bg-white border border-secondary/30 rounded-[8px] p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <Eye size={16} className="text-secondary" aria-hidden="true" />
            <p className="text-sm font-semibold text-ink">View application as</p>
          </div>
          <p className="text-xs text-muted mb-4">
            Browse the platform from a user perspective. Your admin role is preserved — return here any time via the sidebar.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/client/dashboard" className={buttonClasses({ variant: "outline", size: "sm" })}>
              <Users2 size={14} aria-hidden="true" /> Client Portal
            </Link>
            <Link href="/speaker/dashboard" className={buttonClasses({ variant: "outline", size: "sm" })}>
              <Mic2 size={14} aria-hidden="true" /> Speaker Portal
            </Link>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent bookings */}
          <div className="lg:col-span-2 bg-white border border-line rounded-[8px] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <h2 className="font-archivo font-bold text-primary">Recent Bookings</h2>
              <Link href="/admin/bookings" className={buttonClasses({ variant: "ghost", size: "sm" })}>
                View all
              </Link>
            </div>
            {bookings.length === 0 ? (
              <div className="text-center py-10">
                <CalendarCheck size={28} className="text-line mx-auto mb-3" aria-hidden="true" />
                <p className="font-archivo text-muted">No bookings yet</p>
              </div>
            ) : (
              <div className="divide-y divide-line">
                {bookings.map((b) => (
                  <Link key={b.id} href={`/admin/bookings/${b.id}`} className="block">
                    <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-soft transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-ink truncate">{b.event_name}</p>
                        <p className="text-xs text-muted mt-0.5">
                          {b.profiles?.full_name ?? "Client"} → {b.speaker_profiles?.profiles?.full_name ?? "Speaker"} ·{" "}
                          {formatDateSAST(b.event_date)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <BookingStatusBadge status={b.status} />
                        <ChevronRight size={14} className="text-muted" aria-hidden="true" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Recent users */}
            <div className="bg-white border border-line rounded-[8px] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-line">
                <h2 className="font-archivo font-bold text-primary">Recent Users</h2>
                <Link href="/admin/users" className={buttonClasses({ variant: "ghost", size: "sm" })}>
                  View all
                </Link>
              </div>
              <div className="divide-y divide-line">
                {users.map((u) => (
                  <Link key={u.id} href={`/admin/users/${u.id}`} className="block">
                    <div className="flex items-center gap-3 px-4 py-3 hover:bg-soft transition-colors">
                      <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center shrink-0" aria-hidden="true">
                        <span className="text-xs font-bold text-secondary">{u.full_name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink truncate">{u.full_name}</p>
                        <p className="text-xs text-muted truncate">{u.role}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Quick actions */}
            <div className="bg-white border border-line rounded-[8px] p-5">
              <h2 className="font-archivo font-bold text-primary mb-3">Quick Actions</h2>
              <div className="space-y-2">
                <Link
                  href="/admin/users"
                  className={buttonClasses({ variant: "outline", size: "sm", className: "w-full justify-start gap-2" })}
                >
                  <Users2 size={14} aria-hidden="true" /> Manage Users
                </Link>
                <Link
                  href="/admin/bookings"
                  className={buttonClasses({ variant: "outline", size: "sm", className: "w-full justify-start gap-2" })}
                >
                  <CalendarCheck size={14} aria-hidden="true" /> All Bookings
                </Link>
                <Link
                  href="/admin/speakers"
                  className={buttonClasses({ variant: "gold", size: "sm", className: "w-full justify-start gap-2" })}
                >
                  <Mic2 size={14} aria-hidden="true" /> Manage Speakers
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
