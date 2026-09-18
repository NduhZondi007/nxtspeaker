import { redirect } from "next/navigation";
import Link from "next/link";
import { Banknote, Clock, DollarSign, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";
import { Badge } from "@/components/ui/Badge";
import { formatZAR, formatZARCents } from "@/lib/utils/currency";
import type { Payout, PayoutStatus } from "@/lib/types/database";

const PAYOUT_LABELS: Record<PayoutStatus, string> = {
  PENDING: "In escrow",
  DUE: "Available",
  PAID: "Paid out",
  ON_HOLD: "On hold",
  CANCELLED: "Cancelled",
};

const PAYOUT_STYLES: Record<PayoutStatus, string> = {
  PENDING: "bg-secondary/15 text-secondary border border-secondary/30",
  DUE: "bg-primary/10 text-primary border border-primary/20",
  PAID: "bg-success/15 text-success border border-success/30",
  ON_HOLD: "bg-danger/15 text-danger border border-danger/30",
  CANCELLED: "bg-muted/15 text-muted border border-muted/30",
};

export default async function SpeakerEarningsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sp } = await supabase
    .from("speaker_profiles")
    .select("id, speaking_fee_zar")
    .eq("user_id", user.id)
    .single();

  // Guarded rather than falling back to "", which Postgres rejects for a uuid
  // column (22P02) instead of matching no rows.
  const [{ data: rawPayouts }, { data: details }] = sp
    ? await Promise.all([
        supabase
          .from("payouts")
          .select(
            "*, bookings(event_name, booking_number, event_date, profiles(full_name)), payments(gross_amount_cents, commission_amount_cents, commission_rate_bps)"
          )
          .eq("speaker_id", sp.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("speaker_payout_details")
          .select("speaker_id")
          .eq("speaker_id", sp.id)
          .maybeSingle(),
      ])
    : [{ data: [] }, { data: null }];

  const payouts = (rawPayouts ?? []) as (Payout & {
    payments?: {
      gross_amount_cents: number;
      commission_amount_cents: number;
      commission_rate_bps: number;
    };
  })[];

  const sumWhere = (statuses: PayoutStatus[]) =>
    payouts
      .filter((p) => statuses.includes(p.status))
      .reduce((sum, p) => sum + Number(p.amount_cents), 0);

  const paidOut = sumWhere(["PAID"]);
  const available = sumWhere(["DUE"]);
  const inEscrow = sumWhere(["PENDING"]);

  const stats = [
    { label: "Paid Out", value: formatZARCents(paidOut), icon: Banknote, color: "#6B9E78" },
    { label: "Available", value: formatZARCents(available), icon: Wallet, color: "#031E57" },
    { label: "In Escrow", value: formatZARCents(inEscrow), icon: Clock, color: "#629DAB" },
    {
      label: "Standard Fee",
      value: formatZAR(sp?.speaking_fee_zar ?? 0),
      icon: DollarSign,
      // Not orange: a stat tile is not a thing you click. See docs/DESIGN.md.
      color: "#629DAB",
    },
  ];

  return (
    <div>
      <TopBar title="Earnings" subtitle="What you have earned, after platform commission" />

      <div className="p-4 sm:p-6 space-y-6">
        {!details && payouts.length > 0 && (
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="bg-white border border-line rounded-[12px] p-5 relative overflow-hidden"
              >
                <div
                  className="absolute top-0 left-0 right-0 h-0.5"
                  style={{ background: `linear-gradient(90deg, ${stat.color}, transparent)` }}
                />
                <Icon size={18} style={{ color: stat.color }} className="mb-2" />
                <p className="font-space-mono text-2xl font-bold text-ink">{stat.value}</p>
                <p className="text-xs text-muted mt-0.5">{stat.label}</p>
              </div>
            );
          })}
        </div>

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

          {payouts.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign size={32} className="text-line mx-auto mb-3" />
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
                          <Badge className={PAYOUT_STYLES[payout.status]}>
                            {PAYOUT_LABELS[payout.status]}
                          </Badge>
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
