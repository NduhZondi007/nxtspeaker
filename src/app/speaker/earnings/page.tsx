import { redirect } from "next/navigation";
import Link from "next/link";
import { Banknote, Clock, DollarSign, PauseCircle, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMySpeakerProfileId, getSessionUser } from "@/lib/auth/session";
import { TopBar } from "@/components/layout/TopBar";
import { Badge } from "@/components/ui/Badge";
import { LoadError } from "@/components/payments/LoadError";
import { MoneyTile } from "@/components/payments/MoneyTile";
import { speakerPayoutBadge } from "@/components/payments/status-styles";
import { formatZARCents } from "@/lib/utils/currency";
import { requestNowMs } from "@/lib/utils/time";
import { summariseSpeakerPayouts } from "@/lib/payments/payouts";
import { createLogger } from "@/lib/logger";
import type { PayoutStatus } from "@/lib/types/database";

const log = createLogger("speaker-earnings-page");

interface EarningsPayout {
  id: string;
  status: PayoutStatus;
  amount_cents: number | string;
  available_at: string | null;
  eft_reference: string | null;
  bookings: {
    event_name: string;
    booking_number: string;
    event_date: string | null;
    profiles: { full_name: string } | null;
  } | null;
  payments: {
    gross_amount_cents: number;
    commission_amount_cents: number;
    commission_rate_bps: number;
  } | null;
}

