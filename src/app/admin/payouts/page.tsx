import type { Metadata } from "next";
import { Banknote, Info } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";
import { Badge } from "@/components/ui/Badge";
import { PayoutQueue, type PayoutQueueRow } from "@/components/payments/PayoutQueue";
import { markPayoutPaid } from "@/app/actions/admin-payments";
import { formatZARCents } from "@/lib/utils/currency";
import { maskAccountNumber } from "@/lib/utils/banking";
import { requestNowMs } from "@/lib/utils/time";
import type { Payout, PayoutStatus } from "@/lib/types/database";

export const metadata: Metadata = {
  title: "Payouts",
  description: "Speaker payouts due and paid.",
};

const STATUS_STYLES: Record<PayoutStatus, string> = {
  PENDING: "bg-secondary/15 text-secondary border border-secondary/30",
  DUE: "bg-primary/10 text-primary border border-primary/20",
  PAID: "bg-success/15 text-success border border-success/30",
  ON_HOLD: "bg-danger/15 text-danger border border-danger/30",
  CANCELLED: "bg-muted/15 text-muted border border-muted/30",
};

type PayoutRow = Payout & {
  bookings?: { event_name: string; booking_number: string } | null;
  speaker_profiles?: { profiles?: { full_name: string } | null } | null;
};

