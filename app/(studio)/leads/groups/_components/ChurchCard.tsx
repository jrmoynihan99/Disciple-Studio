"use client";

import { memo, useState } from "react";
import { logoPlate, PLATE_CLASS } from "@/lib/leads/engine/logo";
import { hostOf } from "@/lib/leads/engine/url";
import { cardFlags, type CardFlag } from "@/lib/leads/engine/group";
import { PATH } from "@/lib/leads/engine/group-types";
import type {
  GroupOp,
  ResolvedCard,
  ResolvedContact,
  ResolvedPathwayStep,
  ResolvedStep,
  Voice,
} from "@/lib/leads/engine/group-types";
import { newAddedId } from "@/lib/leads/client/useGroups";
import { chipClass } from "../../_components/verdict";
import { SafeLink } from "../../_components/SafeLink";
import { AttributionLine } from "./Attribution";
import { EditableText } from "./EditableText";

/**
 * One church, across the page rather than down it.
 *
 * This used to be a tall card in an 880px column — one church was a screen and
 * a half, and reviewing twenty meant thirty screens of scrolling. The job is to
 * skim twenty and notice the one that is wrong, and a stack of tall cards is the
 * worst possible shape for that: every card puts the slogan at a different
 * height, so the eye has to re-find each field before it can judge it.
 *
 * Four aligned columns fix that. Every slogan lands in one vertical strip and
 * every quote block in another, so a bad one stops being something you have to
 * read for and becomes something that looks different from its neighbours.
 *
 * It is still not a console row. The console is built for scanning fourteen
 * thousand churches at a glance; this is built for reading twenty carefully, so
 * the church's own voice keeps its serif and every claim keeps the provenance
 * line under it. Only the arrangement changed.
 */

interface Props {
  card: ResolvedCard;
  /** 1-based, so a reviewer can say "the sixth one is wrong". */
  index: number;
  stale: boolean;
  departed: boolean;
  /**
   * The ONLY callback. It used to take an `onRemoveChurch` beside this, which
   * every caller supplied as a fresh inline closure — enough on its own to make
   * the `memo()` below do nothing. The card already knows its own `orgId`.
   */
  onOp: (op: GroupOp) => void;
}

const H = "font-mono text-[10px] font-bold tracking-[0.14em] text-lead-ink2 uppercase";

/**
 * The sheet's grid, exported so the column headers in `GroupReview` are built
 * from the same string. Two copies of a four-track template drift the first time
 * one is tuned, and a header that has drifted from its columns is worse than no
 * header — it mislabels rather than fails.
 *
 * `gap-px` over a `bg-lead-line` parent draws the dividers. Per-column borders
 * would have to be turned off and back on at each breakpoint, and would draw the
 * wrong edges once the tracks wrap; a background showing through a one-pixel gap
 * is correct in every configuration by construction.
 */
export const SHEET_COLS =
  "grid gap-px bg-lead-line" +
  // Weighted by MEASURED content, not by importance. Across a real batch the
  // identity column runs ~170px and discipleship ~120px, while next steps runs
  // 700–1200px and contacts up to 1100px — and the row is as tall as its tallest
  // column, so every pixel given to the two short ones is pure whitespace. The
  // two long ones get the width, which is what takes their quotes from three
  // wrapped lines to two.
  " grid-cols-[minmax(240px,1fr)_minmax(320px,1.8fr)_minmax(210px,0.85fr)_minmax(240px,1.35fr)]" +
  " max-[1180px]:grid-cols-2 max-[720px]:grid-cols-1";

/**
 * A column of the sheet. The `bg-lead-panel` on a `gap-px` parent is what leaves
 * the hairline.
 *
 * NO REPEATED COLUMN LABEL. The sticky strip at the top of the page names the
 * four columns once; printing "NEXT STEPS" again in all twenty rows would spend
 * three lines per row saying something position already says, in a layout whose
 * entire purpose is to fit more churches on a screen. What does earn its space
 * is the count — it differs per church, and "0" is a thing you want to catch
 * while skimming.
 */
