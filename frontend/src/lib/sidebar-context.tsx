"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

type SidebarContextValue = {
  open: boolean;
  toggle: () => void;
  setOpen: (open: boolean) => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (pathname === "/chat") {
      setOpen(window.innerWidth > 640);
    }
  }, [pathname]);

  const toggle = useCallback(() => setOpen((prev) => !prev), []);

  return (
    <SidebarContext.Provider value={{ open, toggle, setOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error("useSidebar must be used inside SidebarProvider");
  }
  return ctx;
}

export function SidebarToggle({ className }: { className?: string }) {
  const { open, toggle } = useSidebar();

  return (
    <button
      type="button"
      className={`sidebar-toggle ${className ?? ""}`.trim()}
      onClick={toggle}
      aria-label={open ? "Close sidebar" : "Open sidebar"}
      aria-expanded={open}
      title={open ? "Close sidebar" : "Open sidebar"}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        {open ? (
          <path
            d="M15 6l-6 6 6 6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <path
            d="M4 7h16M4 12h16M4 17h16"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        )}
      </svg>
    </button>
  );
}