export default async function AdminPayoutsPage() {
  const service = createServiceClient();

  const { data: rawPayouts } = await service
    .from("payouts")
    .select(
      "*, bookings(event_name, booking_number), speaker_profiles(profiles(full_name))"
    )
    .order("created_at", { ascending: false })
    .limit(300);

  const payouts = (rawPayouts ?? []) as PayoutRow[];
  const now = requestNowMs();

  // Due means the event was delivered AND the 7-day hold has elapsed. A payout
  // still inside its hold window is shown separately rather than being made
  // payable early.
  const payable = payouts.filter(
    (p) => p.status === "DUE" && (!p.available_at || new Date(p.available_at).getTime() <= now)
  );
  const holding = payouts.filter(
    (p) =>
      p.status === "PENDING" ||
      (p.status === "DUE" && p.available_at && new Date(p.available_at).getTime() > now)
  );
  const history = payouts.filter((p) =>
    ["PAID", "ON_HOLD", "CANCELLED"].includes(p.status)
  );

  const speakerName = (p: PayoutRow) => p.speaker_profiles?.profiles?.full_name ?? "Speaker";

  const rows: PayoutQueueRow[] = payable.map((p) => ({
    id: p.id,
    amountCents: Number(p.amount_cents),
    status: p.status,
    availableAt: p.available_at,
    speakerName: speakerName(p),
    eventName: p.bookings?.event_name ?? "Booking",
    bookingNumber: p.bookings?.booking_number ?? "—",
    bank: p.bank_snapshot
      ? {
          account_holder: p.bank_snapshot.account_holder,
          bank_name: p.bank_snapshot.bank_name,
          account_number: p.bank_snapshot.account_number,
          branch_code: p.bank_snapshot.branch_code,
          account_type: p.bank_snapshot.account_type,
        }
      : null,
  }));

  const holdingTotal = holding.reduce((sum, p) => sum + Number(p.amount_cents), 0);
  const paidTotal = payouts
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + Number(p.amount_cents), 0);

  async function handleMarkPaid(payoutId: string, eftReference: string, notes?: string) {
    "use server";
    const result = await markPayoutPaid(payoutId, eftReference, notes);
    return result.error ? { error: result.error } : { data: result.data };
  }

  return (
    <div>
      <TopBar title="Payouts" subtitle="What NxtSpeaker owes its speakers" />

      <div className="p-4 sm:p-6 space-y-6">
        {/* The constraint, stated plainly where the work happens. */}
        <div className="bg-white border border-line rounded-[12px] p-5 flex items-start gap-3">
          <Info size={16} className="text-secondary shrink-0 mt-0.5" />
          <p className="text-sm text-ink leading-relaxed">
            Payouts are made by EFT from the NxtSpeaker business account. This page records what
            has been paid — <span className="font-semibold">it does not move money</span>. Yoco
            settles only into your own account and provides no transfer API.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Tile
            label="Payable now"
            value={formatZARCents(rows.reduce((s, r) => s + r.amountCents, 0))}
            color="#031E57"
          />
          <Tile label="In escrow / on hold" value={formatZARCents(holdingTotal)} color="#629DAB" />
          <Tile label="Paid out" value={formatZARCents(paidTotal)} color="#6B9E78" />
        </div>

        <div className="bg-white border border-line rounded-[12px] overflow-hidden">
          <div className="px-5 py-4 border-b border-line flex items-center gap-2">
            <Banknote size={16} className="text-secondary" />
            <h2 className="font-archivo font-bold text-primary">Due now</h2>
          </div>
          <PayoutQueue rows={rows} onMarkPaid={handleMarkPaid} />
        </div>

        {holding.length > 0 && (
          <div className="bg-white border border-line rounded-[12px] overflow-hidden">
            <div className="px-5 py-4 border-b border-line">
              <h2 className="font-archivo font-bold text-primary">Not yet payable</h2>
              <p className="text-xs text-muted mt-0.5">
                Awaiting event delivery, or inside the 7-day hold window
              </p>
            </div>
            <div className="divide-y divide-line">
              {holding.map((p) => (
                <HistoryRow
                  key={p.id}
                  payout={p}
                  speakerName={speakerName(p)}
                  detail={
                    p.available_at
                      ? `Available ${new Date(p.available_at).toLocaleDateString("en-ZA")}`
                      : "Awaiting event delivery"
                  }
                />
              ))}
            </div>
          </div>
        )}

        {history.length > 0 && (
          <div className="bg-white border border-line rounded-[12px] overflow-hidden">
            <div className="px-5 py-4 border-b border-line">
              <h2 className="font-archivo font-bold text-primary">History</h2>
            </div>
            <div className="divide-y divide-line">
              {history.map((p) => (
                <HistoryRow
                  key={p.id}
                  payout={p}
                  speakerName={speakerName(p)}
                  detail={
                    p.status === "PAID" && p.eft_reference
                      ? `Ref ${p.eft_reference} · ${p.marked_paid_at ? new Date(p.marked_paid_at).toLocaleDateString("en-ZA") : ""}`
                      : (p.notes ?? "")
                  }
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Tile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white border border-line rounded-[12px] p-5 relative overflow-hidden">
      <div
        className="absolute top-0 left-0 right-0 h-0.5"
        style={{ background: `linear-gradient(90deg, ${color}, transparent)` }}
      />
      <p className="font-space-mono text-2xl font-bold text-ink">{value}</p>
      <p className="text-xs text-muted mt-0.5">{label}</p>
    </div>
  );
}

function HistoryRow({
  payout,
  speakerName,
  detail,
}: {
  payout: PayoutRow;
  speakerName: string;
  detail: string;
}) {
  return (
    <div className="px-5 py-3.5 flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink truncate">{speakerName}</p>
        <p className="text-xs text-muted mt-0.5 truncate">
          {payout.bookings?.event_name ?? "Booking"} · {payout.bookings?.booking_number ?? "—"}
        </p>
        {detail && <p className="text-xs text-muted mt-0.5">{detail}</p>}
        {payout.bank_snapshot?.account_number && (
          <p className="font-space-mono text-xs text-muted mt-0.5">
            {maskAccountNumber(payout.bank_snapshot.account_number)}
          </p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="font-space-mono text-lg font-bold text-ink">
          {formatZARCents(payout.amount_cents)}
        </p>
        <div className="mt-1">
          <Badge className={STATUS_STYLES[payout.status]}>{payout.status}</Badge>
        </div>
      </div>
    </div>
  );
}
