"use client";

import { useState, useTransition } from "react";
import { Landmark, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { maskAccountNumber } from "@/lib/utils/banking";
import type { BankAccountType, SpeakerPayoutDetailsFormData } from "@/lib/types/database";

/** The SA retail banks a speaker is realistically paid into. */
const BANKS = [
  "Absa",
  "African Bank",
  "Bidvest Bank",
  "Capitec",
  "Discovery Bank",
  "FNB",
  "Investec",
  "Nedbank",
  "Standard Bank",
  "TymeBank",
  "Other",
] as const;

const ACCOUNT_TYPES: { value: BankAccountType; label: string }[] = [
  { value: "CHEQUE", label: "Cheque / Current" },
  { value: "SAVINGS", label: "Savings" },
  { value: "TRANSMISSION", label: "Transmission" },
];

interface PayoutDetailsFormProps {
  existing: {
    account_holder: string;
    bank_name: string;
    account_number: string;
    branch_code: string;
    account_type: BankAccountType;
    tax_number: string | null;
    is_vat_registered: boolean;
    verified_at: string | null;
  } | null;
  onSave: (
    data: SpeakerPayoutDetailsFormData
  ) => Promise<{ data?: unknown; error?: string }>;
}

export function PayoutDetailsForm({ existing, onSave }: PayoutDetailsFormProps) {
  const { success, error: toastError } = useToast();
  const [pending, startTransition] = useTransition();
  const [fieldError, setFieldError] = useState<string | null>(null);

  // An existing account is masked until the speaker chooses to change it —
  // a shoulder-surfing and screenshot defence, per docs/DESIGN.md.
  const [editing, setEditing] = useState(existing === null);

  const [form, setForm] = useState<SpeakerPayoutDetailsFormData>({
    account_holder: existing?.account_holder ?? "",
    bank_name: existing?.bank_name ?? "",
    account_number: "",
    branch_code: existing?.branch_code ?? "",
    account_type: existing?.account_type ?? "CHEQUE",
    tax_number: existing?.tax_number ?? "",
    is_vat_registered: existing?.is_vat_registered ?? false,
  });

  function set<K extends keyof SpeakerPayoutDetailsFormData>(
    key: K,
    value: SpeakerPayoutDetailsFormData[K]
  ) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFieldError(null);

    startTransition(async () => {
      const result = await onSave(form);

      if (result.error) {
        setFieldError(result.error);
        toastError("Could not save", result.error);
        return;
      }

      success("Payout details saved", "NxtSpeaker will pay your fees into this account.");
      setEditing(false);
    });
  }

  if (!editing && existing) {
    return (
      <div className="bg-white border border-line rounded-[12px] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-space-mono font-semibold text-muted uppercase tracking-[0.14em]">
              Paying into
            </p>
            <p className="font-archivo font-bold text-primary mt-1">{existing.bank_name}</p>
            <p className="font-space-mono text-lg text-ink mt-2">
              {maskAccountNumber(existing.account_number)}
            </p>
            <p className="text-sm text-muted mt-1">
              {existing.account_holder} · Branch {existing.branch_code}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Change
          </Button>
        </div>

        {existing.verified_at ? (
          <div className="mt-4 pt-4 border-t border-line flex items-center gap-2">
            <ShieldCheck size={14} className="text-success" />
            <p className="text-xs text-muted">Verified by NxtSpeaker.</p>
          </div>
        ) : (
          <div className="mt-4 pt-4 border-t border-line flex items-start gap-2">
            <ShieldCheck size={14} className="text-secondary shrink-0 mt-0.5" />
            <p className="text-xs text-muted leading-relaxed">
              Awaiting verification. Payouts can still be scheduled — NxtSpeaker confirms the
              account before the first transfer.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-line rounded-[12px] p-5">
      <div className="flex items-center gap-2 mb-5">
        <Landmark size={16} className="text-secondary" />
        <h2 className="font-archivo font-bold text-primary">Bank account</h2>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Input
            label="Account holder"
            value={form.account_holder}
            onChange={(e) => set("account_holder", e.target.value)}
            placeholder="As it appears on the account"
            required
          />
        </div>

        <div>
          <label className="block text-[10px] font-space-mono font-semibold text-muted uppercase tracking-wide mb-1.5">
            Bank
          </label>
          <select
            value={form.bank_name}
            onChange={(e) => set("bank_name", e.target.value)}
            required
            className="w-full rounded-[4px] border-[1.5px] border-secondary bg-white px-3 py-2.5 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          >
            <option value="">Select a bank</option>
            {BANKS.map((bank) => (
              <option key={bank} value={bank}>
                {bank}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-space-mono font-semibold text-muted uppercase tracking-wide mb-1.5">
            Account type
          </label>
          <select
            value={form.account_type}
            onChange={(e) => set("account_type", e.target.value as BankAccountType)}
            className="w-full rounded-[4px] border-[1.5px] border-secondary bg-white px-3 py-2.5 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          >
            {ACCOUNT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Account number"
          value={form.account_number}
          onChange={(e) => set("account_number", e.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
          placeholder="6–20 digits"
          hint={existing ? "Re-enter the full number to change it" : undefined}
          required
        />

        <Input
          label="Branch code"
          value={form.branch_code}
          onChange={(e) => set("branch_code", e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          placeholder="6 digits"
          hint="Use your bank's universal branch code"
          required
        />

        <Input
          label="Tax number (optional)"
          value={form.tax_number}
          onChange={(e) => set("tax_number", e.target.value)}
          placeholder="SARS tax reference"
        />

        <label className="flex items-center gap-2.5 sm:col-span-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_vat_registered}
            onChange={(e) => set("is_vat_registered", e.target.checked)}
            className="h-4 w-4 rounded-[2px] border-secondary text-accent focus:ring-accent/20"
          />
          <span className="text-sm text-ink">I am registered for VAT</span>
        </label>
      </div>

      {fieldError && (
        <p role="alert" className="text-sm text-danger mt-4">
          {fieldError}
        </p>
      )}

      <div className="flex items-center gap-3 mt-6">
        <Button type="submit" variant="gold" loading={pending}>
          Save payout details
        </Button>
        {existing && (
          <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
