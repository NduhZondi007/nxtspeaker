import { type InputHTMLAttributes, type TextareaHTMLAttributes, forwardRef, useId } from "react";

interface FieldA11y {
  fieldId: string;
  messageId: string;
  describedBy: string | undefined;
  invalid: true | undefined;
}

/**
 * Stable, collision-free ids for a labelled field, plus the aria wiring that
 * ties the field to its error or hint text. Two fields with the same label
 * (e.g. on one page twice) no longer share an id.
 */
function useFieldA11y(
  id: string | undefined,
  error: string | undefined,
  hint: string | undefined,
  callerDescribedBy: string | undefined
): FieldA11y {
  const generated = useId();
  const fieldId = id ?? generated;
  const messageId = `${fieldId}-message`;
  const hasMessage = Boolean(error || hint);
  const describedBy =
    [callerDescribedBy, hasMessage ? messageId : undefined].filter(Boolean).join(" ") || undefined;
  return { fieldId, messageId, describedBy, invalid: error ? true : undefined };
}

interface FieldMessageProps {
  id: string;
  error?: string;
  hint?: string;
}

function FieldMessage({ id, error, hint }: FieldMessageProps) {
  if (error) {
    return (
      <p id={id} className="text-xs text-danger">
        {error}
      </p>
    );
  }
  if (hint) {
    return (
      <p id={id} className="text-xs text-muted">
        {hint}
      </p>
    );
  }
  return null;
}

const labelClass = "text-xs font-semibold text-primary uppercase tracking-wide font-space-mono";

function fieldClass(base: string, error: string | undefined, className: string): string {
  return [
    base,
    "placeholder:text-muted focus:outline-none focus:ring-2 transition-all",
    error
      ? "border-danger focus:ring-danger/20"
      : "border-secondary focus:border-accent focus:ring-accent/20",
    className,
  ].join(" ");
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = "", id, "aria-describedby": ariaDescribedBy, ...props }, ref) => {
    const a11y = useFieldA11y(id, error, hint, ariaDescribedBy);
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={a11y.fieldId} className={labelClass}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={a11y.fieldId}
          aria-invalid={a11y.invalid}
          aria-describedby={a11y.describedBy}
          className={fieldClass(
            "w-full px-3 py-2.5 text-sm text-primary bg-white border rounded-[4px]",
            error,
            className
          )}
          {...props}
        />
        <FieldMessage id={a11y.messageId} error={error} hint={hint} />
      </div>
    );
  }
);

Input.displayName = "Input";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className = "", id, "aria-describedby": ariaDescribedBy, ...props }, ref) => {
    const a11y = useFieldA11y(id, error, hint, ariaDescribedBy);
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={a11y.fieldId} className={labelClass}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={a11y.fieldId}
          aria-invalid={a11y.invalid}
          aria-describedby={a11y.describedBy}
          className={fieldClass(
            "w-full px-3 py-2.5 text-sm text-primary bg-white border rounded-[4px] resize-y min-h-[80px]",
            error,
            className
          )}
          {...props}
        />
        <FieldMessage id={a11y.messageId} error={error} hint={hint} />
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
