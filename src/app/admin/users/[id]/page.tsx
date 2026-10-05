import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, ShieldOff, CalendarCheck } from "lucide-react";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { createLogger } from "@/lib/logger";
import { TopBar } from "@/components/layout/TopBar";
import { BookingStatusBadge } from "@/components/ui/Badge";
import { ActionButton } from "@/components/ui/ActionButton";
import { promoteToAdmin, revokeAdmin } from "@/app/actions/admin";
import { formatZAR } from "@/lib/utils/currency";
import { BOOKING_LIST_COLUMNS, formatDateSAST } from "@/lib/utils/booking";
import type { Profile, Booking } from "@/lib/types/database";

const log = createLogger("admin-user-page");

interface Props {
  params: Promise<{ id: string }>;
}

/** Shared by generateMetadata and the page. */
const getUserProfile = cache(async (id: string): Promise<Profile | null> => {
  if (!z.string().uuid().safeParse(id).success) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, company, role, base_role, avatar_url, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    log.error("Could not load user", { id, cause: error });
    throw new Error("Could not load this user. Please try again.");
  }
  return (data as Profile) ?? null;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const user = await getUserProfile(id);
  const name = user?.full_name ?? "User";
  return {
    title: name,
    description: `Admin profile for ${name}${user?.role ? ` (${user.role})` : ""} on NxtSpeaker.`,
  };
}

export default async function AdminUserDetailPage({ params }: Props) {
  const admin = await requireRole("ADMIN");
  const { id } = await params;

  const supabase = await createClient();
  // Previously three serial round trips (profile, then speaker id, then
  // bookings). The speaker's bookings are filtered through an inner join on
  // speaker_profiles.user_id, so all three run at once.
  const [u, clientRes, speakerRes] = await Promise.all([
    getUserProfile(id),
    supabase
      .from("bookings")
      .select(BOOKING_LIST_COLUMNS)
      .eq("client_id", id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("bookings")
      .select(`${BOOKING_LIST_COLUMNS}, speaker_profiles!inner(user_id)`)
      .eq("speaker_profiles.user_id", id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  if (!u) notFound();
  if (clientRes.error) log.error("Could not load client bookings", { id, cause: clientRes.error });
  if (speakerRes.error) log.error("Could not load speaker bookings", { id, cause: speakerRes.error });

  const isSelf = admin.id === id;
  const bookings = [...(clientRes.data ?? []), ...(speakerRes.data ?? [])] as unknown as Booking[];

  return (
    <div>
      <TopBar title={u.full_name} subtitle={u.email}>
        <Link
          href="/admin/users"
          className="flex items-center gap-1.5 text-sm text-muted hover:text-primary transition-colors"
        >
          <ArrowLeft size={14} aria-hidden="true" /> Users
        </Link>
      </TopBar>

      <div className="p-4 sm:p-6 grid lg:grid-cols-3 gap-6">
        {/* Profile card */}
        <div className="space-y-4">
          <div className="bg-white border border-line rounded-[8px] p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center" aria-hidden="true">
                <span className="text-lg font-bold text-secondary">{u.full_name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <p className="font-archivo font-bold text-primary truncate">{u.full_name}</p>
                <p className="text-xs text-muted truncate">{u.email}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              {[
                { label: "Role", value: u.role },
                { label: "Base Role", value: u.base_role ?? "—" },
                { label: "Company", value: u.company ?? "—" },
                { label: "Phone", value: u.phone ?? "—" },
                { label: "Joined", value: formatDateSAST(u.created_at) },
              ].map((row) => (
                <div key={row.label} className="flex justify-between">
                  <span className="text-muted">{row.label}</span>
                  <span className="font-medium text-ink">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {!isSelf && (
            <div className="bg-white border border-line rounded-[8px] p-5">
              <h3 className="font-archivo font-bold text-primary mb-3">Role Management</h3>
              {u.role !== "ADMIN" ? (
                <ActionButton
                  action={promoteToAdmin.bind(null, id)}
                  variant="primary"
                  size="md"
                  fullWidth
                  confirm={{ message: `Make ${u.full_name} an admin?`, confirmLabel: "Yes, promote" }}
                >
                  <ShieldCheck size={15} aria-hidden="true" /> Promote to Admin
                </ActionButton>
              ) : (
                <ActionButton
                  action={revokeAdmin.bind(null, id)}
                  variant="danger"
                  size="md"
                  fullWidth
                  confirm={{ message: `Revoke ${u.full_name}'s admin access?`, confirmLabel: "Yes, revoke" }}
                >
                  <ShieldOff size={15} aria-hidden="true" /> Revoke Admin Access
                </ActionButton>
              )}
              {u.role === "ADMIN" && (
                <p className="text-[10px] text-muted mt-2 text-center">
                  Revoking admin will restore their {u.base_role ?? "original"} role.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Booking history */}
        <div className="lg:col-span-2 bg-white border border-line rounded-[8px] overflow-hidden">
          <div className="px-5 py-4 border-b border-line flex items-center gap-2">
            <CalendarCheck size={16} className="text-secondary" aria-hidden="true" />
            <h2 className="font-archivo font-bold text-primary">Booking History</h2>
          </div>
          {bookings.length === 0 ? (
            <div className="text-center py-12">
              <CalendarCheck size={28} className="text-line mx-auto mb-3" aria-hidden="true" />
              <p className="font-archivo text-muted">No bookings found</p>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {bookings.map((b) => (
                <Link key={b.id} href={`/admin/bookings/${b.id}`} className="block">
                  <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-soft transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">{b.event_name}</p>
                      <p className="text-xs text-muted mt-0.5">
                        {formatDateSAST(b.event_date)} · {b.event_format}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <BookingStatusBadge status={b.status} />
                      <p className="font-space-mono font-bold text-ink text-xs mt-1">{formatZAR(b.quoted_fee_zar)}</p>
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
