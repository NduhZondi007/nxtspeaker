import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, CreditCard } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { TopBar } from "@/components/layout/TopBar";
import { Badge } from "@/components/ui/Badge";
import { LoadError } from "@/components/payments/LoadError";
import { MoneyTile } from "@/components/payments/MoneyTile";
import { Pagination } from "@/components/payments/Pagination";
import { PAYMENT_STYLES } from "@/components/payments/status-styles";
import { formatZARCents } from "@/lib/utils/currency";
import { requestNowMs } from "@/lib/utils/time";
import { parseAdminMoneyTotals } from "@/lib/payments/admin-totals";
import { PAGE_SIZE, pageRange, parsePage } from "@/lib/payments/pagination";
import { createLogger } from "@/lib/logger";
import type { PaymentStatus } from "@/lib/types/database";

const log = createLogger("admin-payments-page");

export const metadata: Metadata = {
  title: "Payments",
  description: "Reconcile client payments and platform commission.",
};

const STALE_AFTER_MINUTES = 30;
const EXCEPTION_LIMIT = 100;

const PAYMENT_COLUMNS =
  "id, status, created_at, processing_mode, provider_checkout_id, failure_reason, gross_amount_cents, commission_rate_bps, commission_amount_cents, speaker_amount_cents";

interface PaymentRow {
  id: string;
  status: PaymentStatus;
  created_at: string;
  processing_mode: "live" | "test" | null;
  provider_checkout_id: string | null;
  failure_reason: string | null;
  gross_amount_cents: number;
  commission_rate_bps: number;
  commission_amount_cents: number;
  speaker_amount_cents: number;
  bookings: { id: string; booking_number: string; event_name: string; status: string } | null;
}

interface Props {
  searchParams: Promise<{ page?: string | string[] }>;
}

