import type { Metadata } from "next";
import { Banknote, Info } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { TopBar } from "@/components/layout/TopBar";
import { Badge } from "@/components/ui/Badge";
import { LoadError } from "@/components/payments/LoadError";
import { MoneyTile } from "@/components/payments/MoneyTile";
import { Pagination } from "@/components/payments/Pagination";
import { PayoutQueue, type PayoutQueueRow } from "@/components/payments/PayoutQueue";
import { PAYOUT_STYLES } from "@/components/payments/status-styles";
import { markPayoutPaid } from "@/app/actions/admin-payments";
import { formatZARCents } from "@/lib/utils/currency";
import { maskAccountNumber } from "@/lib/utils/banking";
import { requestNowIso } from "@/lib/utils/time";
import { parseAdminMoneyTotals } from "@/lib/payments/admin-totals";
import { PAGE_SIZE, pageRange, parsePage } from "@/lib/payments/pagination";
import { createLogger } from "@/lib/logger";
import type { PayoutStatus } from "@/lib/types/database";

const log = createLogger("admin-payouts-page");

export const metadata: Metadata = {
  title: "Payouts",
  description: "Speaker payouts due and paid.",
};

const HOLDING_LIMIT = 100;

const PAYOUT_COLUMNS =
  "id, status, speaker_id, amount_cents, available_at, eft_reference, bank_snapshot, notes, marked_paid_at, bookings(event_name, booking_number), speaker_profiles(profiles(full_name))";

const BANK_COLUMNS = "speaker_id, account_holder, bank_name, account_number, branch_code, account_type";

interface BankFields {
  account_holder?: string;
  bank_name?: string;
  account_number?: string;
  branch_code?: string;
  account_type?: string;
}

interface PayoutRow {
  id: string;
  status: PayoutStatus;
  speaker_id: string;
  amount_cents: number | string;
  available_at: string | null;
  eft_reference: string | null;
  bank_snapshot: BankFields | null;
  notes: string | null;
  marked_paid_at: string | null;
  bookings: { event_name: string; booking_number: string } | null;
  speaker_profiles: { profiles: { full_name: string } | null } | null;
}

interface Props {
  searchParams: Promise<{ page?: string | string[] }>;
}

function pickBank(source: BankFields): BankFields {
  return {
    account_holder: source.account_holder,
    bank_name: source.bank_name,
    account_number: source.account_number,
    branch_code: source.branch_code,
    account_type: source.account_type,
  };
}

