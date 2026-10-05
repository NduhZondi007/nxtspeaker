import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  /** Top rule and icon tint. */
  color: string;
  /** Money values stay in Space Mono — see docs/DESIGN.md → Financial surfaces. */
  money?: boolean;
}

export function StatCard({ label, value, icon: Icon, color, money = false }: StatCardProps) {
  return (
    <div
      className="bg-white border border-line border-t-2 rounded-[8px] px-5 pt-4 pb-[18px]"
      style={{ borderTopColor: color }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-space-mono text-[10px] uppercase tracking-[0.12em] text-secondary">
          {label}
        </span>
        <span className="w-[26px] h-[26px] rounded-[4px] bg-soft flex items-center justify-center shrink-0">
          <Icon size={14} style={{ color }} />
        </span>
      </div>
      <p
        className={[
          "mt-3.5 text-[30px] leading-none tracking-[-0.02em]",
          money ? "font-space-mono font-bold text-ink" : "font-archivo font-black text-primary",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}