function Col({
  label,
  count,
  addLabel,
  onAdd,
  className = "",
  children,
}: {
  label: string;
  count?: number;
  addLabel: string;
  onAdd: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`bg-lead-panel px-3.5 py-3 ${className}`}>
      <div className="mb-1.5 flex items-baseline gap-2">
        {/* Only below 720px, where the tracks stack and the sticky strip's
            positions stop mapping to anything. Above it the strip names them. */}
        <h3 className={`hidden max-[720px]:block ${H}`}>{label}</h3>
        <span className="font-mono text-[10px] text-lead-ink2 tabular-nums">
          {count == null ? "" : count}
        </span>
        {/* Revealed on row hover. Twenty always-visible "+ add" links read as a
            form to fill in; the page is a proof sheet to check. */}
        <button
          type="button"
          onClick={onAdd}
          className={`ml-auto ${ADD_LINK} opacity-0 transition-opacity group-hover/card:opacity-100 focus:opacity-100`}
        >
          {addLabel}
        </button>
      </div>
      {children}
    </div>
  );
}

/**
 * Flag tones come from the console's one verdict→class mapping, so a flag and a
 * cell painting the same state cannot disagree. `unver` picks up its hatch from
 * `chipClass` automatically — that hatch is the colour-blind carrier, not
 * decoration, and re-spelling the class here is how it would get dropped.
 */
const FLAG_TONE: Record<CardFlag["tone"], string> = {
  unk: `${chipClass("unk")} text-lead-bg`,
  unver: `${chipClass("unver")} text-lead-bg`,
  plain: "border border-lead-line text-lead-ink2",
};

/**
 * Where to look first. Never "this is wrong" — see `cardFlags`, which owns the
 * rule and is tested against it.
 */
function Flags({ flags }: { flags: CardFlag[] }) {
  if (flags.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {flags.map((f) => (
        <span
          key={f.key}
          data-flag={f.key}
          title={f.title}
          className={`rounded px-1.5 py-px font-mono text-[9px] leading-[15px] ${FLAG_TONE[f.tone]}`}
        >
          {f.label}
        </span>
      ))}
    </div>
  );
}

