import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { newsreader, hanken, spectral } from "@/lib/fonts";
import "./studio-globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Disciple Studio",
  // Keep the builder, the internal index, and the personalized demos out of
  // search results — they're internal tooling and cold outreach, not public.
  robots: { index: false, follow: false },
};

/**
 * Layout for the demo studio routes (/admin, /studio, /c/[slug]).
 *
 * This is what keeps the church-demos design system isolated from the
 * marketing site: it imports `studio-globals.css` (the warm-paper + brand token
 * system, whose utility names like `bg-paper`/`text-ink` deliberately differ in
 * value from the marketing tokens) and the demo fonts. Because this CSS is
 * imported here — not in the root layout — it only loads on these routes, so it
 * can't affect the marketing pages.
 *
 * The wrapper establishes the dark "app chrome" base used by /admin and the
 * index; individual demos paint their own light/dark palette over it via
 * DemoChrome.
 */
export default function StudioLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div
      className={`${inter.className} ${newsreader.variable} ${hanken.variable} ${spectral.variable} min-h-screen bg-surface text-fg antialiased`}
    >
      {children}
    </div>
  );
}