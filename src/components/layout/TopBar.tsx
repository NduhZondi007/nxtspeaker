"use client";

import { Menu } from "lucide-react";
import { useSidebar } from "@/components/layout/SidebarContext";

interface TopBarProps {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function TopBar({ title, subtitle, children }: TopBarProps) {
  const { open } = useSidebar();

  return (
    <header
      className="sticky top-0 z-30 px-4 sm:px-6 py-4 flex items-center justify-between border-b border-line bg-tertiary/90 backdrop-blur-[20px]"
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={open}
          className="md:hidden p-2 -ml-2 rounded-[4px] text-muted hover:text-primary hover:bg-soft transition-colors shrink-0"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <div className="min-w-0">
          {title && (
            <h1 className="font-archivo text-xl sm:text-2xl text-primary font-bold uppercase tracking-tight leading-tight truncate">
              {title}
            </h1>
          )}
          {subtitle && <p className="text-xs text-muted mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="flex items-center gap-2 sm:gap-3 shrink-0">{children}</div>}
    </header>
  );
}