export default async function SpeakerEarningsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  // RLS-scoped user client, not the service role: a speaker only ever reads
  // their own payouts.
  const [speakerId, supabase] = await Promise.all([getMySpeakerProfileId(), createClient()]);

  // Guarded rather than falling back to "", which Postgres rejects for a uuid
  // column (22P02) instead of matching no rows.
  const [payoutsResult, detailsResult] = speakerId
    ? await Promise.all([
        supabase
          .from("payouts")
          .select(
            "id, status, amount_cents, available_at, eft_reference, bookings(event_name, booking_number, event_date, profiles(full_name)), payments(gross_amount_cents, commission_amount_cents, commission_rate_bps)"
          )
          .eq("speaker_id", speakerId)
          .order("created_at", { ascending: false }),
        supabase
          .from("speaker_payout_details")
          .select("speaker_id")
          .eq("speaker_id", speakerId)
          .maybeSingle(),
      ])
    : [
        { data: [], error: null },
        { data: null, error: null },
      ];

  if (payoutsResult.error) log.error("payouts query failed", { cause: payoutsResult.error });
  if (detailsResult.error) log.error("payout details query failed", { cause: detailsResult.error });

  const payouts = (payoutsResult.data ?? []) as unknown as EarningsPayout[];
  const now = requestNowMs();

  // Every figure here is the speaker's NET share from payouts — never the
  // gross booking fee.
  const summary = summariseSpeakerPayouts(payouts, now);

  // Only nag about bank details when we actually know they are missing.
  const missingBankDetails = !detailsResult.error && !detailsResult.data && payouts.length > 0;

  return (
    <div>
      <TopBar title="Earnings" subtitle="What you have earned, after platform commission" />

      <div className="p-4 sm:p-6 space-y-6">
        {missingBankDetails && (
          <div className="bg-white border border-danger/30 rounded-[12px] p-5">
            <p className="font-archivo font-bold text-primary">No bank account on file</p>
            <p className="text-sm text-ink mt-1">
              NxtSpeaker cannot pay you until you add your banking details.
            </p>
            <Link
              href="/speaker/payouts"
              className="inline-flex items-center rounded-[3px] bg-accent px-[22px] py-2.5 text-sm font-semibold text-white mt-4 transition-colors hover:bg-accent-hover"
            >
              Add bank details
            </Link>
          </div>
        )}

        {payoutsResult.error ? (
          <LoadError title="Your earnings could not be loaded" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MoneyTile
              label="Paid Out"
              value={formatZARCents(summary.paidOut)}
              tone="success"
              icon={Banknote}
            />
            <MoneyTile
              label="Available"
              value={formatZARCents(summary.available)}
              tone="secondary"
              icon={Wallet}
            />
            <MoneyTile
              label="In Escrow"
              value={formatZARCents(summary.inEscrow)}
              tone="primary"
              icon={Clock}
            />
            <MoneyTile
              label="On Hold"
              value={formatZARCents(summary.onHold)}
              tone="danger"
              icon={PauseCircle}
            />
          </div>
        )}

        {/* The commission is stated plainly. A speaker should never have to
            discover the 15% by subtracting two numbers. */}
        <div className="bg-white border border-line rounded-[12px] p-5">
          <p className="text-[10px] font-space-mono font-semibold text-muted uppercase tracking-[0.14em]">
            How this works
          </p>
          <p className="text-sm text-ink mt-2 leading-relaxed">
            NxtSpeaker collects the full fee from the client and holds it until your event has been
            delivered. We retain a{" "}
            <span className="font-space-mono font-bold">15% platform commission</span>; you receive
            the remaining <span className="font-space-mono font-bold">85%</span>, paid by EFT after
            a 7-day window once the booking is completed.
          </p>
        </div>

        <div className="bg-white border border-line rounded-[12px] overflow-hidden">
          <div className="px-5 py-4 border-b border-line">
            <h2 className="font-archivo font-bold text-primary">Fee History</h2>
          </div>

          {payoutsResult.error ? (
            <div className="p-4">
              <LoadError title="Your fee history could not be loaded" />
            </div>
          ) : payouts.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign size={32} className="text-line mx-auto mb-3" aria-hidden="true" />
              <p className="font-archivo text-muted">No earnings yet</p>
              <p className="text-sm text-muted mt-1">
                Earnings appear here once a client has paid for a booking
              </p>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {payouts.map((payout) => {
                const gross = Number(payout.payments?.gross_amount_cents ?? 0);
                const commission = Number(payout.payments?.commission_amount_cents ?? 0);
                const booking = payout.bookings;
                const badge = speakerPayoutBadge(payout, now);

                return (
                  <div key={payout.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-ink truncate">
                          {booking?.event_name ?? "Booking"}
                        </p>
                        <p className="text-xs text-muted mt-0.5">
                          {booking?.profiles?.full_name ?? "Client"}
                          {booking?.event_date
                            ? ` · ${new Date(booking.event_date).toLocaleDateString("en-ZA")}`
                            : ""}
                        </p>
                        <p className="text-xs text-muted">Ref: {booking?.booking_number ?? "—"}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-space-mono text-xl font-bold text-secondary">
                          {formatZARCents(payout.amount_cents)}
                        </p>
                        <div className="mt-1">
                          <Badge className={badge.className}>{badge.label}</Badge>
                        </div>
                      </div>
                    </div>

                    {gross > 0 && (
                      <div className="mt-3 pt-3 border-t border-line grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-[10px] font-space-mono uppercase tracking-wide text-muted">
                            Gross
                          </p>
                          <p className="font-space-mono text-ink mt-0.5">
                            {formatZARCents(gross)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-space-mono uppercase tracking-wide text-muted">
                            Platform {(payout.payments?.commission_rate_bps ?? 1500) / 100}%
                          </p>
                          <p className="font-space-mono text-muted mt-0.5">
                            −{formatZARCents(commission)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-space-mono uppercase tracking-wide text-muted">
                            You receive
                          </p>
                          <p className="font-space-mono font-bold text-secondary mt-0.5">
                            {formatZARCents(payout.amount_cents)}
                          </p>
                        </div>
                      </div>
                    )}

                    {badge.label === "In escrow" && payout.status === "DUE" && payout.available_at && (
                      <p className="text-xs text-muted mt-2">
                        Releases {new Date(payout.available_at).toLocaleDateString("en-ZA")}
                      </p>
                    )}

                    {payout.status === "PAID" && payout.eft_reference && (
                      <p className="text-xs text-muted mt-2">
                        Paid by EFT · Ref {payout.eft_reference}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
