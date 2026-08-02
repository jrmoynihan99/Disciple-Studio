"use client";

import { Fragment } from "react";
import type { QuestionKey, QuestionView, SubSignal, VerdictState } from "@/lib/leads/engine/types";
import { safeUrl } from "@/lib/leads/engine/url";
import { rollupWhy } from "@/lib/leads/engine/color";
import { evidenceText } from "@/lib/leads/engine/labels";
import { fillClass } from "../verdict";
import { SafeLink } from "../SafeLink";

/**
 * Evidence rendering — where cite-or-abstain becomes pixels.
 *
 * Three rules that look like styling and are not:
 *
 *  1. A QUOTE NEVER SHIPS WITHOUT ITS SOURCE URL. 30 quotes in the fixture sit
 *     in `q4.subsignals[]` and carry no `source_url` of their own — the URL is
 *     on the parent question, and this component inherits it. Draw them naively
 *     and you ship 30 unattributed quotes.
 *
 *  2. A URL-DERIVED VERDICT IS NEVER DRESSED AS A QUOTE. `evidence_kind: "url"`
 *     means the answer came from the shape of a URL, not from page text.
 *
 *  3. `unread_source` FLIPS THE CAPTION. Calling something a "source" when
 *     nobody opened it is a lie told by formatting.
 */

function SourceLine({
  url,
  unread,
  inherited,
}: {
  url: string;
  unread?: boolean;
  inherited?: boolean;
}) {
  if (!safeUrl(url)) return null;
  return (
    // .dv-src — 10.5px mono, 5px above.
    <div className="mt-[5px] font-mono text-[10.5px] text-lead-ink2">
      {/* "verify at source", not "we did not open this page — check it yourself".
          The old wording told the reader to perform the render check — the very
          step retired upstream, and the reason this question's verdict word is
          deliberately "Can't confirm". One expanded card was issuing an
          instruction and withdrawing it in the same breath.

          It still differs from "source", because rule 3 above stands: we did not
          open this page, and only the caption can say so. */}
      {unread ? "verify at source" : "source"}
      {inherited && !unread ? " (from the parent question)" : ""}:{" "}
      <SafeLink href={url} className="text-lead-link break-all hover:underline" />
    </div>
  );
}

function Quote({
  text,
  verified,
  url,
  unread,
  inherited,
}: {
  text: string;
  verified?: string;
  url?: string;
  unread?: boolean;
  inherited?: boolean;
}) {
  return (
    <div className="my-[7px]">
      {/*
        `.dv-quote` — 14px SERIF on a 2px left rule, per `real-example.html`.

        It had been 11.5px mono in a filled panel, which is `.dv-snip` — the
        style for matched MARKUP. The reference keeps those two apart on purpose:
        a quote is a sentence a human wrote on the church's own website and is
        the most important text in this panel, while a snippet is machine output
        shown small because you only skim it. Rendering the first as the second
        made the evidence look like debug output and shrank it ~20% below
        everything around it.

        No max-height. The panel scrolls; the quote is the product.
      */}
      <blockquote className="border-l-2 border-l-lead-line py-0.5 pl-3 font-serif text-[14px] leading-[1.5] break-words whitespace-pre-wrap text-lead-ink">
        “{text}”
        {/* `verified` proves the span is ON the page. It does NOT prove the span
            is ABOUT the question — that is `quote_confidence`, a different axis.
            Never collapse the two into one "confidence" badge. */}
        {verified && (
          <cite className="mt-[3px] block font-mono text-[10px] not-italic text-lead-ink2">
            verified {verified}
          </cite>
        )}
      </blockquote>
      {url && <SourceLine url={url} unread={unread} inherited={inherited} />}
    </div>
  );
}

/**
 * WHY AN EXPANDED CARD MAY NEVER BE EMPTY.
 *
 * Every block in `EvidenceBody` is conditional and there was no `else`, so a
 * question with no evidence, no quote, no source and no sub-signals rendered a
 * `<div>` containing nothing — while the card still expanded, because the caller
 * gates on the question OBJECT existing rather than on it having anything to
 * say. 35 of 134 churches hit that on the login question alone. A control that
 * opens onto nothing reads as broken, and a reader cannot tell it apart from
 * content that failed to load.
 *
 * TWO MESSAGES, because one would be wrong half the time. "We could not get
 * adequate data" is true of a question we never measured and false of an
 * answered one that simply carries no supporting detail — and printing it on the
 * second claims a gap in our own data that is not there.
 */
function NothingToShow({ answer }: { answer: unknown }) {
  const unmeasured = answer == null || answer === "" || answer === "unknown";
  return (
    <p className="my-1 italic">
      {unmeasured
        ? "Our scrapers and extractors were not able to get adequate data to answer this question."
        : "No further detail was recorded for this finding."}
    </p>
  );
}

