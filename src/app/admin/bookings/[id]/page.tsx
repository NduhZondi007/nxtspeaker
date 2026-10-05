import type { Metadata } from "next";
import { cache, type ReactNode } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageSquare, XCircle, CheckCircle, Trophy, Ban } from "lucide-react";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { createLogger } from "@/lib/logger";
import { TopBar } from "@/components/layout/TopBar";
import { BookingStatusBadge } from "@/components/ui/Badge";
import { ActionButton } from "@/components/ui/ActionButton";
import type { ButtonVariant } from "@/components/ui/Button";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { HospitalityRiderView } from "@/components/bookings/HospitalityRiderView";
import { adminUpdateBookingStatus, adminSendMessage } from "@/app/actions/admin";
import { formatZAR } from "@/lib/utils/currency";
import { BOOKING_DETAIL_COLUMNS, adminTransitionsFrom, formatDateSAST } from "@/lib/utils/booking";
import type { Booking, BookingStatus, Message, Profile } from "@/lib/types/database";

const log = createLogger("admin-booking-page");

interface Props {
  params: Promise<{ id: string }>;
}

/** Shared by generateMetadata and the page: one booking query per request. */
const getAdminBooking = cache(async (id: string): Promise<Booking | null> => {
  if (!z.string().uuid().safeParse(id).success) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `${BOOKING_DETAIL_COLUMNS}, profiles(id, full_name, avatar_url), speaker_profiles(id, profiles(id, full_name, avatar_url))`
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    log.error("Could not load booking", { id, cause: error });
    throw new Error("Could not load this booking. Please try again.");
  }
  return (data as unknown as Booking) ?? null;
});

/**
 * How each allowed admin transition is offered. Only targets returned by
 * adminTransitionsFrom() are rendered, so the UI can never offer a move the
 * action would refuse. One orange button per section (DESIGN.md).
 */
const TRANSITION_UI: Partial<
  Record<BookingStatus, { label: string; icon: ReactNode; variant: ButtonVariant; confirm?: string; reason?: string }>
