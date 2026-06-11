import type { Metadata } from "next";
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
  title: "Disciple Studio — Custom Church Websites Built By Disciples, To Disciple",
  description:
    "Custom church websites that sync with your tools, are easy for staff to run, and built to disciple. Pay once, own it forever",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${hanken.variable} ${jetbrains.variable} scroll-smooth`}
    >
      <body className="overflow-x-hidden bg-paper font-sans leading-normal text-ink antialiased [text-rendering:optimizeLegibility] selection:bg-accent selection:text-white">
        {children}
      </body>
    </html>
  );
}