export function EvidenceBody({
  q,
  qKey,
}: {
  q: QuestionView & Record<string, unknown>;
  /** Only so the evidence paragraph can be repaired per question. */
  qKey?: QuestionKey;
}) {
  const parentUrl = (q.source_url as string) ?? "";
  const unread = !!q.unread_source;
  const kind = (q.evidence_kind as string) ?? "";

  /**
   * COLLECTED, NOT INLINED, so "did anything render?" is answered by the blocks
   * themselves. Re-testing these seven conditions somewhere else to decide
   * whether to show a fallback is how the two lists drift apart — and the blank
   * space comes back for whichever case nobody remembered to add.
   */
  const blocks: React.ReactNode[] = [];
  const push = (key: string, node: React.ReactNode) => {
    if (node) blocks.push(<Fragment key={key}>{node}</Fragment>);
  };

  // `q.label` is deliberately NOT rendered here. Every call site already shows
  // it as the card's finding — the primary line a reader is looking for — so
  // repeating it inside the expanded body says the same sentence twice.
  const evidence = evidenceText(qKey ?? "", q);
  push("evidence", evidence && <p className="my-1">{evidence}</p>);

  push(
    "unverified",
    /* What the model CLAIMED, the closest text actually on the page, and the
       similarity — with the ANSWER WITHHELD. No real church has ever produced
       this state; it is built against the synthetic record. */
    q.answer === "unverified" && (
      <div className="my-2 rounded-md border border-lead-unver bg-lead-panel2 p-2.5">
        {typeof q.claimed_quote === "string" && q.claimed_quote && (
          <>
            <p className="font-mono text-[9px] tracking-widest text-lead-ink2 uppercase">
              what the model claimed
            </p>
            <blockquote className="my-1 font-serif text-sm text-lead-ink">
              “{q.claimed_quote}”
            </blockquote>
          </>
        )}
        {typeof q.best_match_on_page === "string" && q.best_match_on_page && (
          <>
            <p className="mt-2 font-mono text-[9px] tracking-widest text-lead-ink2 uppercase">
              closest text actually on the page
              {q.similarity != null && ` (similarity ${Number(q.similarity).toFixed(2)})`}
            </p>
            <code className="mt-1 block max-h-32 overflow-auto rounded border border-lead-line bg-lead-bg p-2 font-mono text-[10.5px] break-words whitespace-pre-wrap">
              {q.best_match_on_page}
            </code>
          </>
        )}
        <p className="mt-2 text-[11.5px] italic">
          The claim could not be found on the page, so the answer is withheld.
        </p>
      </div>
    ),
  );

  push(
    "url-verdict",
    // A URL-derived verdict gets its OWN block and different words.
    kind === "url" && parentUrl && (
      <div className="my-2 rounded-md border border-dashed border-lead-line p-2.5">
        <p className="font-mono text-[9px] tracking-widest text-lead-ink2 uppercase">
          verdict derived from the URL, not from page text
        </p>
        <SafeLink
          href={parentUrl}
          className="font-mono text-[11px] break-all text-lead-link hover:underline"
        />
      </div>
    ),
  );

  push(
    "quote",
    typeof q.quote === "string" && q.quote && kind !== "url" && (
      <Quote
        text={q.quote}
        verified={typeof q.verified === "string" ? q.verified : undefined}
        url={parentUrl}
        unread={unread}
      />
    ),
  );

  push(
    "subsignals",
    // Sub-signals. Each may carry a quote and NO url of its own.
    Array.isArray(q.subsignals) && q.subsignals.length > 0 && (
      // .dv-subs / .dv-sub — 12px, 3px apart.
      <div className="my-1.5 flex flex-col gap-[3px] text-xs">
        {(q.subsignals as SubSignal[]).map((s, i) => (
          <div key={i}>
            <div className="flex items-baseline gap-2">
              <i
                className={`relative top-[2px] inline-block size-2 shrink-0 rounded-full ${
                  s.state ? fillClass(s.state as VerdictState) : "bg-lead-unk"
                }`}
              />
              <span>
                <b className="font-semibold text-lead-ink">{s.label}</b>
                {s.value ? `: ${s.value}` : ""}
              </span>
            </div>
            {s.quote && (
              <Quote
                text={s.quote}
                url={s.source_url || parentUrl}
                unread={unread}
                inherited={!s.source_url}
              />
            )}
          </div>
        ))}
        {/* The plain-English reason, so a multi-factor rating is never a black box. */}
        <p className="mt-1 text-[11px] italic">▸ {rollupWhy(q.subsignals as SubSignal[])}</p>
      </div>
    ),
  );

  push(
    "titles",
    /* q2's titles ARE the evidence for the count, and the disclaimer is not
       boilerplate: it explains why the titles and the count deliberately do not
       add up. */
    Array.isArray(q.titles) && (q.titles as string[]).length > 0 && (
      // .dv-titles — 12px, summary 11px mono, li 11.5px.
      <details className="my-1.5 text-xs">
        <summary className="cursor-pointer font-mono text-[11px] text-lead-link">
          show / hide {(q.titles as string[]).length} paid titles
        </summary>
        {typeof q.disclaimer === "string" && q.disclaimer && (
          <p className="my-1.5 text-[11px]">{q.disclaimer}</p>
        )}
        <ul className="mt-[5px] columns-2 pl-[15px] text-[11.5px] text-lead-ink">
          {(q.titles as string[]).map((t, i) => (
            <li key={i} className="break-inside-avoid">
              {t}
            </li>
          ))}
        </ul>
      </details>
    ),
  );

  push(
    "snippet",
    typeof q.snippet === "string" && q.snippet && (
      <div className="my-2">
        <p className="font-mono text-[9px] tracking-widest text-lead-ink2 uppercase">
          matched markup
        </p>
        <code className="mt-1 block max-h-36 overflow-auto rounded border border-lead-line bg-lead-panel2 p-2 font-mono text-[10.5px] break-words whitespace-pre-wrap">
          {q.snippet}
        </code>
      </div>
    ),
  );

  push(
    "source",
    parentUrl && kind !== "url" && !q.quote && <SourceLine url={parentUrl} unread={unread} />,
  );

  return (
    // .dv-ev — 12.5px / 1.5.
    <div className="text-[12.5px] leading-[1.5] text-lead-ink2">
      {blocks.length > 0 ? blocks : <NothingToShow answer={q.answer} />}
    </div>
  );
}