> = {
  CONFIRMED: { label: "Confirm", icon: <CheckCircle size={13} aria-hidden="true" />, variant: "gold" },
  COMPLETED: {
    label: "Mark Completed",
    icon: <Trophy size={13} aria-hidden="true" />,
    variant: "primary",
    confirm: "Mark completed? This starts the speaker's payout hold.",
  },
  DECLINED: {
    label: "Decline",
    icon: <Ban size={13} aria-hidden="true" />,
    variant: "outline",
    confirm: "Decline this request on the speaker's behalf?",
  },
  CANCELLED: {
    label: "Cancel Booking",
    icon: <XCircle size={13} aria-hidden="true" />,
    variant: "danger",
    confirm: "Cancel this booking? This cannot be undone.",
    reason: "Cancelled by administrator",
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const booking = await getAdminBooking(id);
  const title = booking?.event_name ?? "Booking Detail";
  return {
    title,
    description: `Admin view for booking ${booking?.booking_number ?? id} — ${title} on NxtSpeaker.`,
  };
}

export default async function AdminBookingDetailPage({ params }: Props) {
  const admin = await requireRole("ADMIN");
  const { id } = await params;

  const supabase = await createClient();
  // The thread does not depend on the booking row — fetch both at once.
  const [b, messagesRes] = await Promise.all([
    getAdminBooking(id),
    supabase
      .from("messages")
      .select("id, booking_id, sender_id, content, read_at, created_at, profiles(id, full_name, avatar_url, role)")
      .eq("booking_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (!b) notFound();
  if (messagesRes.error) log.error("Could not load messages", { id, cause: messagesRes.error });

  const { data: rider, error: riderError } = await supabase
    .from("hospitality_riders")
    .select("*")
    .eq("speaker_id", b.speaker_id)
    .maybeSingle();
  if (riderError) log.error("Could not load rider", { id, cause: riderError });

  const clientName = b.profiles?.full_name ?? "Client";
  const speakerName = b.speaker_profiles?.profiles?.full_name ?? "Speaker";
  const transitions = adminTransitionsFrom(b.status);

  return (
    <div>
      <TopBar title={b.event_name} subtitle={`Ref: ${b.booking_number}`}>
        <Link
          href="/admin/bookings"
          className="flex items-center gap-1.5 text-sm text-muted hover:text-primary transition-colors"
        >
          <ArrowLeft size={14} aria-hidden="true" /> Bookings
        </Link>
      </TopBar>

      <div className="p-4 sm:p-6 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Admin action bar */}
          <div className="bg-white border border-line rounded-[8px] p-4">
            <p className="text-xs font-space-mono font-semibold text-muted uppercase tracking-wide mb-3">Admin Actions</p>
            {transitions.length === 0 ? (
              <p className="text-sm text-muted">No status changes are available for this booking.</p>
            ) : (
              <div className="flex flex-wrap items-start gap-2">
                {transitions.map((to) => {
                  const ui = TRANSITION_UI[to];
                  if (!ui) return null;
                  return (
                    <ActionButton
                      key={to}
                      action={adminUpdateBookingStatus.bind(null, b.id, to, ui.reason)}
                      variant={ui.variant}
                      confirm={ui.confirm ? { message: ui.confirm, confirmLabel: `Yes, ${ui.label.toLowerCase()}` } : undefined}
                    >
                      {ui.icon} {ui.label}
                    </ActionButton>
                  );
                })}
              </div>
            )}
            {b.status === "PAID" && (
              <p className="text-xs text-muted mt-3">
                A paid booking is cancelled by refunding its payment from{" "}
                <Link href="/admin/payments" className="text-secondary font-semibold hover:underline">
                  Payments →
                </Link>
              </p>
            )}
          </div>

          {/* Booking details */}
          <div className="bg-white border border-line rounded-[8px] p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-archivo font-bold text-primary">Booking Details</h2>
              <BookingStatusBadge status={b.status} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              {[
                { label: "Client", value: clientName },
                { label: "Speaker", value: speakerName },
                { label: "Event Date", value: formatDateSAST(b.event_date) },
                { label: "Location", value: b.exact_location },
                { label: "Format", value: b.event_format },
                { label: "Duration", value: `${b.duration_minutes} minutes` },
                { label: "Organiser", value: b.event_organiser },
                { label: "Company", value: b.associated_company },
                { label: "Audience", value: b.audience_demographics },
                { label: "Booking Ref", value: b.booking_number },
              ].map((row) => (
                <div key={row.label}>
                  <p className="text-[10px] font-space-mono font-semibold text-muted uppercase tracking-wide">{row.label}</p>
                  <p className="text-ink mt-0.5">{row.value}</p>
                </div>
              ))}
              <div>
                <p className="text-[10px] font-space-mono font-semibold text-muted uppercase tracking-wide">Quoted Fee</p>
                <p className="font-space-mono text-xl font-bold text-ink mt-0.5">{formatZAR(b.quoted_fee_zar)}</p>
              </div>
              <div>
                <p className="text-[10px] font-space-mono font-semibold text-muted uppercase tracking-wide">Rider Agreed</p>
                <p className="text-ink mt-0.5">{b.hospitality_rider_agreed ? "✓ Yes" : "No"}</p>
              </div>
            </div>
            {b.client_notes && (
              <div className="mt-4 pt-4 border-t border-line">
                <p className="text-[10px] font-space-mono font-semibold text-muted uppercase tracking-wide mb-1">Client Notes</p>
                <p className="text-sm text-ink">{b.client_notes}</p>
              </div>
            )}
            {b.cancelled_reason && (
              <div className="mt-4 pt-4 border-t border-line">
                <p className="text-[10px] font-space-mono font-semibold text-muted uppercase tracking-wide mb-1">Cancellation Reason</p>
                <p className="text-sm text-ink">{b.cancelled_reason}</p>
              </div>
            )}
          </div>

          {rider && (
            <div className="bg-white border border-line rounded-[8px] p-5">
              <h2 className="font-archivo font-bold text-primary mb-4">Hospitality Rider</h2>
              <HospitalityRiderView rider={rider} speakerName={speakerName} />
            </div>
          )}
        </div>

        {/* Chat panel */}
        <div className="bg-white border border-line rounded-[8px] overflow-hidden flex flex-col min-h-[300px]">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-line">
            <MessageSquare size={16} className="text-secondary" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <h2 className="font-archivo font-bold text-primary truncate">Chat</h2>
              <p className="text-[10px] text-muted">{clientName} ↔ {speakerName}</p>
            </div>
          </div>
          <ChatPanel
            bookingId={b.id}
            status={b.status}
            initialMessages={(messagesRes.data ?? []) as unknown as Message[]}
            currentUser={admin as unknown as Profile}
            onSend={adminSendMessage}
          />
        </div>
      </div>
    </div>
  );
}
