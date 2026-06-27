"use client";

import { Moon, Sun } from "lucide-react";
import { useDemoAuth } from "./DemoChrome";

/**
 * Light/dark toggle for a demo. Reads the active mode + toggler from DemoChrome
 * and is meant to sit right beside the user menu in a template's header (or the
 * floating MemberArea). Renders nothing when toggling is disabled (e.g. the
 * admin preview pins a mode via `forceMode`). Styling uses semantic palette
 * tokens so it fits every template; pass `className` to override.
 */
export default function ThemeToggle({ className }: { className?: string }) {
  const { mode, toggleMode, canToggle } = useDemoAuth();
  if (!canToggle) return null;

  return (
    <button
      onClick={toggleMode}
      aria-label="Toggle light/dark"
      className={
        className ??
        "flex h-[40px] w-[40px] flex-none cursor-pointer items-center justify-center rounded-full border border-edge bg-card text-ink-soft transition-colors hover:text-ink"
      }
    >
      {mode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
