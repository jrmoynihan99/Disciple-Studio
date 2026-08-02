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
/**
 * Class strings only. THE DOM SHAPE IS NOT SKINNABLE — the `data-attribution`
 * kinds, the `data-source` span living only inside `cited`, and the absence of
 * any link on `edited` are the contract `/leads/audit` walks, and a skin that
 * could move them would be a skin that could break the one guarantee this file
 * exists to make.
 */
export interface AttributionSkin {
  base: string;
  cited: string;
  uncited: string;
  edited: string;
  user: string;
  verified: string;
  link: string;
  revert: string;
}

export const CONSOLE_ATTRIBUTION: AttributionSkin = {
  // `px-2` matches EditableText's own padding so the citation lines up with the
  // text it is about. Without it every quote on the page has a ragged left edge,
  // because the editable value is inset by its click target and this is not.
  base: "mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 px-2 font-mono text-[10px]",
  cited: "text-lead-ink2",
  uncited: "text-lead-ink2 opacity-70",
  edited: "text-lead-warn",
  user: "text-lead-brand",
  verified: "rounded bg-lead-panel2 px-1.5 py-px",
  link: "underline decoration-dotted underline-offset-2 hover:text-lead-link",
  revert: "underline underline-offset-2 hover:text-lead-ink",
};

export function AttributionLine({
  attribution,
  onRevert,
  skin = CONSOLE_ATTRIBUTION,
}: {
  attribution: Attribution;
  onRevert?: () => void;
  skin?: AttributionSkin;
}) {
  const base = skin.base;

  switch (attribution.kind) {
    case "cited":
      return (
        <p data-attribution="cited" className={`${base} ${skin.cited}`}>
          {attribution.verified && (
            <span data-verified className={skin.verified}>
              {attribution.verified}
            </span>
          )}
          <SafeLink href={attribution.sourceUrl} title={attribution.sourceUrl} className={skin.link}>
            <span data-source>{hostOf(attribution.sourceUrl) || attribution.sourceUrl}</span>
          </SafeLink>
        </p>
      );

    case "uncited":
      return (
        <p data-attribution="uncited" className={`${base} ${skin.uncited}`}>
          {attribution.note}
        </p>
      );

    case "edited":
      // No link, and the wording says why: the text no longer matches the page,
      // so pointing at the page would be asserting something false about a real
      // church. The original is offered back rather than thrown away.
      return (
        <p data-attribution="edited" className={`${base} ${skin.edited}`}>
          <span>edited — no longer the church&rsquo;s words</span>
          {onRevert && (
            <button
              type="button"
              onClick={onRevert}
              className={skin.revert}
              title={`Original: ${attribution.wasVerbatim || "(empty)"}`}
            >
              revert
            </button>
          )}
        </p>
      );

    case "user":
      return (
        <p data-attribution="user" className={`${base} ${skin.user}`}>
          added by you — not from the church&rsquo;s site
        </p>
      );
  }
}
