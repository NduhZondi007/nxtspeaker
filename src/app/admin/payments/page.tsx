import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, CreditCard } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";
import { Badge } from "@/components/ui/Badge";
import { formatZARCents } from "@/lib/utils/currency";
import { requestNowMs } from "@/lib/utils/time";
import type { Payment, PaymentStatus } from "@/lib/types/database";

export const metadata: Metadata = {
  title: "Payments",
  description: "Reconcile client payments and platform commission.",
};

const STATUS_STYLES: Record<PaymentStatus, string> = {
  CREATED: "bg-muted/15 text-muted border border-muted/30",
  PENDING: "bg-secondary/15 text-secondary border border-secondary/30",
  SUCCEEDED: "bg-success/15 text-success border border-success/30",
  FAILED: "bg-danger/15 text-danger border border-danger/30",
  CANCELLED: "bg-muted/15 text-muted border border-muted/30",
  REFUNDED: "bg-primary/10 text-primary border border-primary/20",
  NEEDS_REVIEW: "bg-danger/15 text-danger border border-danger/30",
};

const STALE_AFTER_MINUTES = 30;

type PaymentRow = Payment & {
  bookings?: { id: string; booking_number: string; event_name: string; status: string } | null;
};

export default async function AdminPaymentsPage() {
  // The admin layout already re-checks the role server-side; the service
  // client is used because payments has no write policy and admins need to
  // see every row regardless of RLS scoping.
  const service = createServiceClient();

  const { data: rawPayments } = await service
    .from("payments")
    .select("*, bookings(id, booking_number, event_name, status)")
    .order("created_at", { ascending: false })
    .limit(200);

  const payments = (rawPayments ?? []) as PaymentRow[];

  const staleCutoff = requestNowMs() - STALE_AFTER_MINUTES * 60_000;

  // Three things need a human: a provider/ledger amount disagreement, money
  // captured against a booking that is no longer live (a refund is owed), and
  // a checkout that never resolved either way.
  const exceptions = payments.filter((p) => {
    if (p.status === "NEEDS_REVIEW") return true;
    if (p.status === "SUCCEEDED" && p.bookings && ["CANCELLED", "DECLINED"].includes(p.bookings.status))
      return true;
    if (p.status === "PENDING" && new Date(p.created_at).getTime() < staleCutoff) return true;
    return false;
  });

  const captured = payments.filter((p) => p.status === "SUCCEEDED");
  const collected = captured.reduce((sum, p) => sum + Number(p.gross_amount_cents), 0);
  const commission = captured.reduce((sum, p) => sum + Number(p.commission_amount_cents), 0);
  const owed = captured.reduce((sum, p) => sum + Number(p.speaker_amount_cents), 0);
  const refunded = payments
    .filter((p) => p.status === "REFUNDED")
    .reduce((sum, p) => sum + Number(p.refunded_amount_cents), 0);

  const totals = [
    { label: "Collected", value: formatZARCents(collected), color: "#031E57" },
    { label: "Commission Earned", value: formatZARCents(commission), color: "#6B9E78" },
    { label: "Owed to Speakers", value: formatZARCents(owed), color: "#629DAB" },
    { label: "Refunded", value: formatZARCents(refunded), color: "#C47A6A" },
  ];

  return (
    <div>
      <TopBar title="Payments" subtitle="Reconciliation and platform commission" />

      <div className="p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {totals.map((total) => (
            <div
              key={total.label}
              className="bg-white border border-line rounded-[12px] p-5 relative overflow-hidden"
            >
              <div
                className="absolute top-0 left-0 right-0 h-0.5"
                style={{ background: `linear-gradient(90deg, ${total.color}, transparent)` }}
              />
              <p className="font-space-mono text-2xl font-bold text-ink">{total.value}</p>
              <p className="text-xs text-muted mt-0.5">{total.label}</p>
            </div>
          ))}
        </div>

        {/* Exceptions come first and are visually distinct — an unreconciled
            payment must be impossible to scroll past. */}
        {exceptions.length > 0 ? (
          <div className="bg-white border border-danger/30 rounded-[12px] overflow-hidden">
            <div className="px-5 py-4 border-b border-line flex items-center gap-2">
              <AlertTriangle size={16} className="text-danger" />
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
            <CheckCircle2 size={16} className="text-success" />
            <p className="text-sm text-ink">Everything reconciles. No payments need attention.</p>
          </div>
        )}

        <div className="bg-white border border-line rounded-[12px] overflow-hidden">
          <div className="px-5 py-4 border-b border-line flex items-center gap-2">
            <CreditCard size={16} className="text-secondary" />
            <h2 className="font-archivo font-bold text-primary">All payments</h2>
          </div>

          {payments.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard size={32} className="text-line mx-auto mb-3" />
              <p className="font-archivo text-muted">No payments yet</p>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {payments.map((payment) => (
                <div key={payment.id} className="px-5 py-3.5">
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
                        <Badge className={STATUS_STYLES[payment.status]}>{payment.status}</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <Figure label="Gross" value={formatZARCents(payment.gross_amount_cents)} />
                    <Figure
                      label={`Commission ${payment.commission_rate_bps / 100}%`}
                      value={formatZARCents(payment.commission_amount_cents)}
                      tone="muted"
                    />
                    <Figure
                      label="To speaker"
                      value={formatZARCents(payment.speaker_amount_cents)}
                      tone="secondary"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Figure({
  label,
  value,
  tone = "ink",
}: {
  label: string;
  value: string;
  tone?: "ink" | "muted" | "secondary";
}) {
  const toneClass =
    tone === "muted" ? "text-muted" : tone === "secondary" ? "text-secondary font-bold" : "text-ink";

  return (
    <div>
      <p className="text-[10px] font-space-mono uppercase tracking-wide text-muted">{label}</p>
      <p className={`font-space-mono mt-0.5 ${toneClass}`}>{value}</p>
    </div>
  );
}

function ExceptionRow({ payment }: { payment: PaymentRow }) {
  const reason =
    payment.status === "NEEDS_REVIEW"
      ? (payment.failure_reason ?? "Flagged for review")
      : payment.status === "SUCCEEDED"
        ? "Payment captured against a booking that is no longer live — a refund is owed"
        : "Checkout has been open for more than 30 minutes with no outcome";

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
