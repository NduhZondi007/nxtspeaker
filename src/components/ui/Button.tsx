import { type ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "gold" | "primary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  gold: "bg-gold text-ink font-semibold hover:bg-gold-light border border-gold shadow-sm",
  primary: "bg-ink text-cream font-semibold hover:bg-charcoal border border-ink",
  outline: "bg-transparent text-charcoal font-medium hover:bg-warm-gray border border-warm-gray",
  ghost: "bg-transparent text-mid-gray font-medium hover:text-charcoal hover:bg-warm-gray border border-transparent",
  danger: "bg-danger text-white font-semibold hover:opacity-90 border border-danger",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs rounded-md",
  md: "px-4 py-2 text-sm rounded-lg",
  lg: "px-6 py-3 text-base rounded-xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading = false, disabled, className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={[
          "inline-flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer select-none",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          variantStyles[variant],
          sizeStyles[size],
          className,
        ].join(" ")}
        {...props}
      >
        {loading && (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
