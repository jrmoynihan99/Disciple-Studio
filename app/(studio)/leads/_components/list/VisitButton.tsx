"use client";

import type { IndexRow } from "@/lib/leads/engine/types";
import { hostOf, safeUrl } from "@/lib/leads/engine/url";
import { SafeLink } from "../SafeLink";

/**
 * "Open this church's website" — the most-clicked control in the console.
 *
 * The reviewer's loop is scan, open the site, judge, mark. This is the "open"
 * and it is pressed thousands of times, so three things decide where it goes:
 *
 *  · IT BELONGS TO THE CHURCH'S IDENTITY, not to its contact list. It used to be
 *    the first line of the contact strip, sitting with the staff emails — but
 *    emails are for AFTER you decide, and the website is how you decide. Reading
 *    order put it 40px below the name it refers to, behind a rule.
 *  · IT IS COLUMN-ALIGNED. Left edge flush with the meta line on every row, so
 *    running down a page of 60 it is always at the same x. A target you do not
 *    have to look for is the whole point at this volume.
 *  · IT IS A BUTTON, NOT 11px OF MONO TEXT. 36px tall with a real fill — Fitts's
 *    law on the one control that carries the workflow.
 *
 * It names the host rather than saying "website": you are leaving for a
 * church-controlled site, the domain is itself a triage signal, and seeing where
 * the click goes is how a reviewer catches a wrong record before spending it.
 */
export function VisitButton({ row }: { row: IndexRow }) {
  // `own_url` first, the Church Center page only as a fallback — the church's
  // own site is what a reviewer is judging.
  const site = safeUrl(row.u) || safeUrl(row.cu);
  const host = hostOf(site);

  if (!site) {
    return (
      <span className="mt-2.5 inline-flex h-9 items-center rounded-lg border border-dashed border-lead-line px-3 font-mono text-[11px] text-lead-ink2">
        no website on file
      </span>
    );
  }

  return (
    <SafeLink
      href={site}
      title={`Open ${host || site} in a new tab`}
      // The row itself is a click target that opens the dossier; this must not
      // also do that.
      stopPropagation
      className="mt-2.5 inline-flex h-9 max-w-full items-center gap-2 rounded-lg bg-lead-brand pr-4 pl-3.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
    >
      <span aria-hidden="true" className="text-[15px] leading-none">
        ↗
      </span>
      <span className="truncate">Visit {host || "website"}</span>
    </SafeLink>
  );
}
