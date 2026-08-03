import type { Metadata, Viewport } from "next";
import { Newsreader, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title:
    "Disciple Studio — We build websites that help churches make disciples.",
  description:
    "Custom church websites that sync with your tools, are easy for staff to run, and built to disciple. Pay once, own it forever",
  openGraph: {
    images: ["/jason.jpg"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Opt the viewport in to drawing under the safe-area insets, so page
  // content bleeds up into the status-bar region instead of stopping below
  // it. Deliberately NO themeColor: iOS 26 Safari renders its top/bottom
  // bars as translucent "liquid glass" that content scrolls behind — but
  // ONLY when no <meta name="theme-color"> is present. Set one and Safari
  // paints the status bar as a solid tint of that color instead. What the
  // glass reads is whatever paints the root element, which globals.css
  // switches to night on the dark marketing pages.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // Page-transition variant (globals.css): fade | rise | blur | zoom | veil
      // No scroll-smooth here — it fights Lenis and would animate the instant
      // scroll restoration inside the view-transition update window.
      data-page-transition="fade"
      className={`${newsreader.variable} ${hanken.variable} ${jetbrains.variable}`}
      // The Lead Console stamps `data-lead-theme` here from an inline script
      // that must run BEFORE first paint — otherwise a dark-preference user
      // gets a white flash, and, worse for that product, a verdict colour
      // briefly painted from the wrong token set. The server cannot know the
      // preference, so the attribute legitimately differs at hydration. This
      // suppresses the warning for THIS element's attributes only, never for
      // its subtree; it is the same mechanism next-themes uses.
      suppressHydrationWarning
    >
      <body className="overflow-x-hidden bg-paper font-sans leading-normal text-ink antialiased [text-rendering:optimizeLegibility] selection:bg-accent selection:text-white">
        {/* THE LEAD CONSOLE'S THEME, SET BEFORE ANYTHING PAINTS.

            Here rather than in `app/(studio)/leads/layout.tsx`, where it belongs
            by subject matter, for one mechanical reason: a `<script>` React
            CREATES on the client never executes, so the same element in a nested
            layout did nothing on a client-side navigation into /leads — React
            warns about exactly this. The root layout is only ever hydrated,
            never client-created, so the element here is real HTML the browser
            runs as it parses. That is the whole point: `next/script` defers, an
            effect runs after hydration, and either one lets a dark-preference
            reviewer see a frame of the light token set — a verdict colour
            painted from the wrong palette, which for this product is worse than
            a flash.

            PATH-GATED, and that is load-bearing rather than tidiness.
            `html[data-lead-theme]` doubles as the console's route marker in
            `leads-theme.css` — it is how the console gets its scrollbars back
            without leaking them into /studio and /admin — so stamping it on
            every page would quietly break that. `LeadThemeGuard` handles the
            client-navigation case from inside the console. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if (location.pathname === '/leads' || location.pathname.indexOf('/leads/') === 0) {
  var t = 'light';
  try {
    var s = localStorage.getItem('leads-theme');
    t = (s === 'light' || s === 'dark')
      ? s
      : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  } catch (e) { /* private mode: light, which is what the server rendered */ }
  document.documentElement.setAttribute('data-lead-theme', t);
}`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
