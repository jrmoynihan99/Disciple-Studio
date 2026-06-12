"use client";

/**
 * Temporary review tool: renders one of the four hero candidates with a
 * floating picker. Delete this (and the losing variants) once a winner
 * is chosen, and mount the winner directly in page.tsx.
 */
import { useState } from "react";
import HeroFaces from "./HeroFaces";
import HeroLetter from "./HeroLetter";
import HeroRecast from "./HeroRecast";
import HeroPhoto from "./HeroPhoto";

const VARIANTS = [
  { label: "A · Faces", C: HeroFaces },
  { label: "B · Letter", C: HeroLetter },
  { label: "C · Recast", C: HeroRecast },
  { label: "D · Photo", C: HeroPhoto },
];

export default function HeroSwitcher() {
  const [i, setI] = useState(0);
  const Active = VARIANTS[i].C;
  return (
    <>
      <Active />
      <div className="fixed bottom-5 left-1/2 z-[80] flex -translate-x-1/2 items-center gap-1 rounded-full border border-line bg-card/95 p-1.5 shadow-[0_20px_40px_-18px_rgba(28,24,19,0.5)] backdrop-blur">
        <span className="px-2.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted max-[560px]:hidden">
          Hero preview
        </span>
        {VARIANTS.map((v, k) => (
          <button
            key={v.label}
            onClick={() => setI(k)}
            className={`cursor-pointer rounded-full px-3.5 py-2 text-[12.5px] font-medium transition-colors ${
              k === i
                ? "bg-ink text-paper"
                : "text-ink-soft hover:bg-paper-2"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>
    </>
  );
}
