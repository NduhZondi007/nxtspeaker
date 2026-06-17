import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, ShieldOff, CalendarCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";
import { BookingStatusBadge } from "@/components/ui/Badge";
import { promoteToAdmin, revokeAdmin } from "@/app/actions/admin";
import { formatZAR } from "@/lib/utils/currency";
import type { Profile, Booking } from "@/lib/types/database";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", id)
    .single();
  const name = data?.full_name ?? "User";
  return {
    title: name,
    description: `Admin profile for ${name}${data?.role ? ` (${data.role})` : ""} on NxtSpeaker.`,
  };
}

export default async function AdminUserDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) redirect("/login");

  const { data: rawUser } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (!rawUser) notFound();
  const u = rawUser as Profile;

  const [{ data: clientBookings }, { data: speakerBookings }] = await Promise.all([
    supabase
      .from("bookings")
      .select("*, speaker_profiles(*, profiles(*))")
      .eq("client_id", id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("bookings")
      .select("*, profiles(*)")
      .in(
        "speaker_id",
        await supabase
          .from("speaker_profiles")
          .select("id")
          .eq("user_id", id)
          .then(({ data }) => (data ?? []).map((s) => s.id))
      )
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const isSelf = currentUser.id === id;
  const bookings = ([...(clientBookings ?? []), ...(speakerBookings ?? [])]) as Booking[];

  return (
    <div>
      <TopBar title={u.full_name} subtitle={u.email}>
        <Link href="/admin/users">
          <button className="flex items-center gap-1.5 text-sm text-mid-gray hover:text-charcoal transition-colors">
            <ArrowLeft size={14} /> Users
          </button>
        </Link>
      </TopBar>

      <div className="p-4 sm:p-6 grid lg:grid-cols-3 gap-6">
        {/* Profile card */}
        <div className="space-y-4">
          <div className="bg-white border border-warm-gray rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center">
                <span className="text-lg font-bold text-gold">{u.full_name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <p className="font-cormorant text-lg font-semibold text-ink truncate">{u.full_name}</p>
                <p className="text-xs text-mid-gray truncate">{u.email}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              {[
                { label: "Role", value: u.role },
                { label: "Base Role", value: u.base_role ?? "—" },
                { label: "Company", value: u.company ?? "—" },
                { label: "Phone", value: u.phone ?? "—" },
                { label: "Joined", value: new Date(u.created_at).toLocaleDateString("en-ZA") },
              ].map((row) => (
                <div key={row.label} className="flex justify-between">
                  <span className="text-mid-gray">{row.label}</span>
                  <span className="font-medium text-charcoal">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Admin actions */}
          {!isSelf && (
            <div className="bg-white border border-warm-gray rounded-2xl p-5">
              <h3 className="font-cormorant text-base font-semibold text-ink mb-3">Role Management</h3>
              <div className="space-y-2">
                {u.role !== "ADMIN" ? (
                  <form action={async () => { "use server"; await promoteToAdmin(id); }}>
                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm bg-gold text-ink font-semibold rounded-xl hover:bg-gold/90 transition-colors"
                    >
                      <ShieldCheck size={15} /> Promote to Admin
                    </button>
                  </form>
                ) : (
                  <form action={async () => { "use server"; await revokeAdmin(id); }}>
                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm border border-danger/40 text-danger font-semibold rounded-xl hover:bg-danger/10 transition-colors"
                    >
                      <ShieldOff size={15} /> Revoke Admin Access
                    </button>
                  </form>
                )}
              </div>
              {u.role === "ADMIN" && (
                <p className="text-[10px] text-mid-gray mt-2 text-center">
                  Revoking admin will restore their {u.base_role ?? "original"} role.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Booking history */}
        <div className="lg:col-span-2 bg-white border border-warm-gray rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-warm-gray flex items-center gap-2">
            <CalendarCheck size={16} className="text-gold" />
            <h2 className="font-cormorant text-lg font-semibold text-ink">Booking History</h2>
          </div>
          {bookings.length === 0 ? (
            <div className="text-center py-12">
              <CalendarCheck size={28} className="text-warm-gray mx-auto mb-3" />
              <p className="font-cormorant text-lg text-mid-gray">No bookings found</p>
            </div>
          ) : (
            <div className="divide-y divide-warm-gray">
              {bookings.map((b: Booking) => (
                <Link key={b.id} href={`/admin/bookings/${b.id}`}>
                  <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-cream/60 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-charcoal truncate">{b.event_name}</p>
                      <p className="text-xs text-mid-gray mt-0.5">
                        {new Date(b.event_date).toLocaleDateString("en-ZA")} · {b.event_format}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <BookingStatusBadge status={b.status} />
                      <p className="text-xs font-semibold text-gold mt-1">{formatZAR(b.quoted_fee_zar)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
