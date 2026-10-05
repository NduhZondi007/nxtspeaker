import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, ShieldCheck, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { TopBar } from "@/components/layout/TopBar";
import { LoadError } from "@/components/payments/LoadError";
import { formatZARCents } from "@/lib/utils/currency";
import { createLogger } from "@/lib/logger";

const log = createLogger("client-payment-page");

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const metadata: Metadata = {
  title: "Payment",
  description: "Payment status for your NxtSpeaker booking.",
};

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ state?: string }>;
}

/**
 * Where Yoco returns the client after checkout.
 *
 * This page reads database state and renders it. It never writes payment
 * state and never treats `?state=success` as proof of anything — Yoco's docs
 * are explicit that only the webhook confirms a payment. The query parameter
 * is used solely to pick the right copy for a client who cancelled or failed,
 * because in those cases no webhook is coming.
 */
export default async function PaymentResultPage({ params, searchParams }: Props) {
  const [{ id }, { state }, user, supabase] = await Promise.all([
    params,
    searchParams,
    getSessionUser(),
    createClient(),
  ]);
  if (!user) redirect("/login");

  // A malformed id would make Postgres raise 22P02 rather than match nothing.
  if (!UUID.test(id)) notFound();

  // Independent reads, run together. The payment read is keyed on the URL id
  // and RLS limits it to the caller's own bookings, so it cannot leak another
  // client's payment even before the booking read confirms ownership.
  const [bookingResult, paymentResult] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, booking_number, event_name, status")
      .eq("id", id)
      .eq("client_id", user.id)
      .maybeSingle(),
    supabase
      .from("payments")
      .select("status, gross_amount_cents")
      .eq("booking_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (bookingResult.error || paymentResult.error) {
    log.error("payment page query failed", {
      cause: bookingResult.error ?? paymentResult.error,
    });
    return (
      <div>
        <TopBar title="Payment" />
        <div className="p-4 sm:p-6 max-w-xl">
          <LoadError
            title="We could not load this payment"
            message="Nothing has changed with your booking. Refresh the page in a moment — please do not pay again in the meantime."
          />
        </div>
      </div>
    );
  }

  const booking = bookingResult.data;
  if (!booking) notFound();
  const payment = paymentResult.data;

  const isPaid = booking.status === "PAID" || booking.status === "COMPLETED";
  const amount = formatZARCents(payment?.gross_amount_cents ?? 0);

  // Four states. "Confirming" is the important one: the client is back but
  // the webhook has not landed yet. `bookings` is in the realtime publication,
  // so BookingStatusWatcher flips the page the instant the webhook commits —
  // no polling.
  const view = isPaid
    ? "paid"
    : payment?.status === "NEEDS_REVIEW"
      ? "review"
      : state === "cancelled"
      ? "cancelled"
      : state === "failed" || payment?.status === "FAILED"
        ? "failed"
        : "confirming";

  return (
    <div>
      <TopBar title="Payment" subtitle={`Booking ref: ${booking.booking_number}`}>
        <Link
          href={`/client/bookings/${booking.id}`}
          className="flex items-center gap-1.5 text-sm text-muted hover:text-primary transition-colors"
        >
          <ArrowLeft size={14} aria-hidden="true" /> Back to booking
        </Link>
      </TopBar>

      {/*
        No status subscription is mounted here: BookingStatusWatcher already
        lives in the /client layout, so the realtime channel that flips this
        page to "paid" when the webhook commits is running on every route.
      */}
      <div className="p-4 sm:p-6">
        <div className="max-w-xl">
          {view === "paid" && (
            <div className="bg-white border border-success/30 rounded-[12px] p-6">
              <CheckCircle2 size={28} className="text-success" aria-hidden="true" />
              <h1 className="font-archivo font-extrabold text-primary text-2xl uppercase tracking-[-0.02em] mt-4">
                Payment received
              </h1>
              <p className="font-space-mono text-3xl font-bold text-success mt-3">{amount}</p>
              <p className="text-sm text-ink mt-4 leading-relaxed">
                {booking.event_name} is confirmed and paid. NxtSpeaker holds your payment until
                the event has been delivered, then releases it to your speaker.
              </p>
              <div className="mt-6">
                <Link
                  href={`/client/bookings/${booking.id}`}
                  className="inline-flex items-center rounded-[3px] bg-primary px-[22px] py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
                >
                  Back to booking
                </Link>
              </div>
            </div>
          )}

          {view === "review" && (
            <div className="bg-white border border-line rounded-[12px] p-6">
              <p className="text-[10px] font-space-mono font-semibold text-muted uppercase tracking-[0.14em]">
                Under review
              </p>
              <div className="flex items-center gap-3 mt-3">
                <ShieldCheck size={22} className="text-secondary" aria-hidden="true" />
                <h1 className="font-archivo font-extrabold text-primary text-2xl uppercase tracking-[-0.02em]">
                  Your payment is being reviewed
                </h1>
              </div>
              <p className="font-space-mono text-3xl font-bold text-ink mt-3">{amount}</p>
              <p className="text-sm text-ink mt-4 leading-relaxed">
                We received your payment but it needs a quick check by the NxtSpeaker team before
                your booking is marked paid. We will contact you shortly — please do not pay again.
              </p>
            </div>
          )}

          {view === "confirming" && (
            <div className="bg-white border border-line rounded-[12px] p-6">
              <p className="text-[10px] font-space-mono font-semibold text-muted uppercase tracking-[0.14em]">
                Processing
              </p>
              <div className="flex items-center gap-3 mt-3">
                <Clock size={22} className="text-secondary" aria-hidden="true" />
                <h1 className="font-archivo font-extrabold text-primary text-2xl uppercase tracking-[-0.02em]">
                  Confirming your payment
                </h1>
              </div>
              <p className="text-sm text-ink mt-4 leading-relaxed">
                We are waiting for confirmation from Yoco. This page updates on its own — there is
                no need to refresh or pay again.
              </p>
              <p className="text-xs text-muted mt-3">
                If nothing changes within a few minutes, open the booking and check its status
                before retrying.
              </p>
            </div>
          )}

          {view === "cancelled" && (
            <div className="bg-white border border-line rounded-[12px] p-6">
              <p className="text-[10px] font-space-mono font-semibold text-muted uppercase tracking-[0.14em]">
                Cancelled
              </p>
              <h1 className="font-archivo font-extrabold text-primary text-2xl uppercase tracking-[-0.02em] mt-3">
                Payment cancelled
              </h1>
              <p className="text-sm text-ink mt-4 leading-relaxed">
                You have not been charged. Your booking is still held and you can pay whenever you
                are ready.
              </p>
              <div className="mt-6">
                <Link
                  href={`/client/bookings/${booking.id}`}
                  className="inline-flex items-center rounded-[3px] bg-accent px-[22px] py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
                >
                  Resume payment
                </Link>
              </div>
            </div>
          )}

          {view === "failed" && (
            <div className="bg-white border border-danger/30 rounded-[12px] p-6">
              <XCircle size={28} className="text-danger" aria-hidden="true" />
              <h1 className="font-archivo font-extrabold text-primary text-2xl uppercase tracking-[-0.02em] mt-4">
                Payment failed
              </h1>
              <p className="text-sm text-ink mt-4 leading-relaxed">
                Your payment did not go through and you have not been charged. This is usually a
                card or bank issue rather than a problem with the booking.
              </p>
              <div className="mt-6">
                <Link
                  href={`/client/bookings/${booking.id}`}
                  className="inline-flex items-center rounded-[3px] bg-accent px-[22px] py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
                >
                  Try again
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
