import type { LucideIcon } from "lucide-react";

export type MoneyTileTone = "primary" | "secondary" | "success" | "danger";

/** Static class strings so Tailwind can see every token at build time. */
const TONES: Record<MoneyTileTone, { rule: string; icon: string }> = {
  primary: { rule: "from-primary", icon: "text-primary" },
  secondary: { rule: "from-secondary", icon: "text-secondary" },
  success: { rule: "from-success", icon: "text-success" },
  danger: { rule: "from-danger", icon: "text-danger" },
};

interface MoneyTileProps {
  label: string;
  /** Already formatted with formatZARCents. */
  value: string;
  tone: MoneyTileTone;
  icon?: LucideIcon;
}

/**
 * A summary figure on a money page. The tone colours only the top rule and
 * icon; the value itself is always Space Mono in ink and never orange
 * (docs/DESIGN.md → Financial surfaces).
 */
export function MoneyTile({ label, value, tone, icon: Icon }: MoneyTileProps) {
  const classes = TONES[tone];

  return (
    <div className="bg-white border border-line rounded-[12px] p-5 relative overflow-hidden">
      <div
        aria-hidden="true"
        className={`absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r ${classes.rule} to-transparent`}
      />
      {Icon && <Icon size={18} className={`mb-2 ${classes.icon}`} aria-hidden="true" />}
      <p className="font-space-mono text-2xl font-bold text-ink">{value}</p>
      <p className="text-xs text-muted mt-0.5">{label}</p>
    </div>
  );
}
