import { type InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = "", id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold text-primary uppercase tracking-wide font-space-mono"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            "w-full px-3 py-2.5 text-sm text-primary bg-white border rounded-[4px]",
            "placeholder:text-muted focus:outline-none focus:ring-2 transition-all",
            error
              ? "border-danger focus:ring-danger/20"
              : "border-secondary focus:border-accent focus:ring-accent/20",
            className,
          ].join(" ")}
          {...props}
        />
        {error && <p className="text-xs text-danger">{error}</p>}
        {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className = "", id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold text-primary uppercase tracking-wide font-space-mono"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={[
            "w-full px-3 py-2.5 text-sm text-primary bg-white border rounded-[4px] resize-y min-h-[80px]",
            "placeholder:text-muted focus:outline-none focus:ring-2 transition-all",
            error
              ? "border-danger focus:ring-danger/20"
              : "border-secondary focus:border-accent focus:ring-accent/20",
            className,
          ].join(" ")}
          {...props}
        />
        {error && <p className="text-xs text-danger">{error}</p>}
        {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