/** Struck out, not gone: a suppression is a judgement someone can revisit. */
function SuppressShell({
  suppressed,
  provenance,
  onSuppress,
  onRestore,
  onDelete,
  children,
}: {
  suppressed: boolean;
  provenance: "source" | "user";
  onSuppress: () => void;
  onRestore: () => void;
  onDelete: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      data-provenance={provenance}
      data-suppressed={suppressed ? "true" : "false"}
      className={`group/item relative rounded-lg border px-2 py-1.5 ${
        suppressed
          ? "border-lead-bad/40 bg-lead-bad/[0.06]"
          : "border-transparent hover:border-lead-line"
      }`}
    >
      <div
        className={
          suppressed
            ? // The red is what says "removed"; the strike is what says it for
              // anyone who cannot see the red.
              "pointer-events-none opacity-45 [text-decoration-line:line-through] [text-decoration-color:var(--lead-bad)]"
            : ""
        }
      >
        {children}
      </div>

      <div className="absolute top-1 right-1 flex items-center gap-2 opacity-0 transition-opacity group-hover/item:opacity-100 focus-within:opacity-100">
        {suppressed ? (
          // KEEPS ITS WORDS. Everything else here shrank to a glyph for the
          // narrow columns, but this is the way back from a destructive-looking
          // action and it has to be readable without hovering to find out.
          <button
            type="button"
            onClick={onRestore}
            className="rounded border border-lead-line bg-lead-panel px-1.5 py-0.5 font-mono text-[10px] text-lead-ink"
          >
            put back
          </button>
        ) : provenance === "source" ? (
          <button
            type="button"
            onClick={onSuppress}
            aria-label="Remove"
            title="Strike this out. It stays here so you can put it back."
            className="rounded border border-lead-line bg-lead-panel px-1 leading-[14px] font-mono text-[11px] text-lead-ink2 hover:text-lead-bad"
          >
            ✕
          </button>
        ) : (
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete"
            title="Delete. You wrote this, so there is nothing to put back."
            className="rounded border border-lead-line bg-lead-panel px-1 leading-[14px] font-mono text-[11px] text-lead-ink2 hover:text-lead-bad"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * A quotation, with the claim it is allowed to make printed underneath.
 *
 * The DOM shape is a contract: `[data-quote]` inside this block, with the
 * attribution as a sibling of that block. The audit walks exactly that
 * relationship to prove no quote ships unattributed, so the nesting here is not
 * free to change even though it looks like plain markup.
 */
function Quote({
  voice,
  ariaLabel,
  onCommit,
  onRevert,
}: {
  voice: Voice;
  ariaLabel: string;
  onCommit: (next: string) => void;
  onRevert: () => void;
}) {
  return (
    <div className="mt-1 border-l-2 border-lead-line pl-2">
      <div data-quote className="font-serif text-[12.5px] leading-snug italic text-lead-ink">
        <EditableText value={voice.text} onCommit={onCommit} multiline ariaLabel={ariaLabel} />
      </div>
      <AttributionLine
        attribution={voice.attribution}
        onRevert={voice.attribution.kind === "edited" ? onRevert : undefined}
      />
    </div>
  );
}

const ADD_LINK =
  "font-mono text-[10px] text-lead-ink2 underline underline-offset-2 hover:text-lead-brand";

/** Absent-not-empty. The prose these carry is the point; do not shorten it. */
function Absent({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[10.5px] leading-relaxed text-lead-ink2">{children}</p>;
}

function ChurchCardInner({ card, index, stale, departed, onOp }: Props) {
  const [addingStep, setAddingStep] = useState(false);
  const [addingPathway, setAddingPathway] = useState(false);
  const [addingContact, setAddingContact] = useState(false);

  const set = (path: string, base: string) => (value: string) =>
    onOp({ op: "field.set", orgId: card.orgId, path, value, base });
  const revert = (path: string) => () => onOp({ op: "field.revert", orgId: card.orgId, path });
  const suppress = (itemId: string) => () => onOp({ op: "item.suppress", orgId: card.orgId, itemId });
  const restore = (itemId: string) => () => onOp({ op: "item.restore", orgId: card.orgId, itemId });
  const del = (itemId: string) => () => onOp({ op: "item.remove", orgId: card.orgId, itemId });

  const plate = PLATE_CLASS[logoPlate(card.logo?.theme)];
  const touched = card.editedCount > 0 || card.suppressedCount > 0;
  const liveSteps = card.steps.filter((s) => !s.suppressed).length;
  const liveContacts = card.contacts.filter((c) => !c.suppressed).length;

  return (
    <article
      data-church={card.orgId}
      className="group/card relative mb-3 overflow-hidden rounded-xl border border-lead-line"
    >
      {/* The status rail. Untouched cards look untouched, so what you have
          already been through is visible without reading any of it again. */}
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 z-[1] w-[3px] ${
          card.suppressedCount ? "bg-lead-bad" : touched ? "bg-lead-brand" : "bg-transparent"
        }`}
      />

      <button
        type="button"
        onClick={() => onOp({ op: "church.remove", orgId: card.orgId })}
        title="Remove this church from the batch"
        className="absolute top-1.5 right-1.5 z-[2] rounded-md border border-lead-line bg-lead-panel px-2 py-0.5 font-mono text-[10px] text-lead-ink2 opacity-0 transition-opacity group-hover/card:opacity-100 focus:opacity-100 hover:border-lead-bad hover:text-lead-bad"
      >
        remove church
      </button>

      {(stale || departed) && (
        <p className="border-b border-lead-line bg-lead-unk/10 px-4 py-2 pl-5 font-mono text-[10px] leading-relaxed text-lead-ink">
          {departed
            ? "This church is no longer in the dataset. The card below is the only copy we hold, and there is nothing left to re-pull from."
            : "The source record has changed since this was added. The card below is what you froze — it is not being updated."}
        </p>
      )}

      <div className={SHEET_COLS}>
        {/* ── identity ── */}
        <div className="bg-lead-panel px-3.5 py-3.5 pl-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 font-mono text-[11px] text-lead-ink2 tabular-nums">
              {String(index).padStart(2, "0")}
            </span>
            <div
              className={`grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg ${plate}`}
            >
              {card.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/leads/asset/logos-thumb/${card.logo.sha}.webp`}
                  alt=""
                  className="h-full w-full object-contain p-1"
                />
              ) : (
                <span className="px-0.5 text-center font-mono text-[7px] leading-tight text-lead-ink2">
                  {card.noLogo?.reason.replace(/_/g, " ") ?? "no logo"}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="font-serif text-[17px] leading-tight font-semibold tracking-tight text-lead-ink">
                <EditableText
                  value={card.name.text}
                  onCommit={set(PATH.name, card.name.text)}
                  ariaLabel="church name"
                  placeholder="(unnamed)"
                />
              </div>
              <AttributionLine
                attribution={card.name.attribution}
                onRevert={card.name.attribution.kind === "edited" ? revert(PATH.name) : undefined}
              />
            </div>
          </div>

          {card.nameOriginal && card.nameOriginal !== card.name.text && (
            <p className="mt-1 px-2 font-mono text-[10px] text-lead-ink2">
              scraped as “{card.nameOriginal}”, repaired
            </p>
          )}

          {/* ── slogan: three states, and editing preserves all three ── */}
          <div className="mt-2">
            {card.slogan.kind === "slogan" ? (
              <>
                <div className="font-serif text-[14px] leading-snug italic text-lead-ink2">
                  <EditableText
                    value={card.slogan.voice.text}
                    onCommit={set(PATH.slogan, card.slogan.voice.text)}
                    ariaLabel="slogan"
                    multiline
                  />
                </div>
                <AttributionLine
                  attribution={card.slogan.voice.attribution}
                  onRevert={
                    card.slogan.voice.attribution.kind === "edited"
                      ? revert(PATH.slogan)
                      : undefined
                  }
                />
              </>
            ) : (
              <div className="text-[12.5px] text-lead-ink2 opacity-70">
                <EditableText
                  value=""
                  onCommit={set(PATH.slogan, "")}
                  ariaLabel="slogan"
                  placeholder={
                    card.slogan.kind === "homepage_only"
                      ? "No slogan on the homepage — inner pages were never read"
                      : "No slogan found"
                  }
                />
              </div>
            )}
          </div>

          {card.churchUrl && (
            <SafeLink
              href={card.churchUrl}
              className="mt-1.5 inline-block px-2 font-mono text-[10.5px] text-lead-link underline underline-offset-2"
            >
              {hostOf(card.churchUrl) || card.churchUrl}
            </SafeLink>
          )}

          <Flags flags={cardFlags(card)} />
        </div>

        {/* ── next steps ── */}
        <Col
          label="Next steps"
          count={card.stepsLooked ? liveSteps : undefined}
          addLabel="+ step"
          onAdd={() => setAddingStep(true)}
        >
          {!card.stepsLooked && (
            <Absent>
              Next-step pages were never read for this church. This is not a list of
              what they lack.
            </Absent>
          )}
          {card.stepsLooked && card.steps.length === 0 && (
            <Absent>We read their next-step pages and found none named.</Absent>
          )}

          <div className="space-y-0.5">
            {card.steps.map((s: ResolvedStep) => (
              <SuppressShell
                key={s.id}
                suppressed={s.suppressed}
                provenance={s.provenance}
                onSuppress={suppress(s.id)}
                onRestore={restore(s.id)}
                onDelete={del(s.id)}
              >
                {/* Label and the church's own terms on ONE line. Our category
                    name is a word or two and their term is a word or two, so
                    stacking them spent a whole row on eight characters — twenty
                    pixels a step, eight steps a church, twenty churches. */}
                <div className="flex flex-wrap items-baseline gap-x-1.5 pr-6">
                  <div className="text-[13px] font-medium text-lead-ink">
                    <EditableText
                      value={s.label.text}
                      onCommit={set(PATH.step(s.id, "label"), s.label.text)}
                      ariaLabel="step name"
                    />
                  </div>
                  {s.ownTerms.map((t) => (
                    // Their words, verbatim and read-only. Editing these would be
                    // editing a quotation without the affordances of one.
                    <span
                      key={t}
                      title="the church's own wording"
                      className="rounded-full border border-lead-line px-1.5 py-px font-mono text-[9px] text-lead-ink2"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                {s.quote && (
                  <Quote
                    voice={s.quote}
                    ariaLabel="step quote"
                    onCommit={set(PATH.step(s.id, "quote"), s.quote.text)}
                    onRevert={revert(PATH.step(s.id, "quote"))}
                  />
                )}
              </SuppressShell>
            ))}
          </div>

          {addingStep && (
            <AddForm
              fields={[
                { key: "label", label: "Step name" },
                { key: "quote", label: "Quote (optional)" },
              ]}
              onCancel={() => setAddingStep(false)}
              onSave={(v) => {
                setAddingStep(false);
                onOp({
                  op: "item.add",
                  orgId: card.orgId,
                  item: {
                    id: newAddedId(),
                    at: Date.now(),
                    kind: "step",
                    label: v.label,
                    quote: v.quote,
                  },
                });
              }}
            />
          )}
        </Col>

        {/* ── discipleship ── */}
        <Col
          label="Discipleship"
          count={card.pathway.steps.length || undefined}
          addLabel="+ step"
          onAdd={() => setAddingPathway(true)}
        >
          {card.pathway.name && (
            <p className="mb-1.5 text-[12.5px] leading-snug text-lead-ink2">
              The site uses the phrase{" "}
              <span className="font-serif italic text-lead-ink">“{card.pathway.name}”</span>
              {card.pathway.steps.length === 0 && " — but no ordered steps were captured."}
            </p>
          )}

          {card.pathway.finding ? (
            <Quote
              voice={card.pathway.finding}
              ariaLabel="discipleship finding"
              onCommit={set(PATH.finding("quote"), card.pathway.finding.text)}
              onRevert={revert(PATH.finding("quote"))}
            />
          ) : (
            !card.pathway.name && (
              <Absent>
                Nothing quotable about discipleship was found on the pages we read.
              </Absent>
            )
          )}

          {card.pathway.steps.length > 0 && (
            <ol className="mt-2 space-y-0.5">
              {card.pathway.steps.map((s: ResolvedPathwayStep) => (
                <li key={s.id}>
                  <SuppressShell
                    suppressed={s.suppressed}
                    provenance={s.provenance}
                    onSuppress={suppress(s.id)}
                    onRestore={restore(s.id)}
                    onDelete={del(s.id)}
                  >
                    <div className="flex items-baseline gap-1.5 pr-6">
                      {/* A number is only printed when the church's own page put
                          one there. DOM order is not a sequence. */}
                      {s.ordinal != null && (
                        <span className="shrink-0 font-mono text-[11px] text-lead-brand">
                          {s.ordinal}.
                        </span>
                      )}
                      <div className="min-w-0 flex-1 text-[13px] font-medium text-lead-ink">
                        <EditableText
                          value={s.label.text}
                          onCommit={set(PATH.pathwayStep(s.id, "label"), s.label.text)}
                          ariaLabel="pathway step"
                        />
                      </div>
                    </div>
                    <AttributionLine
                      attribution={s.label.attribution}
                      onRevert={
                        s.label.attribution.kind === "edited"
                          ? revert(PATH.pathwayStep(s.id, "label"))
                          : undefined
                      }
                    />
                    {s.quote && (
                      <Quote
                        voice={s.quote}
                        ariaLabel="pathway step quote"
                        onCommit={set(PATH.pathwayStep(s.id, "quote"), s.quote.text)}
                        onRevert={revert(PATH.pathwayStep(s.id, "quote"))}
                      />
                    )}
                  </SuppressShell>
                </li>
              ))}
            </ol>
          )}

          {addingPathway && (
            <AddForm
              fields={[
                { key: "label", label: "Step name" },
                { key: "blurb", label: "Note (optional)" },
              ]}
              onCancel={() => setAddingPathway(false)}
              onSave={(v) => {
                setAddingPathway(false);
                onOp({
                  op: "item.add",
                  orgId: card.orgId,
                  item: {
                    id: newAddedId(),
                    at: Date.now(),
                    kind: "pathwayStep",
                    label: v.label,
                    blurb: v.blurb,
                  },
                });
              }}
            />
          )}
        </Col>

        {/* ── contacts ── */}
        <Col
          label="Contacts"
          count={liveContacts}
          addLabel="+ contact"
          onAdd={() => setAddingContact(true)}
        >
          {card.contactNote && (
            <p className="mb-1.5 text-[12.5px] leading-snug text-lead-ink2">{card.contactNote}</p>
          )}
          {card.contacts.length === 0 && <Absent>No contact details found.</Absent>}

          <div className="space-y-0.5">
            {card.contacts.map((c: ResolvedContact) => (
              <SuppressShell
                key={c.id}
                suppressed={c.suppressed}
                provenance={c.provenance}
                onSuppress={suppress(c.id)}
                onRestore={restore(c.id)}
                onDelete={del(c.id)}
              >
                {/* THREE SHAPES, NOT TWO.
                    A church address has no name and no job title — it is an
                    address. Giving it the person layout printed "(church
                    address)" and "(no title)" as two empty rows apiece, and a
                    church with six of them spent three hundred pixels saying
                    nothing. It gets the one-line treatment phones already had.

                    A person keeps every field, but name and title share a line:
                    "Jane Doe · Lead Pastor" is one fact about one person, and
                    stacking them cost a row per contact. */}
                {c.kind === "phone" || c.kind === "social" || c.kind === "churchEmail" ? (
                  <div className="flex flex-wrap items-baseline pr-6">
                    <span className={`${H} mr-2 shrink-0`}>
                      {c.kind === "churchEmail" ? "church" : c.network || "phone"}
                    </span>
                    <div
                      className={`min-w-0 flex-1 ${
                        c.kind === "churchEmail"
                          ? "font-mono text-[11.5px] break-all text-lead-link"
                          : "text-[12.5px] text-lead-ink"
                      }`}
                    >
                      <EditableText
                        value={c.kind === "churchEmail" ? c.email : c.value}
                        onCommit={set(
                          PATH.contact(c.id, c.kind === "churchEmail" ? "email" : "value"),
                          c.kind === "churchEmail" ? c.email : c.value,
                        )}
                        ariaLabel={c.kind === "churchEmail" ? "church address" : c.network || "phone"}
                        placeholder={c.kind === "churchEmail" ? "(no address)" : undefined}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="pr-6">
                    <div className="flex flex-wrap items-baseline gap-x-1">
                      <div className="text-[13px] font-medium text-lead-ink">
                        <EditableText
                          value={c.name}
                          onCommit={set(PATH.contact(c.id, "name"), c.name)}
                          ariaLabel="contact name"
                          placeholder="(no name)"
                        />
                      </div>
                      <div className="min-w-0 text-[11.5px] text-lead-ink2">
                        <EditableText
                          value={c.title}
                          onCommit={set(PATH.contact(c.id, "title"), c.title)}
                          ariaLabel="contact title"
                          placeholder="(no title)"
                        />
                      </div>
                    </div>
                    <div className="font-mono text-[11.5px] break-all text-lead-link">
                      <EditableText
                        value={c.email}
                        onCommit={set(PATH.contact(c.id, "email"), c.email)}
                        ariaLabel="contact email"
                        placeholder="(no email)"
                      />
                    </div>
                  </div>
                )}
                {c.provenance === "user" ? (
                  <AttributionLine attribution={{ kind: "user" }} />
                ) : c.edited ? (
                  <AttributionLine attribution={{ kind: "edited", wasVerbatim: "" }} />
                ) : null}
              </SuppressShell>
            ))}
          </div>

          {addingContact && (
            <AddForm
              fields={[
                { key: "name", label: "Name" },
                { key: "title", label: "Title" },
                { key: "email", label: "Email" },
              ]}
              onCancel={() => setAddingContact(false)}
              onSave={(v) => {
                setAddingContact(false);
                onOp({
                  op: "item.add",
                  orgId: card.orgId,
                  item: {
                    id: newAddedId(),
                    at: Date.now(),
                    kind: "contact",
                    name: v.name,
                    title: v.title,
                    email: v.email,
                  },
                });
              }}
            />
          )}
        </Col>
      </div>
    </article>
  );
}

/**
 * Every committed keystroke replaces the whole group object, so `GroupReview`
 * re-`resolve()`s all twenty cards. Without this, fixing one typo re-renders
 * nineteen churches that did not change.
 */
export const ChurchCard = memo(ChurchCardInner);

function AddForm({
  fields,
  onSave,
  onCancel,
}: {
  fields: { key: string; label: string }[];
  onSave: (values: Record<string, string>) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const filled = (k: string) => values[k] ?? "";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!filled(fields[0].key).trim()) return;
        onSave(Object.fromEntries(fields.map((f) => [f.key, filled(f.key)])));
      }}
      className="mt-2 rounded-lg border border-dashed border-lead-brand/60 p-2"
    >
      <div className="space-y-1.5">
        {fields.map((f, i) => (
          <input
            key={f.key}
            autoFocus={i === 0}
            value={filled(f.key)}
            placeholder={f.label}
            aria-label={f.label}
            onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
            className="w-full rounded-md border border-lead-line bg-lead-bg px-2 py-1 text-[12.5px] text-lead-ink"
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="submit"
          className="rounded-md bg-lead-brand px-2.5 py-1 font-mono text-[11px] text-white"
        >
          add
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="font-mono text-[11px] text-lead-ink2 hover:text-lead-ink"
        >
          cancel
        </button>
        <span className="ml-auto font-mono text-[10px] text-lead-brand">
          will be marked as added by you
        </span>
      </div>
    </form>
  );
}
