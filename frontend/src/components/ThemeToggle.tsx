"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/lib/theme";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
    >
      {/* Before hydration the real theme is unknown, so render a neutral glyph. */}
      <span className="tt-ico" aria-hidden="true">
        {mounted ? (isDark ? "\u263E" : "\u2600") : "\u25D0"}
      </span>
      <span suppressHydrationWarning>{mounted ? (isDark ? "Dark" : "Light") : "Theme"}</span>
    </button>
  );
}
