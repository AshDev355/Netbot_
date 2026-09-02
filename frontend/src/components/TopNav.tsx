"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import NetsolLogo from "./NetsolLogo";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "@/lib/auth-context";
import { SidebarToggle } from "@/lib/sidebar-context";

const APP_TABS = [
  { href: "/chat", label: "Chat" },
  { href: "/settings/profile", label: "Profile" },
];

const PUBLIC_ROUTES = ["/", "/signin", "/signup", "/enroll"];

export default function TopNav() {
  const pathname = usePathname();
  const { authed } = useAuth();
  const onChat = pathname === "/chat" || pathname.startsWith("/chat/");

  const showAppTabs =
    authed && APP_TABS.some((tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`));

  return (
    <nav className="topnav">
      <div className="left">
        {onChat && authed && <SidebarToggle className="topnav-sidebar-toggle" />}
        <Link href={authed ? "/chat" : "/"} className="netsol-mark">
          <NetsolLogo />
          NETSOL
        </Link>
        <span className="div" />
        <span className="nav-context">netbot</span>
      </div>

      {showAppTabs && !PUBLIC_ROUTES.includes(pathname) && (
        <div className="nav-links">
          {APP_TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={pathname.startsWith(tab.href) ? "on" : undefined}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      )}

      <ThemeToggle />
    </nav>
  );
}
