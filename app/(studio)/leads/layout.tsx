import type { Metadata } from "next";

import { LeadThemeGuard } from "@/lib/leads/client/theme";

export const metadata: Metadata = {
  title: "Lead Console — Disciple Studio",
  robots: { index: false, follow: false },
};

/**
 * The console owns its own surface.
 *
 * The studio layout wraps everything in `bg-surface text-fg` (its dark app
 * chrome). The console overrides that with its own `--lead-*` palette, because
 * its light and dark are a distinct token set tuned around seven verdict hues,
 * not a re-skin of the studio chrome.
 *
 * THE PRE-PAINT SCRIPT IS NOT HERE ANY MORE, AND THIS IS WHY.
 *
 * It was a bare `<script dangerouslySetInnerHTML>` in this file, and React warns
 * about precisely what goes wrong with that: *"scripts inside React components
 * are never executed when rendering on the client."* The warning comes from
 * React's `createElement` path, so it fires on a CLIENT-SIDE NAVIGATION and not
 * on a document load — which is exactly the shape of the bug. Arriving at the
 * console from `/studio` left `data-lead-theme` unset: a dark-preference
 * reviewer got the light token set, and since `html[data-lead-theme]` doubles as
 * this route's marker in `leads-theme.css`, the console's scrollbars stayed
 * hidden with it.
 *
 * It moved to `app/layout.tsx`, where the browser parses and runs it
 * synchronously before anything paints — the guarantee it exists for, and one
 * neither `next/script` nor an effect can make. React never re-creates the root
 * layout on a navigation, so there is nothing left for the warning to fire on.
 *
 * `LeadThemeGuard` covers the other way in. It is a LAYOUT effect, so on a
 * client-side navigation it still runs before the browser paints; it only fills
 * in a missing attribute, and both the script and an explicit toggle win over it.
 */

export default function LeadsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LeadThemeGuard />
      <div data-lead-root className="min-h-screen bg-lead-bg text-lead-ink">
        {children}
      </div>
    </>
  );
}
