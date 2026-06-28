"use client";

import { useState } from "react";
import { ArrowRight, X } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

/**
 * The persistent CTA bar on a demo. The pre-screen handles the "what is this?",
 * so this bar's job is to make the next step obvious: a short hook + the brand
 * "Let's Chat" button as the visual anchor, with the design-direction switcher
 * and light/dark toggle demoted to secondary controls. Dismissible — the closing
 * CTA at the bottom is the other place the ask lives.
 *
 * Styled with the injected demo palette tokens, so it adapts to light/dark and
 * matches whichever template is showing.
 */
export default function DemoBar({
  bookHref,
  sticky = true,
  templates,
  activeTemplate,
  onTemplateChange,
}: {
  bookHref: string;
  /** Sticky on the public demo; inline (non-sticky) inside the admin preview. */
  sticky?: boolean;
  /** When provided, render the design-direction switcher. */
  templates?: { key: string; label: string }[];
  activeTemplate?: string;
  onTemplateChange?: (key: string) => void;
}) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  const showSwitcher = templates && templates.length > 1 && onTemplateChange;

  // Public demo: a bottom bar on mobile (easy thumb reach), a top bar on
  // desktop. Editor preview (`sticky` false): inline, bottom border only.
  const position = sticky
    ? "fixed inset-x-0 bottom-0 border-t sm:sticky sm:inset-x-auto sm:bottom-auto sm:top-0 sm:border-b sm:border-t-0"
    : "border-b";

  return (
    <div
      className={`z-[60] border-edge bg-card/90 backdrop-blur-md ${position}`}
    >
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
        {/* Controls — secondary. Own row on mobile, right side on desktop. */}
        <div className="order-1 flex w-full items-center justify-center gap-2 sm:order-2 sm:w-auto sm:flex-none sm:justify-end">
          {showSwitcher && (
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
                    className={`whitespace-nowrap rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
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
          )}
          <ThemeToggle className="flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-full border border-edge bg-paper text-ink-soft transition-colors hover:text-ink" />
        </div>

        {/* CTA — primary. Bottom row on mobile, left side on desktop. */}
        <div className="order-2 flex w-full items-center justify-between gap-2 sm:order-1 sm:w-auto sm:flex-1 sm:justify-start">
          <span className="text-[13px] font-semibold leading-tight text-ink">
            Want this for your church?
          </span>
          <div className="flex flex-none items-center gap-2">
            {/* Plain <a> (full page nav) so the studio's dark CSS can't bleed
                onto /book during a client-side transition. */}
            <a
              href={bookHref}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-[13px] font-bold text-on-accent shadow-[0_6px_18px_-8px_rgb(var(--brand)_/_0.7)] transition-opacity hover:opacity-90"
            >
              Let{"’"}s Chat
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
