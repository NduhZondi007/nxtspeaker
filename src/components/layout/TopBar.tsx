import { Bell } from "lucide-react";

interface TopBarProps {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function TopBar({ title, subtitle, children }: TopBarProps) {
  return (
    <header
      className="sticky top-0 z-30 px-6 py-4 flex items-center justify-between border-b border-warm-gray"
      style={{
        background: "rgba(250, 248, 243, 0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      <div>
        {title && (
          <h1 className="font-cormorant text-2xl text-ink font-semibold leading-tight">
            {title}
          </h1>
        )}
        {subtitle && <p className="text-xs text-mid-gray mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {children}
        <button className="relative p-2 rounded-lg text-mid-gray hover:text-charcoal hover:bg-warm-gray transition-colors">
          <Bell size={18} />
        </button>
      </div>
    </header>
  );
}
