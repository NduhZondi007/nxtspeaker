"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

interface SidebarContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const SidebarContext = createContext<SidebarContextValue>({
  isOpen: false,
  open: () => {},
  close: () => {},
});

interface SidebarProviderProps {
  children: React.ReactNode;
}

export function SidebarProvider({ children }: SidebarProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const value = useMemo(() => ({ isOpen, open, close }), [isOpen, open, close]);
  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar(): SidebarContextValue {
  return useContext(SidebarContext);
}
