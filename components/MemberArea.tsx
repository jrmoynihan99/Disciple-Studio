"use client";

import { useRef, useState } from "react";
import { LogIn } from "lucide-react";
import { useDemoAuth } from "./DemoChrome";
import MemberMenu from "./MemberMenu";

/**
 * The fixed top-right control on every demo page.
 *  - Signed out → a "Sign in" button. Clicking it signs the visitor in as the
 *    demo member AND opens the dropdown, so the reveal happens in one motion.
 *  - Signed in  → the member's avatar/initials, toggling the dropdown.
 *
 * The button is rendered here; the dropdown panel lives in <MemberMenu> (a
 * portal), so a template's own nav can also host this control later.
 */
export default function MemberArea() {
  const { config, signedIn, signIn, signOut } = useDemoAuth();
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const { firstName, lastName } = config.demoMember;
  const initials = `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();

  function handleClick() {
    if (!signedIn) {
      signIn();
      setOpen(true); // reveal the track immediately
    } else {
      setOpen((o) => !o);
    }
  }

  return (
    <div className="fixed right-4 top-4 z-50 md:right-6 md:top-6">
      {signedIn ? (
        <button
          ref={anchorRef}
          onClick={handleClick}
          aria-label="Open member menu"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface-elevated text-sm font-semibold text-fg-secondary backdrop-blur-xl transition-colors hover:border-line-hover"
        >
          {initials || "?"}
        </button>
      ) : (
        <button
          ref={anchorRef}
          onClick={handleClick}
          className="flex items-center gap-2 rounded-full border border-line bg-surface-elevated px-4 py-2 text-sm font-medium text-fg backdrop-blur-xl transition-colors hover:border-line-hover"
        >
          <LogIn className="h-4 w-4" />
          Sign in
        </button>
      )}

      <MemberMenu
        isOpen={signedIn && open}
        anchorRef={anchorRef}
        config={config}
        onSignOut={() => {
          setOpen(false);
          signOut();
        }}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}
