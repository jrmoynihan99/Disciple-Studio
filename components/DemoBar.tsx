"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

/**
 * The thin chrome that frames a church demo: it tells the viewer this is a live
 * demo we built for them, gives them the controls to play with (design
 * directions + light/dark), and keeps a "Let's Chat" CTA one glance away the
 * whole time. Dismissible — the closing CTA at the bottom is the other place the
 * ask lives, so losing this bar never loses the CTA.
 *
 * Styled with the injected demo palette tokens, so it adapts to light/dark and
 * matches whichever template is showing.
 */
export default function DemoBar({
  churchName,
  bookHref,
  sticky = true,
  templates,
  activeTemplate,
  onTemplateChange,
}: {
  churchName: string;
  bookHref: string;
  /** Sticky on the public demo; inline (non-sticky) inside the admin preview. */
  sticky?: boolean;
  /** When provided, render the design-direction switcher. Omitted in the editor,
   *  where the form is the source of truth for the template. */
  templates?: { key: string; label: string }[];
  activeTemplate?: string;
  onTemplateChange?: (key: string) => void;
}) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  const showSwitcher = templates && templates.length > 1 && onTemplateChange;

  return (
    <div
      className={`${sticky ? "sticky top-0" : ""} z-[60] border-b border-edge bg-card/90 backdrop-blur-md`}
    >
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:px-6">
        {/* Framing — who this was built for */}
        <div className="order-1 flex min-w-0 flex-1 items-center gap-2">
          <span className="h-1.5 w-1.5 flex-none rounded-full bg-brand" aria-hidden />
          <span className="truncate text-[12.5px] leading-tight text-ink-soft">
            A live demo, built for{" "}
            <span className="font-semibold text-ink">{churchName}</span>
          </span>
        </div>

        {/* Design directions — own row on mobile, inline on desktop */}
        {showSwitcher && (
          <div className="order-3 w-full sm:order-2 sm:w-auto">
            <div className="flex items-center gap-1 rounded-full border border-edge bg-paper p-0.5">
              <span className="hidden px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint lg:inline">
                Layout
              </span>
              {templates.map((t) => {
                const isActive = t.key === activeTemplate;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => onTemplateChange(t.key)}
                    aria-pressed={isActive}
                    className={`flex-1 whitespace-nowrap rounded-full px-3 py-1 text-[12px] font-medium transition-colors sm:flex-none ${
                      isActive
                        ? "bg-brand text-on-accent"
                        : "text-ink-soft hover:text-ink"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Controls + CTA */}
        <div className="order-2 flex flex-none items-center gap-2 sm:order-3">
          <ThemeToggle className="flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-full border border-edge bg-paper text-ink-soft transition-colors hover:text-ink" />
          <Link
            href={bookHref}
            className="inline-flex flex-none items-center gap-1.5 rounded-full bg-brand px-3.5 py-1.5 text-[12.5px] font-semibold text-on-accent transition-opacity hover:opacity-90"
          >
            Let{"’"}s Chat
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <button
            type="button"
            onClick={() => setHidden(true)}
            aria-label="Hide this bar"
            className="flex-none rounded-full p-1 text-ink-muted transition-colors hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
