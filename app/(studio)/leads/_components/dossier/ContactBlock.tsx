"use client";

import { useState } from "react";
import type { ChurchRecord } from "@/lib/leads/engine/types";
import { safeEmail } from "@/lib/leads/engine/url";
import { decodeEntities } from "@/lib/leads/engine/text";
import { SafeLink } from "../SafeLink";

/**
 * `contactBlock` from core.js — who to actually reach out to.
 *
 * The rule the original is built around: when NOBODY is reachable, say so.
 * A roster of names with no way to contact any of them is worse than an empty
 * block, because it looks like an answer.
 *
 * Every address is offered TWICE — an action link that opens a mail client, and
 * the literal address next to a Copy button. A `mailto:` only works if the
 * reader has a client wired up, and plenty of people read mail in a browser tab.
 *
 * Each address carries its OWN label out of the pipeline — "Generic church
 * email" for info@, "Staff email (unattributed)" for a name-shaped one. The old
 * blanket "Email the church" was a claim ABOUT the address, and a false one for
 * the many that are somebody's personal inbox.
 */

interface Person {
  name?: string;
  role_label?: string;
  title?: string;
  email?: string;
}
interface ChurchEmail {
  email?: string;
  label?: string;
}
interface Contact {
  recommended?: Person[];
  church_emails?: ChurchEmail[];
  comms?: Person | null;
  note?: string;
  phone?: string;
  social?: Record<string, string>;
  roster?: { name?: string; title?: string; email?: string; count?: number }[];
}

function MailRow({ email, action }: { email: string; action: string }) {
  const [copied, setCopied] = useState(false);
  const e = safeEmail(email);
  if (!e) return null;

  return (
    <div className="mt-1">
      <a href={`mailto:${e}`} className="text-lead-link hover:underline">
        {action}
      </a>
      <div className="mt-0.5 flex items-center gap-2">
        <code className="min-w-0 truncate font-mono text-[11px] text-lead-ink">{e}</code>
        <button
          type="button"
          title={`Copy ${e}`}
          aria-label={`Copy ${e}`}
          onClick={() => {
            // `navigator.clipboard` needs a secure context. Nothing is retried
            // silently — the label only says "Copied" when it actually was.
            navigator.clipboard?.writeText(e).then(
              () => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              },
              () => setCopied(false),
            );
          }}
          className={`shrink-0 rounded border border-lead-line px-1.5 py-px font-mono text-[9.5px] tracking-wide uppercase ${
            copied ? "border-lead-good text-lead-good" : "text-lead-ink2 hover:text-lead-ink"
          }`}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

const firstName = (n: string | undefined) => String(n ?? "").split(" ")[0] || "them";

export function ContactBlock({ record }: { record: ChurchRecord }) {
  const c = (record.contact ?? null) as Contact | null;
  if (!c) return null;

  const recommended = (c.recommended ?? []).filter((p) => p?.name);
  const churchEmails = (c.church_emails ?? []).filter((e) => safeEmail(e.email));
  const social = Object.entries(c.social ?? {}).filter(([, u]) => u);
  const roster = c.roster ?? [];
  const comms = c.comms;
  const showComms = comms?.name && !recommended.some((p) => p.name === comms.name);

  return (
    <section className="mt-5 border-t border-dashed border-lead-line pt-3 text-xs leading-[1.85] text-lead-ink2">
      <h4 className="mb-1 font-mono text-[10px] tracking-[.1em] text-lead-ink2 uppercase">
        Contact Church
      </h4>

      {recommended.length > 0 ? (
        <>
          <p className="text-lead-ink2">Best people to reach out to</p>
          <ul className="mt-1 space-y-2">
            {recommended.map((p, i) => (
              <li key={`${p.name}-${i}`}>
                <b className="font-semibold text-lead-ink">{decodeEntities(p.name)}</b>{" "}
                {p.role_label && (
                  <span className="rounded-full border border-lead-line px-1.5 py-px font-mono text-[9px] font-bold tracking-wide text-lead-brand uppercase">
                    {p.role_label}
                  </span>
                )}
                {p.title && <div className="text-lead-ink2">{decodeEntities(p.title)}</div>}
                {p.email && (
                  <MailRow email={p.email} action={`Email ${firstName(p.name)}`} />
                )}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          {/* The honest statement of "nobody is reachable", verbatim from the
              pipeline — it explains WHY, which a generic empty state cannot. */}
          {c.note && <p className="text-lead-ink2 italic">{c.note}</p>}
          {churchEmails.map((e, i) => (
            <MailRow
              key={`${e.email}-${i}`}
              email={e.email!}
              action={e.label || "Email the church"}
            />
          ))}
          {c.phone && (
            <p className="mt-1">
              phone: <b className="font-semibold text-lead-ink">{c.phone}</b>
            </p>
          )}
        </>
      )}

      {social.length > 0 && (
        <p className="mt-1">
          {social.map(([k, u], i) => (
            <span key={k}>
              {i > 0 && " · "}
              <SafeLink href={u} className="text-lead-link hover:underline">
                {k}
              </SafeLink>
            </span>
          ))}
        </p>
      )}

      {/* The comms lead even when unreachable — knowing WHO is still worth
          something on a cold call. */}
      {showComms && (
        <p className="mt-1.5">
          Communications lead: <b className="font-semibold text-lead-ink">{decodeEntities(comms!.name)}</b>
          {comms!.title ? ` — ${decodeEntities(comms!.title)}` : ""}
          {comms!.email ? (
            <MailRow email={comms!.email!} action={`Email ${firstName(comms!.name)}`} />
          ) : (
            " · no email published"
          )}
        </p>
      )}

      {roster.length > 0 && (
        <details className="mt-1.5 text-xs">
          <summary className="cursor-pointer font-mono text-[11px] text-lead-link">
            staff roster ({roster.length})
          </summary>
          <ul className="mt-[5px] pl-[15px]">
            {roster.map((s, i) => (
              <li key={`${s.name}-${i}`} className="break-inside-avoid">
                {decodeEntities(s.name)}
                {s.count && s.count > 1 ? ` ×${s.count}` : ""}
                {s.title ? ` — ${decodeEntities(s.title)}` : ""}
                {safeEmail(s.email) && (
                  <>
                    {" · "}
                    <a
                      href={`mailto:${safeEmail(s.email)}`}
                      className="break-all text-lead-link hover:underline"
                    >
                      {safeEmail(s.email)}
                    </a>
                  </>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
