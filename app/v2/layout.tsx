import type { Metadata } from "next";
import { Caveat, Lora } from "next/font/google";

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title:
    "disciple.studio — Custom church websites built by disciples, to disciple",
  description:
    "We're Jason and Arjun. We met at our church, came to faith together, and now serve the kingdom by building church websites that help people find and follow Jesus.",
};

export default function V2Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div
      className={`${lora.variable} ${caveat.variable} bg-nb-paper font-nb-serif leading-[1.72] text-nb-ink [background-image:radial-gradient(rgba(91,74,50,0.07)_1px,transparent_1px)] [background-size:26px_26px] selection:bg-nb-sel selection:text-nb-ink`}
    >
      {children}
    </div>
  );
}
