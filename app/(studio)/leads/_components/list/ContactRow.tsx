"use client";

import { useState } from "react";
import type { IndexRow } from "@/lib/leads/engine/types";
import { safeEmail, safeUrl, shortUrl } from "@/lib/leads/engine/url";
import { SafeLink } from "../SafeLink";

const SOCIAL_LABEL: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
  x: "X",
  twitter: "X",
};

/**
 * An address is offered twice: an action link that opens a mail client, and the
 * literal string to copy. A `mailto:` only works if the reader has a client
 * wired up, and plenty read mail in a browser tab.
 */
function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);

  return (
    <button
      type="button"
      title={`Copy ${text}`}
      aria-label={`Copy ${text}`}
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard?.writeText(text).then(
          () => {
            setDone(true);
            setTimeout(() => setDone(false), 1200);
          },
          () => {},
        );
      }}
      className={`shrink-0 rounded border px-1.5 py-px text-[9.5px] tracking-wide uppercase transition-colors ${
        done
          ? "border-lead-good text-lead-good"
          : "border-lead-line bg-lead-panel2 text-lead-ink2 hover:text-lead-ink"
      }`}
    >
      {done ? "Copied" : "Copy"}
    </button>
  );
}

function Line({
  role,
  who,
  children,
}: {
  role: string;
  who?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="shrink-0 rounded-full border border-lead-line px-1.5 py-px text-[9px] font-bold tracking-wide whitespace-nowrap text-lead-brand uppercase">
        {role}
      </span>
      {who && <span className="min-w-0 truncate text-lead-ink">{who}</span>}
      {children}
    </div>
  );
}

export function ContactRow({ row }: { row: IndexRow }) {
  const emails = (row.em ?? []).filter((c) => safeEmail(c.e));

  const socials = Object.entries(row.so ?? {}).filter(([, u]) => safeUrl(u));
  const phone = (row.ph ?? "").trim();

  return (
    <div className="col-span-full mt-2 flex flex-col gap-1 border-t border-lead-line pt-2 font-mono text-[11px]">
      {/* The website link used to lead this block. It moved up beside the
          church's name (see VisitButton) — this strip is about WHO TO CONTACT,
          which is the phase after you have decided, and mixing the two put the
          most-used control in the least likely place to look for it. */}
      {emails.length > 0 ? (
        emails.map((c) => {
          const e = safeEmail(c.e);
          return (
            <Line key={e} role={c.r || "Staff"} who={c.l}>
              <a
                href={`mailto:${e}`}
                title={e}
                onClick={(ev) => ev.stopPropagation()}
                className="break-all text-lead-link hover:underline"
              >
                {e}
              </a>
              <CopyButton text={e} />
            </Line>
          );
        })
      ) : (
        <>
          {/* No email → the phone AND every social account, in that order.
              This used to be phone-OR-socials, which quietly re-created the bug
              it was written to fix: a church with a phone had its Facebook and
              Instagram suppressed, so "phone is all we found" was an assertion
              the row could not back up. */}
          {phone && (
            <Line role="Phone" who="no email found">
              <a
                href={`tel:${phone.replace(/[^+\d]/g, "")}`}
                onClick={(ev) => ev.stopPropagation()}
                className="text-lead-link hover:underline"
              >
                {phone}
              </a>
              <CopyButton text={phone} />
            </Line>
          )}

          {socials.length > 0 && (
            <>
              <div className="text-lead-ink2">
                {phone ? "Also published:" : "No email or phone number found — only these:"}
              </div>
              {socials.map(([k, u]) => (
                // A social account is a PLACE YOU GO, not a string you paste
                // into an email client — so no Copy button. It therefore has to
                // read as clickable on its own, hence the underline.
                <Line key={k} role={SOCIAL_LABEL[k] ?? k}>
                  <SafeLink
                    href={u}
                    title={u}
                    stopPropagation
                    className="min-w-0 truncate text-lead-link underline decoration-lead-line hover:decoration-current"
                  >
                    {shortUrl(u)}
                  </SafeLink>
                </Line>
              ))}
            </>
          )}

          {!phone && socials.length === 0 && (
            <span className="text-lead-ink2">No emailable contact found.</span>
          )}
        </>
      )}
    </div>
  );
}
