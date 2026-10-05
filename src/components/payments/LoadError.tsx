import { AlertTriangle } from "lucide-react";

interface LoadErrorProps {
  title: string;
  message?: string;
}

/**
 * Shown in place of figures that failed to load. A money view that silently
 * renders zeros, or "everything reconciles", on a failed query is worse than
 * one that says it does not know.
 */
export function LoadError({
  title,
  message = "Refresh the page to try again. If it keeps happening, check the logs.",
}: LoadErrorProps) {
  return (
    <div
      role="alert"
      className="bg-white border border-danger/30 rounded-[12px] px-5 py-4 flex items-start gap-2"
    >
      <AlertTriangle size={16} className="text-danger shrink-0 mt-0.5" aria-hidden="true" />
      <div>
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="text-xs text-muted mt-0.5">{message}</p>
      </div>
    </div>
  );
}
