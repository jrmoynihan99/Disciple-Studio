import type { ReactNode } from "react";
import Providers from "@/components/layout/Providers";

/**
 * Layout for the public marketing site (/, /website, /app, /cms, /about-us,
 * /book).
 *
 * It lives in a route group so the dark surface and the scroll/transition
 * providers wrap these pages and nothing else — the group adds no URL
 * segment, so `(site)/page.tsx` is `/`. The demo studio next door,
 * `app/(studio)`, needs a light paper surface and its own token set, which is
 * why the two are separate groups under one root layout rather than a single
 * shared one.
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      {/* data-surface drives the dark scrollbar override in globals.css */}
      <div
        data-surface="night"
        className="min-h-screen overflow-x-clip bg-night text-paper"
      >
        {children}
      </div>
    </Providers>
  );
}
