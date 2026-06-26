import { Newsreader, Hanken_Grotesk, Spectral } from "next/font/google";

/**
 * Fonts used by the dashboard templates. Each is exposed as a CSS variable
 * attached to <body> in the root layout, then mapped to a Tailwind font token
 * in globals.css (font-sans / font-serif / font-spectral).
 *  - Hanken Grotesk → font-sans (all templates' body)
 *  - Newsreader     → font-serif (editorial, warm-bento)
 *  - Spectral       → font-spectral (warm-guide)
 */
export const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
  variable: "--font-newsreader",
  display: "swap",
});

export const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hanken",
  display: "swap",
});

export const spectral = Spectral({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
  variable: "--ff-spectral",
  display: "swap",
});
