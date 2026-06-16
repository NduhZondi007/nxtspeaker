import { redirect } from "next/navigation";
import Link from "next/link";
import { Users2, Mic2, CalendarCheck, DollarSign, Eye, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";
import { BookingStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatZAR } from "@/lib/utils/currency";
import type { Booking, Profile } from "@/lib/types/database";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { count: userCount },
    { count: speakerCount },
    { count: bookingCount },
    { data: rawBookings },
    { data: recentUsers },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("speaker_profiles").select("*", { count: "exact", head: true }).eq("status", "ACTIVE"),
    supabase.from("bookings").select("*", { count: "exact", head: true }),
    supabase
      .from("bookings")
      .select("*, profiles(*), speaker_profiles(*, profiles(*))")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const bookings = (rawBookings ?? []) as Booking[];
  const users = (recentUsers ?? []) as Profile[];

  const revenue = bookings
    .filter((b) => b.status === "COMPLETED")
    .reduce((sum, b) => sum + Number(b.quoted_fee_zar), 0);

  const stats = [
    { label: "Total Users", value: String(userCount ?? 0), icon: Users2, color: "#8C7CA8" },
    { label: "Active Speakers", value: String(speakerCount ?? 0), icon: Mic2, color: "#C9A96E" },
    { label: "Total Bookings", value: String(bookingCount ?? 0), icon: CalendarCheck, color: "#6B9E78" },
    { label: "Platform Revenue", value: formatZAR(revenue), icon: DollarSign, color: "#A88C7C" },
  ];

  return (
    <div>
      <TopBar title="Admin Dashboard" subtitle="Platform overview" />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-white border border-warm-gray rounded-2xl p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, ${stat.color}, transparent)` }} />
                <Icon size={20} style={{ color: stat.color }} className="mb-3" />
                <p className="font-cormorant text-2xl font-bold text-ink">{stat.value}</p>
                <p className="text-xs text-mid-gray mt-0.5">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* View as portal */}
        <div className="bg-white border border-gold/30 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <Eye size={16} className="text-gold" />
            <p className="text-sm font-semibold text-ink">View application as</p>
          </div>
          <p className="text-xs text-mid-gray mb-4">
            Browse the platform from a user perspective. Your admin role is preserved — return here any time via the sidebar.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/client/dashboard">
              <Button variant="outline" size="sm" className="gap-2">
                <Users2 size={14} /> Client Portal
              </Button>
            </Link>
            <Link href="/speaker/dashboard">
              <Button variant="outline" size="sm" className="gap-2">
                <Mic2 size={14} /> Speaker Portal
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent bookings */}
          <div className="lg:col-span-2 bg-white border border-warm-gray rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-warm-gray">
              <h2 className="font-cormorant text-lg font-semibold text-ink">Recent Bookings</h2>
              <Link href="/admin/bookings">
                <Button variant="ghost" size="sm">View all</Button>
              </Link>
            </div>
            {bookings.length === 0 ? (
              <div className="text-center py-10">
                <CalendarCheck size={28} className="text-warm-gray mx-auto mb-3" />
                <p className="font-cormorant text-lg text-mid-gray">No bookings yet</p>
              </div>
            ) : (
              <div className="divide-y divide-warm-gray">
                {bookings.map((b: Booking) => (
                  <Link key={b.id} href={`/admin/bookings/${b.id}`}>
                    <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-cream/60 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-charcoal truncate">{b.event_name}</p>
                        <p className="text-xs text-mid-gray mt-0.5">
                          {b.profiles?.full_name ?? "Client"} → {b.speaker_profiles?.profiles?.full_name ?? "Speaker"} ·{" "}
                          {new Date(b.event_date).toLocaleDateString("en-ZA")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <BookingStatusBadge status={b.status} />
                        <ChevronRight size={14} className="text-mid-gray" />
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
            <div className="bg-white border border-warm-gray rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-warm-gray">
                <h2 className="font-cormorant text-lg font-semibold text-ink">Recent Users</h2>
                <Link href="/admin/users">
                  <Button variant="ghost" size="sm">View all</Button>
                </Link>
              </div>
              <div className="divide-y divide-warm-gray">
                {users.map((u: Profile) => (
                  <Link key={u.id} href={`/admin/users/${u.id}`}>
                    <div className="flex items-center gap-3 px-4 py-3 hover:bg-cream/60 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-gold">{u.full_name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-charcoal truncate">{u.full_name}</p>
                        <p className="text-xs text-mid-gray truncate">{u.role}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Quick actions */}
            <div className="bg-white border border-warm-gray rounded-2xl p-5">
              <h2 className="font-cormorant text-lg font-semibold text-ink mb-3">Quick Actions</h2>
              <div className="space-y-2">
                <Link href="/admin/users" className="block">
                  <Button variant="outline" className="w-full justify-start gap-2" size="sm">
                    <Users2 size={14} /> Manage Users
                  </Button>
                </Link>
                <Link href="/admin/bookings" className="block">
                  <Button variant="outline" className="w-full justify-start gap-2" size="sm">
                    <CalendarCheck size={14} /> All Bookings
                  </Button>
                </Link>
                <Link href="/admin/speakers" className="block">
                  <Button variant="gold" className="w-full justify-start gap-2" size="sm">
                    <Mic2 size={14} /> Manage Speakers
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
