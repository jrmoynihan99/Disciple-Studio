"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ChurchConfig } from "@/lib/types";
import { resolveTheme, themeToVars } from "@/lib/themes";
import MemberArea from "./MemberArea";

/**
 * Demo "auth" — there is no real authentication. `signedIn` starts true (demos
 * load already "as" the member). Flip it off to inspect the signed-out state.
 */
type Mode = "light" | "dark";

type DemoAuthValue = {
  config: ChurchConfig;
  signedIn: boolean;
  signIn: () => void;
  signOut: () => void;
  /** Active light/dark mode, and a toggler. `canToggle` is false when a mode is
   * pinned by the admin preview (`forceMode`), in which case controls hide. */
  mode: Mode;
  toggleMode: () => void;
  canToggle: boolean;
};

const DemoAuthContext = createContext<DemoAuthValue | null>(null);

/** Read the demo auth state from inside a template (optional). */
export function useDemoAuth(): DemoAuthValue {
  const ctx = useContext(DemoAuthContext);
  if (!ctx) throw new Error("useDemoAuth must be used within <DemoChrome>");
  return ctx;
}

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
    () => themeToVars(activeMode === "dark" ? theme.dark : theme.light, theme.fonts, activeMode),
    [theme, activeMode],
  );

  const value = useMemo<DemoAuthValue>(
    () => ({
      config,
      signedIn,
      signIn: () => setSignedIn(true),
      signOut: () => setSignedIn(false),
      mode: activeMode,
      toggleMode: () => setOverride(activeMode === "dark" ? "light" : "dark"),
      canToggle: !forceMode,
    }),
    [config, signedIn, activeMode, forceMode],
  );

  return (
    <DemoAuthContext.Provider value={value}>
      <div style={vars} className="bg-paper text-ink">
        {children}
        {showMemberArea && <MemberArea />}
      </div>
    </DemoAuthContext.Provider>
  );
}
