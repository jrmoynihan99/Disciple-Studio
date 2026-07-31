import type { Metadata } from "next";

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
 * The pre-paint script sets the theme before first paint. Without it a
 * dark-preference user gets a white flash, and — worse for this product — a
 * verdict colour briefly rendered from the wrong token set. A colour that
 * appears before its data has arrived is a claim we did not verify.
 */
const THEME_BOOTSTRAP = `try{
  var t = localStorage.getItem('leads-theme');
  if (t !== 'light' && t !== 'dark') {
    t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-lead-theme', t);
}catch(e){
  document.documentElement.setAttribute('data-lead-theme','light');
}`;

export default function LeadsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      <div data-lead-root className="min-h-screen bg-lead-bg text-lead-ink">
        {children}
      </div>
    </>
  );
}