export default async function AdminPaymentsPage({ searchParams }: Props) {
  // Page-level gate: this page reads every payment with the service-role
  // key, and a layout-only check does not run on every partial render.
  await requireRole("ADMIN");

  const page = parsePage((await searchParams).page);
  const { from, to } = pageRange(page);
  const service = createServiceClient();
  const staleCutoffIso = new Date(requestNowMs() - STALE_AFTER_MINUTES * 60_000).toISOString();

  // Totals come from the whole ledger via the RPC; exceptions from dedicated
  // queries. Neither depends on which page of the list is being viewed.
  const [totalsResult, listResult, flaggedResult, orphanedResult] = await Promise.all([
    service.rpc("admin_money_totals"),
    service
      .from("payments")
      .select(`${PAYMENT_COLUMNS}, bookings(id, booking_number, event_name, status)`)
      .order("created_at", { ascending: false })
      .range(from, to),
    // Flagged for review, or a checkout that never resolved either way.
    service
      .from("payments")
      .select(`${PAYMENT_COLUMNS}, bookings(id, booking_number, event_name, status)`)
      .or(`status.eq.NEEDS_REVIEW,and(status.eq.PENDING,created_at.lt.${staleCutoffIso})`)
      .order("created_at", { ascending: false })
      .limit(EXCEPTION_LIMIT),
    // Money captured against a booking that is no longer live: a refund is owed.
    service
      .from("payments")
      .select(`${PAYMENT_COLUMNS}, bookings!inner(id, booking_number, event_name, status)`)
      .eq("status", "SUCCEEDED")
      .in("bookings.status", ["CANCELLED", "DECLINED"])
      .order("created_at", { ascending: false })
      .limit(EXCEPTION_LIMIT),
  ]);

  const totals = totalsResult.error ? null : parseAdminMoneyTotals(totalsResult.data);
  if (!totals) {
    log.error("admin_money_totals failed", { cause: totalsResult.error ?? "malformed result" });
  }

  const exceptionsError = flaggedResult.error ?? orphanedResult.error;
  if (exceptionsError) log.error("exception queries failed", { cause: exceptionsError });
  if (listResult.error) log.error("payments list failed", { cause: listResult.error });

  const exceptions = exceptionsError
    ? []
    : ([...(flaggedResult.data ?? []), ...(orphanedResult.data ?? [])] as unknown as PaymentRow[]);

  const listRows = (listResult.data ?? []) as unknown as PaymentRow[];
  const hasNext = listRows.length > PAGE_SIZE;
  const payments = listRows.slice(0, PAGE_SIZE);

  return (
    <div>
      <TopBar title="Payments" subtitle="Reconciliation and platform commission" />

      <div className="p-4 sm:p-6 space-y-6">
        {totals ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MoneyTile label="Collected" value={formatZARCents(totals.collected)} tone="primary" />
            <MoneyTile
              label="Commission Earned"
              value={formatZARCents(totals.commission)}
              tone="success"
            />
            <MoneyTile
              label="Owed to Speakers"
              value={formatZARCents(totals.owed)}
              tone="secondary"
            />
            <MoneyTile label="Refunded" value={formatZARCents(totals.refunded)} tone="danger" />
          </div>
        ) : (
          <LoadError title="Payment totals could not be loaded" />
        )}

        {/* Exceptions come first and are visually distinct — an unreconciled
            payment must be impossible to scroll past. A failed query is shown
            as a failure, never as "everything reconciles". */}
        {exceptionsError ? (
          <LoadError title="Could not check for payments that need attention" />
        ) : exceptions.length > 0 ? (
          <div className="bg-white border border-danger/30 rounded-[12px] overflow-hidden">
            <div className="px-5 py-4 border-b border-line flex items-center gap-2">
              <AlertTriangle size={16} className="text-danger" aria-hidden="true" />
              <h2 className="font-archivo font-bold text-primary">
                Needs attention ({exceptions.length})
              </h2>
            </div>
            <div className="divide-y divide-line">
              {exceptions.map((payment) => (
                <ExceptionRow key={payment.id} payment={payment} />
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white border border-line rounded-[12px] px-5 py-4 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-success" aria-hidden="true" />
            <p className="text-sm text-ink">Everything reconciles. No payments need attention.</p>
          </div>
        )}

        <div className="bg-white border border-line rounded-[12px] overflow-hidden">
          <div className="px-5 py-4 border-b border-line flex items-center gap-2">
            <CreditCard size={16} className="text-secondary" aria-hidden="true" />
            <h2 className="font-archivo font-bold text-primary">All payments</h2>
          </div>

          {listResult.error ? (
            <div className="p-4">
              <LoadError title="Payments could not be loaded" />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard size={32} className="text-line mx-auto mb-3" aria-hidden="true" />
              <p className="font-archivo text-muted">
                {page > 1 ? "No payments on this page" : "No payments yet"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {payments.map((payment) => (
                <PaymentListRow key={payment.id} payment={payment} />
              ))}
            </div>
          )}

          <Pagination basePath="/admin/payments" page={page} hasNext={hasNext} />
        </div>
      </div>
    </div>
  );
}

interface PaymentListRowProps {
  payment: PaymentRow;
}

function PaymentListRow({ payment }: PaymentListRowProps) {
  return (
    <div className="px-5 py-3.5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {payment.bookings ? (
            <Link
              href={`/admin/bookings/${payment.bookings.id}`}
              className="text-sm font-semibold text-ink hover:text-primary truncate block"
            >
              {payment.bookings.event_name}
            </Link>
          ) : (
            <p className="text-sm font-semibold text-ink">Unlinked payment</p>
          )}
          <p className="text-xs text-muted mt-0.5">
            {payment.bookings?.booking_number ?? "—"} ·{" "}
            {new Date(payment.created_at).toLocaleDateString("en-ZA")}
            {payment.processing_mode === "test" && " · TEST"}
          </p>
        </div>

        <div className="text-right shrink-0">
          <p className="font-space-mono text-lg font-bold text-ink">
            {formatZARCents(payment.gross_amount_cents)}
          </p>
          <div className="mt-1">
            <Badge className={PAYMENT_STYLES[payment.status]}>{payment.status}</Badge>
          </div>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
        <Figure label="Gross" value={formatZARCents(payment.gross_amount_cents)} />
        <Figure
          label={`Commission ${payment.commission_rate_bps / 100}%`}
          value={`−${formatZARCents(payment.commission_amount_cents)}`}
          tone="muted"
        />
        <Figure
          label="To speaker"
          value={formatZARCents(payment.speaker_amount_cents)}
          tone="secondary"
        />
      </div>
    </div>
  );
}

interface FigureProps {
  label: string;
  value: string;
  tone?: "ink" | "muted" | "secondary";
}

function Figure({ label, value, tone = "ink" }: FigureProps) {
  const toneClass =
    tone === "muted" ? "text-muted" : tone === "secondary" ? "text-secondary font-bold" : "text-ink";

  return (
    <div>
      <p className="text-[10px] font-space-mono uppercase tracking-wide text-muted">{label}</p>
      <p className={`font-space-mono mt-0.5 ${toneClass}`}>{value}</p>
    </div>
  );
}

interface ExceptionRowProps {
  payment: PaymentRow;
}

function ExceptionRow({ payment }: ExceptionRowProps) {
  const reason =
    payment.status === "NEEDS_REVIEW"
      ? (payment.failure_reason ?? "Flagged for review")
      : payment.status === "SUCCEEDED"
        ? "Payment captured against a booking that is no longer live — a refund is owed"
        : `Checkout has been open for more than ${STALE_AFTER_MINUTES} minutes with no outcome`;

  return (
    <div className="px-5 py-3.5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink truncate">
            {payment.bookings?.event_name ?? "Unlinked payment"}
          </p>
          <p className="text-xs text-danger mt-0.5">{reason}</p>
          <p className="text-[10px] font-space-mono text-muted mt-1 select-all">
            {payment.provider_checkout_id ?? payment.id}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-space-mono text-lg font-bold text-ink">
            {formatZARCents(payment.gross_amount_cents)}
          </p>
          {payment.bookings && (
            <Link
              href={`/admin/bookings/${payment.bookings.id}`}
              className="text-xs text-secondary font-semibold hover:underline"
            >
              Open booking →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
