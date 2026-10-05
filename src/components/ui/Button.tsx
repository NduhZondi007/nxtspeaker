import { type ButtonHTMLAttributes, forwardRef } from "react";

export type ButtonVariant = "gold" | "primary" | "outline" | "ghost" | "danger" | "soft";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  // `#B53E00` is the DESIGN.md disabled-CTA text colour; globals.css has no
  // token for it yet, so it is the one literal left here.
  gold: "bg-accent text-white font-semibold hover:bg-accent-hover border border-accent shadow-sm disabled:bg-accent-disabled disabled:text-[#B53E00] disabled:border-accent-disabled",
  primary: "bg-primary text-white font-semibold hover:bg-primary/90 border border-primary",
  outline: "bg-white text-primary font-medium hover:bg-soft border border-secondary",
  ghost: "bg-transparent text-secondary font-medium hover:text-primary hover:bg-soft border border-transparent",
  soft: "bg-support text-primary font-medium hover:bg-support/80 border border-transparent",
  danger: "bg-danger text-white font-semibold hover:opacity-90 border border-danger",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs rounded-[3px]",
  md: "px-[22px] py-3 text-sm rounded-[3px]",
  lg: "px-8 py-3.5 text-base rounded-[3px]",
};

const BASE =
  "inline-flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed";

/**
 * The Button look as a class string. Use it to style a `<Link>` as a button —
 * wrapping a `<button>` in a `<Link>` nests interactive content, which is
 * invalid HTML and gives keyboard users two tab stops for one control.
 */
export function buttonClasses({
  variant = "primary",
  size = "md",
  className = "",
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}): string {
  return [BASE, variantStyles[variant], sizeStyles[size], className].filter(Boolean).join(" ");
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading = false, disabled, className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={buttonClasses({ variant, size, className })}
        {...props}
      >
        {loading && (
          <span
            aria-hidden="true"
            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
          />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