export default async function AdminPayoutsPage({ searchParams }: Props) {
  // Page-level gate: this page reads bank details with the service-role key.
  await requireRole("ADMIN");

  const page = parsePage((await searchParams).page);
  const { from, to } = pageRange(page);
  const service = createServiceClient();
  const nowIso = requestNowIso();

  const [totalsResult, payableResult, holdingResult, historyResult] = await Promise.all([
    service.rpc("admin_money_totals"),
    // The work queue: DUE and past the hold window. Exactly the rows
    // markPayoutPaid will accept. Not paginated — the EFT batch needs all of it.
    service
      .from("payouts")
      .select(PAYOUT_COLUMNS)
      .eq("status", "DUE")
      .lte("available_at", nowIso)
      .order("available_at", { ascending: true }),
    service
      .from("payouts")
      .select(PAYOUT_COLUMNS)
      .or(
        `status.eq.PENDING,and(status.eq.DUE,available_at.gt.${nowIso}),and(status.eq.DUE,available_at.is.null)`
      )
      .order("created_at", { ascending: true })
      .limit(HOLDING_LIMIT + 1),
    service
      .from("payouts")
      .select(PAYOUT_COLUMNS)
      .in("status", ["PAID", "ON_HOLD", "CANCELLED"])
      .order("updated_at", { ascending: false })
      .range(from, to),
  ]);

  const totals = totalsResult.error ? null : parseAdminMoneyTotals(totalsResult.data);
  if (!totals) {
    log.error("admin_money_totals failed", { cause: totalsResult.error ?? "malformed result" });
  }
  for (const [name, result] of [
    ["payable", payableResult],
    ["holding", holdingResult],
    ["history", historyResult],
  ] as const) {
    if (result.error) log.error(`${name} payouts query failed`, { cause: result.error });
  }

  const payable = (payableResult.data ?? []) as unknown as PayoutRow[];

  // A payout created before its speaker added bank details has no snapshot.
  // markPayoutPaid freezes the speaker's CURRENT details onto it when it is
  // recorded, so show those here rather than blocking the payout forever.
  const missingSnapshot = [
    ...new Set(payable.filter((p) => !p.bank_snapshot).map((p) => p.speaker_id)),
  ];
  const currentBank = new Map<string, BankFields>();
  let currentBankFailed = false;

  if (missingSnapshot.length > 0) {
    const { data, error } = await service
      .from("speaker_payout_details")
      .select(BANK_COLUMNS)
      .in("speaker_id", missingSnapshot);

    if (error) {
      currentBankFailed = true;
      log.error("current bank details query failed", { cause: error });
    }
    for (const row of (data ?? []) as (BankFields & { speaker_id: string })[]) {
      currentBank.set(row.speaker_id, pickBank(row));
    }
  }

  const speakerName = (p: PayoutRow) => p.speaker_profiles?.profiles?.full_name ?? "Speaker";

  const rows: PayoutQueueRow[] = payable.map((p) => {
    const live = p.bank_snapshot ? null : (currentBank.get(p.speaker_id) ?? null);
    return {
      id: p.id,
      amountCents: Number(p.amount_cents),
      status: p.status,
      availableAt: p.available_at,
      speakerName: speakerName(p),
      eventName: p.bookings?.event_name ?? "Booking",
      bookingNumber: p.bookings?.booking_number ?? "—",
      bank: p.bank_snapshot ? pickBank(p.bank_snapshot) : live,
      bankIsCurrent: live !== null,
    };
  });

  const holdingRows = (holdingResult.data ?? []) as unknown as PayoutRow[];
  const holdingTruncated = holdingRows.length > HOLDING_LIMIT;
  const holding = holdingRows.slice(0, HOLDING_LIMIT);

  const historyRows = (historyResult.data ?? []) as unknown as PayoutRow[];
  const historyHasNext = historyRows.length > PAGE_SIZE;
  const history = historyRows.slice(0, PAGE_SIZE);

  async function handleMarkPaid(payoutId: string, eftReference: string, notes?: string) {
    "use server";
    const result = await markPayoutPaid(payoutId, eftReference, notes);
    return "error" in result ? { error: result.error } : { data: result.data };
  }

  return (
    <div>
      <TopBar title="Payouts" subtitle="What NxtSpeaker owes its speakers" />

      <div className="p-4 sm:p-6 space-y-6">
        {/* The constraint, stated plainly where the work happens. */}
        <div className="bg-white border border-line rounded-[12px] p-5 flex items-start gap-3">
          <Info size={16} className="text-secondary shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-ink leading-relaxed">
            Payouts are made by EFT from the NxtSpeaker business account. This page records what
            has been paid — <span className="font-semibold">it does not move money</span>. Yoco
            settles only into your own account and provides no transfer API.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {payableResult.error ? (
            <LoadError title="Payable total unavailable" />
          ) : (
            <MoneyTile
              label="Payable now"
              value={formatZARCents(rows.reduce((sum, row) => sum + row.amountCents, 0))}
              tone="primary"
            />
          )}
          {totals ? (
            <>
              <MoneyTile
                label="Owed to speakers"
                value={formatZARCents(totals.owed)}
                tone="secondary"
              />
              <MoneyTile
                label="Paid out"
                value={formatZARCents(totals.payouts_paid)}
                tone="success"
              />
            </>
          ) : (
            <div className="sm:col-span-2">
              <LoadError title="Payout totals could not be loaded" />
            </div>
          )}
        </div>

        <div className="bg-white border border-line rounded-[12px] overflow-hidden">
          <div className="px-5 py-4 border-b border-line flex items-center gap-2">
            <Banknote size={16} className="text-secondary" aria-hidden="true" />
            <h2 className="font-archivo font-bold text-primary">Due now</h2>
          </div>
          {payableResult.error ? (
            <div className="p-4">
              <LoadError title="The payout queue could not be loaded" />
            </div>
          ) : (
            <>
              {currentBankFailed && (
                <div className="p-4 border-b border-line">
                  <LoadError title="Some speakers' bank details could not be loaded" />
                </div>
              )}
              <PayoutQueue rows={rows} onMarkPaid={handleMarkPaid} />
            </>
          )}
        </div>

        {holdingResult.error ? (
          <LoadError title="Payouts not yet payable could not be loaded" />
        ) : (
          holding.length > 0 && (
            <div className="bg-white border border-line rounded-[12px] overflow-hidden">
              <div className="px-5 py-4 border-b border-line">
                <h2 className="font-archivo font-bold text-primary">Not yet payable</h2>
                <p className="text-xs text-muted mt-0.5">
                  Awaiting event delivery, or inside the 7-day hold window
                  {holdingTruncated && ` · showing the first ${HOLDING_LIMIT}`}
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
          )
        )}

        {historyResult.error ? (
          <LoadError title="Payout history could not be loaded" />
        ) : (
          (history.length > 0 || page > 1) && (
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
              <Pagination basePath="/admin/payouts" page={page} hasNext={historyHasNext} />
            </div>
          )
        )}
      </div>
    </div>
  );
}

interface HistoryRowProps {
  payout: PayoutRow;
  speakerName: string;
  detail: string;
}

function HistoryRow({ payout, speakerName, detail }: HistoryRowProps) {
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
        <p
          className={`font-space-mono text-lg font-bold ${payout.status === "PAID" ? "text-success" : "text-ink"}`}
        >
          {formatZARCents(payout.amount_cents)}
        </p>
        <div className="mt-1">
          <Badge className={PAYOUT_STYLES[payout.status]}>{payout.status}</Badge>
        </div>
      </div>
    </div>
  );
}
