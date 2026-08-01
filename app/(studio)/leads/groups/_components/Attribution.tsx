"use client";

import { SafeLink } from "../../_components/SafeLink";
import { hostOf } from "@/lib/leads/engine/url";
import type { Attribution } from "@/lib/leads/engine/group-types";

/**
 * THE ONLY COMPONENT THAT MAY RENDER A SOURCE LINE.
 *
 * The reason it is the only one is the reason it takes a union: `Attribution`'s
 * `edited` and `user` variants have no `sourceUrl` field at all, so this switch
 * physically cannot cite a page for a sentence a person wrote. Spread the same
 * logic across five components and the fourth one grows an `item.sourceUrl &&
 * <a>` because the object it happened to be holding still had the key.
 *
 * That is not hypothetical. The audit's existing quote check walks record JSON
 * and inherits `source_url` from any ancestor, so an edited quote stored beside
 * the pipeline's original URL passes it green.
 */
export function AttributionLine({
  attribution,
  onRevert,
}: {
  attribution: Attribution;
  onRevert?: () => void;
}) {
  // `px-2` matches EditableText's own padding so the citation lines up with the
  // text it is about. Without it every quote on the page has a ragged left edge,
  // because the editable value is inset by its click target and this is not.
  const base = "mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 px-2 font-mono text-[10px]";

  switch (attribution.kind) {
    case "cited":
      return (
        <p data-attribution="cited" className={`${base} text-lead-ink2`}>
          {attribution.verified && (
            <span data-verified className="rounded bg-lead-panel2 px-1.5 py-px">
              {attribution.verified}
            </span>
          )}
          <SafeLink
            href={attribution.sourceUrl}
            title={attribution.sourceUrl}
            className="underline decoration-dotted underline-offset-2 hover:text-lead-link"
          >
            <span data-source>{hostOf(attribution.sourceUrl) || attribution.sourceUrl}</span>
          </SafeLink>
        </p>
      );

    case "uncited":
      return (
        <p data-attribution="uncited" className={`${base} text-lead-ink2 opacity-70`}>
          {attribution.note}
        </p>
      );

    case "edited":
      // No link, and the wording says why: the text no longer matches the page,
      // so pointing at the page would be asserting something false about a real
      // church. The original is offered back rather than thrown away.
      return (
        <p data-attribution="edited" className={`${base} text-lead-warn`}>
          <span>edited — no longer the church&rsquo;s words</span>
          {onRevert && (
            <button
              type="button"
              onClick={onRevert}
              className="underline underline-offset-2 hover:text-lead-ink"
              title={`Original: ${attribution.wasVerbatim || "(empty)"}`}
            >
              revert
            </button>
          )}
        </p>
      );

    case "user":
      return (
        <p data-attribution="user" className={`${base} text-lead-brand`}>
          added by you — not from the church&rsquo;s site
        </p>
      );
  }
}
