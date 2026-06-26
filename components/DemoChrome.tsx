"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Moon, Sun } from "lucide-react";
import type { ChurchConfig } from "@/lib/types";
import { resolveTheme, themeToVars } from "@/lib/themes";
import MemberArea from "./MemberArea";

/**
 * Demo "auth" — there is no real authentication. `signedIn` starts true (demos
 * load already "as" the member). Flip it off to inspect the signed-out state.
 */
type DemoAuthValue = {
  config: ChurchConfig;
  signedIn: boolean;
  signIn: () => void;
  signOut: () => void;
};

const DemoAuthContext = createContext<DemoAuthValue | null>(null);

/** Read the demo auth state from inside a template (optional). */
export function useDemoAuth(): DemoAuthValue {
  const ctx = useContext(DemoAuthContext);
  if (!ctx) throw new Error("useDemoAuth must be used within <DemoChrome>");
  return ctx;
}

type Mode = "light" | "dark";

/**
 * Wraps a church demo. Resolves the template's theme (light + dark palettes +
 * fonts, with per-church overrides), follows the viewer's system light/dark
 * preference, and injects the active palette as CSS vars the templates read.
 * Also provides demo-auth state, a light/dark toggle, and (for non-self-chromed
 * templates) the floating member dropdown.
 *
 * `forceMode` lets the admin preview pin a mode instead of following the system.
 */
export default function DemoChrome({
  config,
  children,
  startSignedIn = true,
  showMemberArea = true,
  forceMode,
}: {
  config: ChurchConfig;
  children: React.ReactNode;
  startSignedIn?: boolean;
  showMemberArea?: boolean;
  forceMode?: Mode;
}) {
  const [signedIn, setSignedIn] = useState(startSignedIn);

  // Light/dark resolution: an explicit user `override` always wins; otherwise we
  // follow the system preference (`systemMode`). Starts "light" for a stable
  // SSR/first paint, then a mount effect syncs to the real system preference.
  const [override, setOverride] = useState<Mode | null>(null);
  const [systemMode, setSystemMode] = useState<Mode>("light");

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => setSystemMode(mq.matches ? "dark" : "light");
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const theme = useMemo(() => resolveTheme(config), [config]);
  const activeMode: Mode = forceMode ?? override ?? systemMode;
  const vars = useMemo(
    () => themeToVars(activeMode === "dark" ? theme.dark : theme.light, theme.fonts),
    [theme, activeMode],
  );

  const value = useMemo<DemoAuthValue>(
    () => ({
      config,
      signedIn,
      signIn: () => setSignedIn(true),
      signOut: () => setSignedIn(false),
    }),
    [config, signedIn],
  );

  return (
    <DemoAuthContext.Provider value={value}>
      <div style={vars} className="bg-paper text-ink">
        {children}
        {showMemberArea && <MemberArea />}
        {!forceMode && (
          <button
            onClick={() => setOverride(activeMode === "dark" ? "light" : "dark")}
            aria-label="Toggle light/dark"
            className="fixed bottom-4 right-4 z-[60] flex h-10 w-10 items-center justify-center rounded-full border border-edge bg-card text-ink-soft shadow-lg backdrop-blur transition-colors hover:text-ink"
          >
            {activeMode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        )}
      </div>
    </DemoAuthContext.Provider>
  );
}
