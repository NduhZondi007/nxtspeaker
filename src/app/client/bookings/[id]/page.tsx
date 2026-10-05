import type { Metadata } from "next";
import { cache } from "react";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile, getSessionUser } from "@/lib/auth/session";
import { createLogger } from "@/lib/logger";
import { TopBar } from "@/components/layout/TopBar";
import { BookingStatusBadge } from "@/components/ui/Badge";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { HospitalityRiderView } from "@/components/bookings/HospitalityRiderView";
import { CancelBookingButton } from "@/components/bookings/CancelBookingButton";
import { formatZAR } from "@/lib/utils/currency";
import { BOOKING_DETAIL_COLUMNS, canClientCancel, formatDateSAST } from "@/lib/utils/booking";
import { sendMessage } from "@/app/actions/messages";
import { initiateBookingPayment } from "@/app/actions/payments";
import { PaymentPanel } from "@/components/payments/PaymentPanel";
import { toCents } from "@/lib/payments/commission";
import type { Booking, Message, PaymentStatus, Profile } from "@/lib/types/database";

const log = createLogger("client-booking-page");

interface Props {
  params: Promise<{ id: string }>;
}

/** Shared by generateMetadata and the page: one booking query per request. */
const getClientBooking = cache(async (id: string): Promise<Booking | null> => {
  if (!z.string().uuid().safeParse(id).success) return null;
  const user = await getSessionUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    // The speaker's public fields only — their email and phone stay server-side.
    .select(`${BOOKING_DETAIL_COLUMNS}, speaker_profiles(id, profiles(id, full_name, avatar_url))`)
    .eq("id", id)
    .eq("client_id", user.id)
    .maybeSingle();

  if (error) {
    log.error("Could not load booking", { id, cause: error });
    throw new Error("Could not load this booking. Please try again.");
  }
  return (data as unknown as Booking) ?? null;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const booking = await getClientBooking(id);
  const title = booking?.event_name ?? "Booking Detail";
  return {
    title,
    description: `Booking details for ${title}${booking?.booking_number ? ` (${booking.booking_number})` : ""} on NxtSpeaker.`,
  };
}

export default async function ClientBookingDetailPage({ params }: Props) {
  const { id } = await params;

  const profile = await getMyProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const [booking, messagesRes, paymentRes] = await Promise.all([
    getClientBooking(id),
    supabase
      .from("messages")
      .select("id, booking_id, sender_id, content, read_at, created_at, profiles(id, full_name, avatar_url, role)")
      .eq("booking_id", id)
      .order("created_at", { ascending: true }),
    // RLS limits this to payments on the caller's own bookings.
    supabase
      .from("payments")
      .select("status, gross_amount_cents")
      .eq("booking_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!booking) notFound();
  if (messagesRes.error) log.error("Could not load messages", { id, cause: messagesRes.error });
  if (paymentRes.error) log.error("Could not load payment", { id, cause: paymentRes.error });

  // Keyed off the booking's own `speaker_id` column rather than the embedded
  // join, which RLS can return as null — the old `?? ""` fallback then sent an
  // empty string to a uuid column (22P02) and the rider silently disappeared.
  const { data: rider, error: riderError } = await supabase
    .from("hospitality_riders")
    .select("*")
    .eq("speaker_id", booking.speaker_id)
    .maybeSingle();
  if (riderError) log.error("Could not load rider", { id, cause: riderError });

  const messages = (messagesRes.data ?? []) as unknown as Message[];
  const payment = paymentRes.data;
  const speakerName = booking.speaker_profiles?.profiles?.full_name ?? "Speaker";

  const isPaid = booking.status === "PAID" || booking.status === "COMPLETED";
  const showPaymentPanel = booking.status === "CONFIRMED" || isPaid;

  // Prefer the amount actually charged; fall back to the quoted fee for a
  // booking that has no payment row yet.
  const grossCents = payment?.gross_amount_cents
    ? Number(payment.gross_amount_cents)
    : toCents(booking.quoted_fee_zar);

  async function handlePay(bookingId: string) {
    "use server";
    const result = await initiateBookingPayment(bookingId);
    return result as { data?: { redirectUrl: string }; error?: string };
  }

  return (
    <div>
      <TopBar title={booking.event_name} subtitle={`Booking ref: ${booking.booking_number}`}>
        <Link
          href="/client/bookings"
          className="flex items-center gap-1.5 text-sm text-muted hover:text-primary transition-colors"
        >
          <ArrowLeft size={14} aria-hidden="true" /> Back
        </Link>
      </TopBar>

      <div className="p-4 sm:p-6 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {showPaymentPanel && (
            <PaymentPanel
              bookingId={booking.id}
              grossCents={grossCents}
              paymentStatus={(payment?.status as PaymentStatus | undefined) ?? null}
              isPaid={isPaid}
              onPay={handlePay}
            />
          )}

          {/* Status card */}
          <div className="bg-white border border-line rounded-[8px] p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-archivo font-bold text-primary">Booking Details</h2>
              <BookingStatusBadge status={booking.status} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              {[
                { label: "Speaker",   value: speakerName },
                { label: "Event Date", value: formatDateSAST(booking.event_date) },
                { label: "Location",  value: booking.exact_location },
                { label: "Format",    value: booking.event_format },
                { label: "Duration",  value: `${booking.duration_minutes} minutes` },
                { label: "Organiser", value: booking.event_organiser },
                { label: "Company",   value: booking.associated_company },
                { label: "Audience",  value: booking.audience_demographics },
              ].map((row) => (
                <div key={row.label}>
                  <p className="text-[10px] font-space-mono font-semibold text-muted uppercase tracking-wide">{row.label}</p>
                  <p className="text-ink mt-0.5">{row.value}</p>
                </div>
              ))}
              <div>
                <p className="text-[10px] font-space-mono font-semibold text-muted uppercase tracking-wide">Quoted Fee</p>
                <p className="font-space-mono text-xl font-bold text-ink mt-0.5">{formatZAR(booking.quoted_fee_zar)}</p>
              </div>
              <div>
                <p className="text-[10px] font-space-mono font-semibold text-muted uppercase tracking-wide">Rider Agreed</p>
                <p className="text-ink mt-0.5">{booking.hospitality_rider_agreed ? "✓ Yes" : "No"}</p>
              </div>
            </div>
            {booking.client_notes && (
              <div className="mt-4 pt-4 border-t border-line">
                <p className="text-[10px] font-space-mono font-semibold text-muted uppercase tracking-wide mb-1">Notes</p>
                <p className="text-sm text-ink">{booking.client_notes}</p>
              </div>
            )}
            {booking.cancelled_reason && (
              <div className="mt-4 pt-4 border-t border-line">
                <p className="text-[10px] font-space-mono font-semibold text-muted uppercase tracking-wide mb-1">Cancellation Reason</p>
                <p className="text-sm text-ink">{booking.cancelled_reason}</p>
              </div>
            )}
            {canClientCancel(booking.status) && (
              <div className="mt-4 pt-4 border-t border-line">
                <CancelBookingButton bookingId={booking.id} />
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
            <h2 className="font-archivo font-bold text-primary">Chat with {speakerName}</h2>
          </div>
          <ChatPanel
            bookingId={booking.id}
            status={booking.status}
            initialMessages={messages}
            currentUser={profile as unknown as Profile}
            onSend={sendMessage}
          />
        </div>
      </div>
    </div>
  );
}
