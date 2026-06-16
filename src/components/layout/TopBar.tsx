"use client";

import { Bell, Menu } from "lucide-react";
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
      className="sticky top-0 z-30 px-4 sm:px-6 py-4 flex items-center justify-between border-b border-warm-gray"
      style={{
        background: "rgba(250, 248, 243, 0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={open}
          className="md:hidden p-2 -ml-2 rounded-lg text-mid-gray hover:text-charcoal hover:bg-warm-gray transition-colors shrink-0"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <div className="min-w-0">
          {title && (
            <h1 className="font-cormorant text-xl sm:text-2xl text-ink font-semibold leading-tight truncate">
              {title}
            </h1>
          )}
          {subtitle && <p className="text-xs text-mid-gray mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {children}
        <button className="relative p-2 rounded-lg text-mid-gray hover:text-charcoal hover:bg-warm-gray transition-colors">
          <Bell size={18} />
        </button>
      </div>
    </header>
  );
}
