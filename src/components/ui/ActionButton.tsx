"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/Button";

/** Server Actions in this app resolve to `{ data }` or `{ error }`. */
type ActionOutcome = { error?: string | null } | void | object;

interface ConfirmOptions {
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface ActionButtonProps {
  /** Usually a Server Action bound to its arguments: `action.bind(null, id)`. */
  action: () => Promise<ActionOutcome>;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  /** Ask before running — for anything that cannot be undone from the UI. */
  confirm?: ConfirmOptions;
  /** Stretch the button (and its error) to the container width. */
  fullWidth?: boolean;
  "aria-label"?: string;
}

function errorOf(result: ActionOutcome): string | null {
  if (result && typeof result === "object" && "error" in result) {
    const { error } = result as { error?: unknown };
    if (typeof error === "string" && error) return error;
  }
  return null;
}

/**
 * A button that runs a Server Action and reports what happened.
 *
 * Replaces `<form action={async () => { "use server"; await x(); }}>`, which
 * threw away the action's `{ error }` and gave no feedback while it ran, so a
 * refused transition looked like a dead button and a slow one invited a
 * second click.
 */
export function ActionButton({
  action,
  children,
  variant = "primary",
  size = "sm",
  className = "",
  confirm,
  fullWidth = false,
  "aria-label": ariaLabel,
}: ActionButtonProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  function run() {
    setError(null);
    setConfirming(false);
    startTransition(async () => {
      try {
        const message = errorOf(await action());
        if (message) setError(message);
      } catch {
        setError("Something went wrong. Please try again.");
      }
    });
  }

  return (
    <div className={fullWidth ? "flex w-full flex-col gap-1.5" : "inline-flex flex-col gap-1.5"}>
      {confirming && confirm ? (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={confirm.message}>
          <span className="text-xs text-ink">{confirm.message}</span>
          <Button type="button" variant={variant} size={size} onClick={run}>
            {confirm.confirmLabel ?? "Confirm"}
          </Button>
          <Button type="button" variant="ghost" size={size} onClick={() => setConfirming(false)}>
            {confirm.cancelLabel ?? "Keep"}
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant={variant}
          size={size}
          className={[fullWidth ? "w-full" : "", className].filter(Boolean).join(" ")}
          loading={pending}
          aria-label={ariaLabel}
          onClick={() => (confirm ? setConfirming(true) : run())}
        >
          {children}
        </Button>
      )}
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
