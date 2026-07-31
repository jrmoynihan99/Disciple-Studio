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
        {children}
      </body>
    </html>
  );
}
