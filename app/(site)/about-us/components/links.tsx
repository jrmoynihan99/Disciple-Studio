import type { ReactNode } from "react";

/* Renders [label](url) spans inside copy strings as accent links. */
export function withLinks(text: string): ReactNode[] {
  return text.split(/(\[[^\]]+\]\([^)\s]+\))/g).map((part, i) => {
    const m = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (!m) return part;
    return (
      <a
        key={i}
        href={m[2]}
        target="_blank"
        rel="noreferrer"
        className="text-accent-soft underline underline-offset-[3px] transition-colors hover:text-accent-glow"
      >
        {m[1]}
      </a>
    );
  });
}
