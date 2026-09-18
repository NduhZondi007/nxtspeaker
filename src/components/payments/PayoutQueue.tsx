"use client";

import { useMemo, useState, useTransition } from "react";
import { Copy, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatZARCents } from "@/lib/utils/currency";
import { maskAccountNumber } from "@/lib/utils/banking";

export interface PayoutQueueRow {
  id: string;
  amountCents: number;
  status: string;
  availableAt: string | null;
  speakerName: string;
  eventName: string;
  bookingNumber: string;
  bank: {
    account_holder?: string;
    bank_name?: string;
    account_number?: string;
    branch_code?: string;
    account_type?: string;
  } | null;
}

interface PayoutQueueProps {
  rows: PayoutQueueRow[];
  onMarkPaid: (
    payoutId: string,
    eftReference: string,
    notes?: string
  ) => Promise<{ data?: unknown; error?: string }>;
}

/**
 * The manual payout console.
 *
 * This page records payments; it does not make them. Yoco settles only to
 * NxtSpeaker's own bank account and exposes no transfer API, so an admin pays
 * each speaker by EFT and then records the reference here.
 */
export function PayoutQueue({ rows, onMarkPaid }: PayoutQueueProps) {
  const { success, error: toastError } = useToast();
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [active, setActive] = useState<PayoutQueueRow | null>(null);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const payableTotal = useMemo(
    () => rows.reduce((sum, row) => sum + row.amountCents, 0),
    [rows]
  );

  async function copyBatch() {
    // A bank-ready batch for pasting into a bulk payment file. This is the
    // "payout instruction" the flow produces — there is no API call behind it.
    const header = "Account holder,Bank,Account number,Branch code,Type,Amount,Reference";
    const lines = rows.map((row) =>
      [
        row.bank?.account_holder ?? "",
        row.bank?.bank_name ?? "",
        row.bank?.account_number ?? "",
        row.bank?.branch_code ?? "",
        row.bank?.account_type ?? "",
        (row.amountCents / 100).toFixed(2),
        row.bookingNumber,
      ].join(",")
    );

    try {
      await navigator.clipboard.writeText([header, ...lines].join("\n"));
      success("Batch copied", `${rows.length} payout${rows.length === 1 ? "" : "s"} on the clipboard.`);
    } catch {
      toastError("Could not copy", "Your browser blocked clipboard access.");
    }
  }

  function openMarkPaid(row: PayoutQueueRow) {
    setActive(row);
    setReference("");
    setNotes("");
    setFormError(null);
  }

  function submit() {
    if (!active) return;
    setFormError(null);

    startTransition(async () => {
      const result = await onMarkPaid(active.id, reference, notes || undefined);

      if (result.error) {
        setFormError(result.error);
        return;
      }

      success("Payout recorded", `${active.speakerName} has been marked as paid.`);
      setActive(null);
    });
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="font-archivo text-muted">Nothing due for payout</p>
        <p className="text-sm text-muted mt-1">
          Payouts appear here once a booking is completed and its hold period has passed
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="px-5 py-3 border-b border-line flex items-center justify-between gap-4">
        <p className="text-sm text-ink">
          <span className="font-space-mono font-bold">{formatZARCents(payableTotal)}</span> across{" "}
          {rows.length} payout{rows.length === 1 ? "" : "s"}
        </p>
        <Button variant="outline" size="sm" onClick={copyBatch}>
          <Copy size={13} className="mr-1.5" /> Copy EFT batch
        </Button>
      </div>

      <div className="divide-y divide-line">
        {rows.map((row) => {
          const isRevealed = revealed[row.id] === true;
          const hasBank = row.bank?.account_number;

          return (
            <div key={row.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">{row.speakerName}</p>
                  <p className="text-xs text-muted mt-0.5 truncate">
                    {row.eventName} · {row.bookingNumber}
                  </p>

                  {hasBank ? (
                    <div className="mt-2 flex items-center gap-2">
                      <p className="font-space-mono text-sm text-ink">
                        {isRevealed
                          ? row.bank?.account_number
                          : maskAccountNumber(row.bank?.account_number)}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setRevealed((previous) => ({ ...previous, [row.id]: !isRevealed }))
                        }
                        className="text-muted hover:text-primary transition-colors"
                        aria-label={isRevealed ? "Hide account number" : "Show account number"}
                      >
                        {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                      <span className="text-xs text-muted">
                        {row.bank?.bank_name} · {row.bank?.branch_code}
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-danger mt-2">
                      No bank details on file — this speaker cannot be paid yet
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <p className="font-space-mono text-xl font-bold text-secondary">
                    {formatZARCents(row.amountCents)}
                  </p>
                  <div className="mt-2">
                    <Button
                      variant="gold"
                      size="sm"
                      disabled={!hasBank}
                      onClick={() => openMarkPaid(row)}
                    >
                      Record as paid
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        open={active !== null}
        onClose={() => setActive(null)}
        title="Record an EFT payout"
      >
        {active && (
          <div className="space-y-4">
            <div className="bg-soft border border-line rounded-[4px] p-4">
              <p className="text-sm text-ink">
                Paying <span className="font-semibold">{active.speakerName}</span>
              </p>
              <p className="font-space-mono text-2xl font-bold text-ink mt-1">
                {formatZARCents(active.amountCents)}
              </p>
              {active.bank && (
                <p className="font-space-mono text-xs text-muted mt-2 select-all">
                  {active.bank.bank_name} · {active.bank.account_number} · {active.bank.branch_code}
                </p>
              )}
            </div>

            <p className="text-xs text-muted leading-relaxed">
              Make the EFT from the NxtSpeaker business account first, then record its reference
              here. This form does not move money.
            </p>

            <Input
              label="EFT reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="From your banking app"
              required
            />

            <Input
              label="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything worth recording"
            />

            {formError && (
              <p role="alert" className="text-sm text-danger">
                {formError}
              </p>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button variant="gold" onClick={submit} loading={pending}>
                Record as paid
              </Button>
              <Button variant="ghost" onClick={() => setActive(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
