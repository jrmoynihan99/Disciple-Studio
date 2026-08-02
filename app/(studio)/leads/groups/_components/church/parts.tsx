"use client";

import { memo, useState } from "react";
import { logoPlate, PLATE_CLASS } from "@/lib/leads/engine/logo";
import { hostOf } from "@/lib/leads/engine/url";
import { cardFlags, type CardFlag } from "@/lib/leads/engine/group";
import { exportContacts } from "@/lib/leads/engine/contacts";
import { PATH, REVIEW_FIELDS } from "@/lib/leads/engine/group-types";
import type {
  AddedItem,
  GroupOp,
  ResolvedCard,
  ResolvedPathwayStep,
  ResolvedStep,
  ReviewField,
  Voice,
} from "@/lib/leads/engine/group-types";
import { newAddedId } from "@/lib/leads/client/useGroups";
import { SafeLink } from "../../../_components/SafeLink";
import { Chevron } from "../../../_components/Chevron";
import { ConfirmDialog } from "../../../_components/ConfirmDialog";
import { AttributionLine } from "../Attribution";
import { EditableText } from "../EditableText";
import { EMPTY_TEXT, EMPTY_VALUE, SKIN } from "./skin";

/**
 * ONE CHURCH, TOP TO BOTTOM.
 *
 * This was a four-column sheet — a church spread ACROSS the page under a sticky
 * strip naming the columns. The idea was that aligned columns make a bad quote
 * look wrong beside its neighbours, and that part was right. What it cost was
 * that every value lived in a 230–300px track, so quotes wrapped at arbitrary
 * points, contacts shrank to glyphs, and reading a value meant first remembering
 * which column you were in. It read as a spreadsheet, and a spreadsheet is a
 * thing you scan for outliers rather than a thing you review.
 *
 * A church is now an identity band you land on and three labelled fields below
 * it, and the alignment is bought a different way:
 *
 *   EVERY CHURCH RENDERS ALL FIVE FIELDS, IN ONE ORDER, ALWAYS.
 *
 * `REVIEW_FIELDS` in the engine owns that order and `/leads/audit` asserts it.
 * Nothing is dropped for being empty — the old card omitted a block when it had
 * nothing in it, so a church with no discipleship pathway simply rendered shorter
 * than the one above it, and an absence you can only detect by noticing that a
 * card ended early is an absence nobody notices. Held constant, the fields become
 * a rhythm, and a break in a rhythm is the cheapest signal there is: you do not
 * read for it, you trip over it.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * NO PER-QUOTE CITATION, AND THAT IS A REAL TRADE.
 *
 * Every quote used to carry a line under it naming the page it came from, with
 * an "exact" badge where the pipeline had verified it verbatim. Owner's call to
 * drop both: at eight steps a church that was more lines of citation than of
 * content, and the same few words repeated under everything stopped being read
 * within a screen.
 *
 * What is lost is genuine: a reviewer could open the exact page a sentence came
 * from, and now they get the church's site via the Visit button and have to find
 * it. What is kept is the part that would make a FALSE CLAIM if dropped —
 * `edited` ("no longer the church's words", with revert) and `user` ("added by
 * you"). Both still render everywhere, and `/leads/audit` still asserts that an
 * edited quote carries no source link and a hand-added item carries no verified
 * badge. `AttributionLine` remains the only component that may render a source
 * line; the two dropped kinds are dropped at the CALL SITE, so the union that
 * makes citing a page for an edited quote a type error is untouched.
 * ────────────────────────────────────────────────────────────────────────────
 */

/* ------------------------------------------------------------------ *
 * Copy
 * ------------------------------------------------------------------ */

export const FIELD_LABEL: Record<ReviewField, string> = {
  name: "Name",
  slogan: "Slogan",
  steps: "Next steps",
  pathway: "Discipleship",
  contacts: "Contacts",
};

const COPY = {
  noName: "Couldn't find name",
  noSlogan: "Couldn't find slogan",
  noQuote: "no quotation captured",
  noPathwayName: "Couldn't find a name for it",
  stepsNotRead:
    "Next-step pages were never read for this church. This is not a list of what they lack.",
  stepsNoneFound: "We read their next-step pages and found none named.",
  pathwayNothing: "Nothing quotable about discipleship was found on the pages we read.",
  pathwayNoSteps: "They name a pathway, but no ordered steps were captured.",
  noContacts: "No contact details found — there is nobody to send this to.",
  departed:
    "This church is no longer in the dataset. The card below is the only copy we hold, and there is nothing left to re-pull from.",
  stale:
    "The source record has changed since this was added. The card below is what you froze — it is not being updated.",
} as const;

/* ------------------------------------------------------------------ *
 * Small helpers
 * ------------------------------------------------------------------ */

/**
 * A church's initials, for the logo plate when there is no logo.
 *
 * Skips the words that every third church shares — "The First Baptist Church of
 * Springfield" reading "TFBCOS" is worse than useless, because it looks the same
 * as its neighbours. Two letters, so it stays a mark rather than a word.
 */
const SKIP = new Set(["the", "of", "at", "a", "and", "church", "chapel", "ministries"]);

export function initialsOf(name: string): string {
  const words = name
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((w) => w && !SKIP.has(w.toLowerCase()));
  const from = words.length ? words : name.split(/\s+/).filter(Boolean);
  return from
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * The quote marks around a slogan and a quotation are DISPLAY, so they must not
 * be able to reach the stored value — otherwise opening one to fix a typo and
 * closing it again commits `““…””`, and three edits later the export ships a
 * sentence wearing six of them.
 */
function stripQuotes(s: string): string {
  return s.replace(/^\s*[“"']+/, "").replace(/[”"']+\s*$/, "");
}

const quoted = (s: string) => (s ? `“${s}”` : "");

/** What a confirmation is about to do, handed up to the card that owns the dialog. */
export interface PendingRemoval {
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  run: () => void;
}

interface Ops {
  set: (path: string, base: string) => (value: string) => void;
  revert: (path: string) => () => void;
  restore: (itemId: string) => () => void;
  /**
   * THE ONE WAY TO TAKE AN ITEM OFF A CARD, and it always asks first.
   *
   * It also decides the verb, which used to be decided twice — once by the call
   * site picking `onSuppress` vs `onDelete`, and again by `SuppressShell` reading
   * `provenance` to choose the tooltip. Two readings of one fact is how they end
   * up disagreeing; there is one now, here.
   */
  remove: (item: { noun: string; name: string; provenance: "source" | "user"; id: string }) => () => void;
  add: (item: AddedItem) => void;
}

function opsFor(
  orgId: string,
  onOp: (op: GroupOp) => void,
  ask: (p: PendingRemoval) => void,
): Ops {
  return {
    set: (path, base) => (value) => onOp({ op: "field.set", orgId, path, value, base }),
    revert: (path) => () => onOp({ op: "field.revert", orgId, path }),
    restore: (itemId) => () => onOp({ op: "item.restore", orgId, itemId }),
    remove: ({ noun, name, provenance, id }) => () => {
      const named = name.trim() ? `“${name.trim()}”` : `this ${noun}`;
      // THE TWO CASES SAY DIFFERENT THINGS BECAUSE THEY ARE DIFFERENT ACTIONS.
      // Striking out is a judgement that stays on the card wearing a `put back`;
      // deleting something a person typed has nothing behind it to restore.
      ask(
        provenance === "source"
          ? {
              title: `Strike out ${noun}?`,
              body: (
                <>
                  {named} will stay on the card, struck through, and will not be
                  sent. You can put it back at any time.
                </>
              ),
              confirmLabel: "Strike out",
              run: () => onOp({ op: "item.suppress", orgId, itemId: id }),
            }
          : {
              title: `Delete ${noun}?`,
              body: (
                <>
                  {named} was added by hand, so there is nothing behind it to
                  restore. This cannot be undone.
                </>
              ),
              confirmLabel: "Delete",
              run: () => onOp({ op: "item.remove", orgId, itemId: id }),
            },
      );
    },
    add: (item) => onOp({ op: "item.add", orgId, item }),
  };
}

/**
 * The provenance line, in the cases where it still says something.
 *
 * `cited` and `uncited` are dropped at the call site — see the header. The three
 * that remain all make the same kind of claim: this is not a sentence we
 * transcribed off the church's site. `generated` is the newest and the loudest
 * reason for the rule, since the corpus fabricates one step per church.
 */
function Provenance({ voice, onRevert }: { voice: Voice; onRevert?: () => void }) {
  const kind = voice.attribution.kind;
  if (kind !== "edited" && kind !== "user" && kind !== "generated") return null;
  return (
    <AttributionLine
      attribution={voice.attribution}
      onRevert={kind === "edited" ? onRevert : undefined}
      skin={SKIN.attribution}
    />
  );
}

/* ------------------------------------------------------------------ *
 * Primitives
 * ------------------------------------------------------------------ */

/** Absent-not-empty. The prose these carry is the point; do not shorten it. */
function Absent({ children }: { children: React.ReactNode }) {
  return <p className={SKIN.absent}>{children}</p>;
}

/**
 * A value the reviewer has to supply, drawn as work to do rather than as an
 * absence to accept. Only the reviewer's job gets this; measured absences keep
 * `Absent`'s muted prose. If everything shouted, nothing would.
 */
function Blank({ children }: { children: React.ReactNode }) {
  return <div className={EMPTY_VALUE}>{children}</div>;
}

/**
 * Where to look first. Never "this is wrong" — see `cardFlags`, which owns the
 * rule and is tested against it.
 */
function Flags({ flags }: { flags: CardFlag[] }) {
  if (flags.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {flags.map((f) => (
        <span
          key={f.key}
          data-flag={f.key}
          title={f.title}
          className={`${SKIN.flagChip} ${SKIN.flagTone[f.tone]}`}
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
  onRemove,
  onRestore,
  children,
}: {
  suppressed: boolean;
  provenance: "source" | "user";
  /**
   * ALREADY WRAPPED IN A CONFIRMATION by the caller, and already resolved to the
   * right verb — strike out for something the pipeline found, hard delete for
   * something a person typed. This component draws the control and knows nothing
   * about which of the two it is firing.
   */
  onRemove: () => void;
  onRestore: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      data-provenance={provenance}
      data-suppressed={suppressed ? "true" : "false"}
      className={suppressed ? SKIN.itemShellStruck : SKIN.itemShell}
    >
      <div
        className={
          suppressed
            ? // The colour is what says "removed"; the strike is what says it for
              // anyone who cannot see the colour. `/leads/audit` measures the
              // computed `text-decoration-line`, so this cannot quietly become a
              // tint in a redesign.
              "pointer-events-none opacity-45 [text-decoration-line:line-through] [text-decoration-color:var(--lead-bad)]"
            : ""
        }
      >
        {children}
      </div>

      {/* THE ONE CONTROL STILL ON HOVER, and a deliberate exception to the rest
          of this card. `Remove church` and `Add a step` are things you go looking
          for; a per-item ✕ is not — eight steps across twenty churches is 160
          delete buttons on screen at once, which is noise and an invitation at
          the same time. `put back` is the opposite case and is always visible:
          the way out of a destructive action is never hidden. */}
      <div
        className={`absolute top-1 right-1 flex items-center gap-2 transition-opacity ${
          suppressed
            ? "opacity-100"
            : "opacity-0 group-hover/item:opacity-100 focus-within:opacity-100"
        }`}
      >
        {suppressed ? (
          // KEEPS ITS WORDS — the audit checks for the literal text. Stays in the
          // neutral skin on purpose: the way OUT of a destructive action is not
          // itself destructive, and painting it red would say the opposite.
          <button type="button" onClick={onRestore} className={SKIN.btnSmall}>
            put back
          </button>
        ) : (
          <button
            type="button"
            onClick={onRemove}
            aria-label={provenance === "source" ? "Remove" : "Delete"}
            title={
              provenance === "source"
                ? "Strike this out. It stays here so you can put it back."
                : "Delete. You wrote this, so there is nothing to put back."
            }
            // RED, and the reason is that this is the only control in the cluster
            // that takes something away. It shares its corner with `put back`, and
            // in one neutral skin the two were the same button wearing different
            // words.
            className={SKIN.btnSmallDanger}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * A quotation.
 *
 * THE DOM SHAPE IS A CONTRACT: `[data-quote]` inside this block, with any
 * provenance line as a sibling of that block. `/leads/audit` walks exactly that
 * relationship, so the nesting is not free to change even though it looks like
 * plain markup.
 *
 * The quote marks are printed rather than styled on, because they carry the claim
 * ("these are their words") and have to survive being copied out of the page.
 */
function Quote({
  voice,
  ariaLabel,
  className = SKIN.quote,
  onCommit,
  onRevert,
}: {
  voice: Voice;
  ariaLabel: string;
  /** The discipleship finding sets its own size; everything else takes the default. */
  className?: string;
  onCommit: (next: string) => void;
  onRevert: () => void;
}) {
  return (
    <div>
      <div data-quote className={className}>
        <EditableText
          value={quoted(voice.text)}
          onCommit={(next) => onCommit(stripQuotes(next))}
          multiline
          ariaLabel={ariaLabel}
          editingClassName={SKIN.editEditing}
          restingClassName={SKIN.editResting}
        />
      </div>
      <Provenance voice={voice} onRevert={onRevert} />
    </div>
  );
}

/**
 * The connector between two items in an evidence list. PUNCTUATION, NOT A CLAIM —
 * see `SKIN.arrow`, which carries the reasoning and the trade. `aria-hidden`
 * because `<ol>`/`<ul>` is what actually tells a screen reader whether these have
 * an order.
 */
function StepArrow() {
  return (
    <div aria-hidden className={SKIN.arrow}>
      ↓
    </div>
  );
}

/**
 * ONE CLAIM ABOUT A CHURCH — a Title and, usually, the sentence it came from.
 * Both evidence LISTS render through this, so a reviewer comparing "what they
 * offer" against "the order they put it in" reads one shape rather than two. The
 * discipleship programme's own name and description do NOT — see `PathwayHead`,
 * which is the container, not one of the contents.
 *
 * TITLE LEFT AND BIG, QUOTE RIGHT. The title used to be 13px in the body colour
 * with its quote underneath, which made eight steps one grey block with no entry
 * point. Split into two cells the titles form a column you run your eye down, and
 * the quotes form one you only enter when a title makes you want to.
 *
 * THERE IS ONLY ONE TITLE, AND IT IS EDITABLE. It used to be our category name
 * with the church's own words beside it as read-only chips, and nobody could tell
 * which of the two would be sent — the answer was the generic one, because it was
 * the only writable field. `stepTitle()` in `group.ts` now picks between them
 * once, and this renders the result.
 *
 * NO ORDINAL. Pathway steps used to print `1.` `2.` wherever the church's own page
 * had numbered them. Owner's call to drop it: on a card whose job is "is this
 * sentence true", a number is a second thing to check that nobody was checking.
 * `ResolvedPathwayStep.ordinal` is still computed and still tested — it is the
 * data, and `numbered` still decides `<ol>` vs `<ul>` — it is simply not drawn.
 */
function Claim({
  label,
  quote,
  labelAriaLabel,
  quoteAriaLabel,
  onLabelCommit,
  onLabelRevert,
  onQuoteCommit,
  onQuoteRevert,
}: {
  label: Voice;
  quote: Voice | null;
  labelAriaLabel: string;
  quoteAriaLabel: string;
  onLabelCommit: (next: string) => void;
  onLabelRevert: () => void;
  onQuoteCommit: (next: string) => void;
  onQuoteRevert: () => void;
}) {
  return (
    <div className={SKIN.itemRow}>
      <div className={SKIN.itemLeft}>
        <div className={`min-w-0 ${SKIN.itemTitle}`}>
          <EditableText
            value={label.text}
            onCommit={onLabelCommit}
            ariaLabel={labelAriaLabel}
            editingClassName={SKIN.editEditing}
            restingClassName={SKIN.editResting}
          />
        </div>
        <Provenance voice={label} onRevert={onLabelRevert} />
      </div>

      <div className={SKIN.itemRight}>
        {quote ? (
          <Quote
            voice={quote}
            ariaLabel={quoteAriaLabel}
            onCommit={onQuoteCommit}
            onRevert={onQuoteRevert}
          />
        ) : (
          /**
           * THE ABSENCE IS A PROMPT, NOT A FULL STOP.
           *
           * This was dead prose: "no quotation captured" in muted ink, with the
           * only way to supply one being to delete the whole step and re-add it
           * through the ＋ form. Every other value on this card is one click from
           * editable, and a reviewer who knows the sentence — they have the
           * church's site open in the next tab, via the Visit button — had nowhere
           * to put it.
           *
           * It stays a real answer when untouched: the placeholder still says we
           * captured nothing, so an empty cell never reads as a rendering fault.
           * Typing into it commits down the SAME path an edit does, so it resolves
           * to `edited` and announces itself as not the church's words.
           */
          <div data-quote className={SKIN.quote}>
            <EditableText
              value=""
              onCommit={(next) => onQuoteCommit(stripQuotes(next))}
              multiline
              ariaLabel={quoteAriaLabel}
              placeholder={COPY.noQuote}
              emptyClassName={SKIN.quoteEmpty}
              editingClassName={SKIN.editEditing}
              restingClassName={SKIN.editResting}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * `<ol>` ONLY WHEN THE SOURCE LICENSED A SEQUENCE.
 *
 * NOW THE ONLY PLACE THAT CLAIM LIVES. It used to be one of three carriers — the
 * printed ordinal, the connecting arrow, and the list element — and the first two
 * are gone by owner's decision: the ordinals are not drawn at all, and the arrow
 * is drawn between every pair in both lists, so neither can distinguish a pathway
 * the church numbered from one we read off page order.
 *
 * On screen ordered and unordered are therefore identical. To a screen reader they
 * are still different claims: "ordered list of 4" says these steps have an order,
 * and where the pathway's basis was page position that is a claim we are not
 * entitled to make. `resolvePathwaySteps` decides; this obeys. Losing it would
 * leave the distinction with nowhere to be true, so it does not get "simplified"
 * away for rendering the same box.
 */
function Numbered({
  numbered,
  className,
  children,
}: {
  numbered: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return numbered ? (
    <ol className={className}>{children}</ol>
  ) : (
    <ul className={className}>{children}</ul>
  );
}

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
      className={SKIN.addForm}
    >
      <div className="space-y-2">
        {fields.map((f, i) => (
          <input
            key={f.key}
            autoFocus={i === 0}
            value={filled(f.key)}
            placeholder={f.label}
            aria-label={f.label}
            onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
            className={SKIN.addInput}
          />
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-3">
        <button type="submit" className={SKIN.addSubmit}>
          add
        </button>
        <button type="button" onClick={onCancel} className={SKIN.addCancel}>
          cancel
        </button>
        <span className={SKIN.addNote}>will be marked as added by you</span>
      </div>
    </form>
  );
}

/**
 * ALWAYS ON SCREEN, and that reverses what the old card did.
 *
 * These appeared on hover, on the theory that twenty always-visible "+ add" links
 * read as a form to fill in rather than a proof sheet to check. The theory was
 * reasonable and the effect was not: a control nobody can see is a control nobody
 * uses, and adding the contact the pipeline missed is one of the things this page
 * exists to let somebody do.
 */
function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`mt-3 ${SKIN.btn}`}>
      <span aria-hidden className="text-[13px] leading-none">
        ＋
      </span>
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * The field bodies
 * ------------------------------------------------------------------ */

function NameBody({ card, ops }: { card: ResolvedCard; ops: Ops }) {
  const body = (
    <>
      <div className={SKIN.name}>
        <EditableText
          value={card.name.text}
          onCommit={ops.set(PATH.name, card.name.text)}
          ariaLabel="church name"
          placeholder={COPY.noName}
          emptyClassName={EMPTY_TEXT}
          editingClassName={SKIN.editEditing}
          restingClassName={SKIN.editResting}
        />
      </div>
      {/* The pipeline's name repair used to print `was "…"` here under a citation
          for the page it read the correction off. Both are gone: the repair is a
          fact about our extraction, the reviewer is looking at the name that will
          actually be sent, and if it is wrong they retype it. */}
      <Provenance voice={card.name} onRevert={ops.revert(PATH.name)} />
    </>
  );
  return card.name.text ? body : <Blank>{body}</Blank>;
}

function SloganBody({ card, ops }: { card: ResolvedCard; ops: Ops }) {
  /**
   * THE DATA HAS THREE STATES; THE UI SHOWS TWO. `slogan.kind` still separates
   * `homepage_only` from `none` and `resolveSlogan` and its tests still defend
   * it — but both absences read the same to a reviewer. "Inner pages were never
   * read" describes our crawler, not the church, and this card is what somebody
   * reads before writing to them. Owner's call.
   */
  if (card.slogan.kind !== "slogan") {
    return (
      <Blank>
        <div className={SKIN.slogan}>
          <EditableText
            value=""
            onCommit={ops.set(PATH.slogan, "")}
            ariaLabel="slogan"
            placeholder={COPY.noSlogan}
            emptyClassName={EMPTY_TEXT}
            editingClassName={SKIN.editEditing}
            restingClassName={SKIN.editResting}
          />
        </div>
      </Blank>
    );
  }
  const voice = card.slogan.voice;
  return (
    <>
      {/* QUOTATION MARKS AND A BLOCK, NOT ITALICS. Italics were carrying "these
          are their words" on their own, which reads as emphasis rather than as
          attribution. Quote marks say it literally; the tinted block with a brand
          rule gives the line a shape you can find without reading it. */}
      <div className={SKIN.sloganBox}>
        <div className={SKIN.slogan}>
          <EditableText
            value={quoted(voice.text)}
            onCommit={(next) => ops.set(PATH.slogan, voice.text)(stripQuotes(next))}
            ariaLabel="slogan"
            multiline
            editingClassName={SKIN.editEditing}
            restingClassName={SKIN.editResting}
          />
        </div>
      </div>
      <Provenance voice={voice} onRevert={ops.revert(PATH.slogan)} />
    </>
  );
}

function StepsBody({
  card,
  ops,
  adding,
  setAdding,
}: {
  card: ResolvedCard;
  ops: Ops;
  adding: boolean;
  setAdding: (on: boolean) => void;
}) {
  return (
    <>
      {!card.stepsLooked && <Absent>{COPY.stepsNotRead}</Absent>}
      {card.stepsLooked && card.steps.length === 0 && <Absent>{COPY.stepsNoneFound}</Absent>}

      {/* `<ul>`: a category list genuinely has no first, and that has not changed
          — only the arrow has, which no longer says otherwise. See `SKIN.arrow`. */}
      <ul className={SKIN.list}>
        {card.steps.map((s: ResolvedStep, i) => (
          <li key={s.id}>
            {i > 0 && <StepArrow />}
            <SuppressShell
              suppressed={s.suppressed}
              provenance={s.provenance}
              onRemove={ops.remove({
                noun: "this step",
                name: s.label.text,
                provenance: s.provenance,
                id: s.id,
              })}
              onRestore={ops.restore(s.id)}
            >
              <Claim
                label={s.label}
                quote={s.quote}
                labelAriaLabel="step title"
                quoteAriaLabel="step quote"
                onLabelCommit={ops.set(PATH.step(s.id, "label"), s.label.text)}
                onLabelRevert={ops.revert(PATH.step(s.id, "label"))}
                onQuoteCommit={ops.set(PATH.step(s.id, "quote"), s.quote?.text ?? "")}
                onQuoteRevert={ops.revert(PATH.step(s.id, "quote"))}
              />
            </SuppressShell>
          </li>
        ))}
      </ul>

      {adding ? (
        <AddForm
          fields={[
            { key: "label", label: "Step title" },
            { key: "quote", label: "Quote (optional)" },
          ]}
          onCancel={() => setAdding(false)}
          onSave={(v) => {
            setAdding(false);
            ops.add({
              id: newAddedId(),
              at: Date.now(),
              kind: "step",
              label: v.label,
              quote: v.quote,
            });
          }}
        />
      ) : (
        <AddButton label="Add a step" onClick={() => setAdding(true)} />
      )}
    </>
  );
}

function PathwayBody({
  card,
  ops,
  adding,
  setAdding,
}: {
  card: ResolvedCard;
  ops: Ops;
  adding: boolean;
  setAdding: (on: boolean) => void;
}) {
  const steps = card.pathway.steps;
  return (
    <>
      {!card.pathway.finding && !card.pathway.name && <Absent>{COPY.pathwayNothing}</Absent>}
      {card.pathway.name && steps.length === 0 && <Absent>{COPY.pathwayNoSteps}</Absent>}

      {/* THE PROGRAMME IS THE CONTAINER, NOT ONE OF THE CONTENTS — see
          `SKIN.pathwayHead`. This rendered through `Claim` inside an `itemShell`
          until now, which drew the church's discipleship programme as a ninth step
          sitting above the eight real ones. */}
      {card.pathway.finding && (
        <div className={SKIN.pathwayHead}>
          <p className={SKIN.pathwayCaption}>Their Discipleship Pathway</p>
          <div className={SKIN.pathwayName}>
            <EditableText
              value={card.pathway.name}
              onCommit={ops.set(PATH.finding("label"), card.pathway.name)}
              ariaLabel="pathway name"
              placeholder={COPY.noPathwayName}
              emptyClassName={EMPTY_TEXT}
              editingClassName={SKIN.editEditing}
              restingClassName={SKIN.editResting}
            />
          </div>
          <div className="mt-1.5">
            <Quote
              voice={card.pathway.finding}
              ariaLabel="discipleship finding"
              className={SKIN.pathwayFinding}
              onCommit={ops.set(PATH.finding("quote"), card.pathway.finding.text)}
              onRevert={ops.revert(PATH.finding("quote"))}
            />
          </div>
        </div>
      )}

      {steps.length > 0 && (
        <Numbered numbered={card.pathway.numbered} className={`mt-3 ${SKIN.list}`}>
          {steps.map((s: ResolvedPathwayStep, i) => (
            <li key={s.id}>
              {i > 0 && <StepArrow />}
              <SuppressShell
                suppressed={s.suppressed}
                provenance={s.provenance}
                onRemove={ops.remove({
                  noun: "this discipleship step",
                  name: s.label.text,
                  provenance: s.provenance,
                  id: s.id,
                })}
                onRestore={ops.restore(s.id)}
              >
                <Claim
                  label={s.label}
                  quote={s.quote}
                  labelAriaLabel="pathway step title"
                  quoteAriaLabel="pathway step quote"
                  onLabelCommit={ops.set(PATH.pathwayStep(s.id, "label"), s.label.text)}
                  onLabelRevert={ops.revert(PATH.pathwayStep(s.id, "label"))}
                  onQuoteCommit={ops.set(PATH.pathwayStep(s.id, "quote"), s.quote?.text ?? "")}
                  onQuoteRevert={ops.revert(PATH.pathwayStep(s.id, "quote"))}
                />
              </SuppressShell>
            </li>
          ))}
        </Numbered>
      )}

      {adding ? (
        <AddForm
          fields={[
            { key: "label", label: "Step title" },
            { key: "blurb", label: "Note (optional)" },
          ]}
          onCancel={() => setAdding(false)}
          onSave={(v) => {
            setAdding(false);
            ops.add({
              id: newAddedId(),
              at: Date.now(),
              kind: "pathwayStep",
              label: v.label,
              blurb: v.blurb,
            });
          }}
        />
      ) : (
        <AddButton label="Add a step" onClick={() => setAdding(true)} />
      )}
    </>
  );
}

function ContactsBody({
  card,
  ops,
  adding,
  setAdding,
}: {
  card: ResolvedCard;
  ops: Ops;
  adding: boolean;
  setAdding: (on: boolean) => void;
}) {
  /**
   * WHAT SHIPS, NOT WHAT WE HOLD.
   *
   * The exported package carries at most four contacts, on one channel. Rendering
   * everything the snapshot happens to hold meant a reviewer read six social
   * profiles that would never be sent and could miss the address that would.
   * `exportContacts` is the single rule this card and the exporter both read.
   */
  const shipping = exportContacts(card.contacts);

  return (
    <>
      {card.contactNote && <p className={`mb-2 ${SKIN.absent}`}>{card.contactNote}</p>}
      {shipping.length === 0 && (
        // Actionable, not measured: nobody to send to is the reviewer's problem to
        // solve, so it gets the shape rather than the muted prose.
        <Blank>
          <p className={`px-2 py-1 ${EMPTY_TEXT}`}>{COPY.noContacts}</p>
        </Blank>
      )}

      <div className={SKIN.list}>
        {shipping.map(({ contact: c, rank }) => {
          const isDetail = c.kind === "phone" || c.kind === "social";
          return (
            <SuppressShell
              key={c.id}
              suppressed={c.suppressed}
              provenance={c.provenance}
              onRemove={ops.remove({
                noun: "this contact",
                // Whatever identifies them on screen — a church address row has no
                // name, and "Delete this contact?" naming nothing is a dialog that
                // cannot be checked against what you clicked.
                name: c.name || c.email || c.value,
                provenance: c.provenance,
                id: c.id,
              })}
              onRestore={ops.restore(c.id)}
            >
              {/* WHO ON THE LEFT, HOW TO REACH THEM ON THE RIGHT — the same split
                  as a claim, on purpose. A reviewer moving from steps to contacts
                  should not have to re-learn where to look. */}
              <div className={SKIN.itemRow}>
                <div className={SKIN.itemLeft}>
                  <div className="flex items-baseline gap-2">
                    {/* THE ORDER IS THE POINT, so it is on screen rather than
                        implied by position. `rank` is renumbered over the contacts
                        that survived, so the first line always reads 1 — nobody
                        should have to reason about the ones filtered out above it.
                        Rank 1 is written to first, and is the only one in brand
                        ink. */}
                    <span
                      aria-hidden="true"
                      title={
                        rank === null
                          ? "struck out — will not be sent"
                          : rank === 1
                            ? "first to contact"
                            : `contact ${rank}`
                      }
                      className={`shrink-0 ${rank === 1 ? SKIN.rankFirst : SKIN.rank}`}
                    >
                      {rank ?? "–"}
                    </span>

                    {c.kind === "person" ? (
                      <div className={`min-w-0 flex-1 ${SKIN.contactName}`}>
                        <EditableText
                          value={c.name}
                          onCommit={ops.set(PATH.contact(c.id, "name"), c.name)}
                          ariaLabel="contact name"
                          placeholder="(no name)"
                          editingClassName={SKIN.editEditing}
                          restingClassName={SKIN.editResting}
                        />
                      </div>
                    ) : (
                      // THREE SHAPES, NOT TWO. A church address has no name and no
                      // job title — it is an address. Giving it the person layout
                      // printed "(church address)" and "(no title)" as two empty
                      // rows apiece.
                      <span className={SKIN.kindLabel}>
                        {c.kind === "churchEmail" ? "church" : c.network || "phone"}
                      </span>
                    )}
                  </div>

                  {c.kind === "person" && (
                    <div className={`${SKIN.contactTitle} pl-5`}>
                      <EditableText
                        value={c.title}
                        onCommit={ops.set(PATH.contact(c.id, "title"), c.title)}
                        ariaLabel="contact title"
                        placeholder="(no title)"
                        editingClassName={SKIN.editEditing}
                        restingClassName={SKIN.editResting}
                      />
                    </div>
                  )}
                </div>

                <div className={SKIN.itemRight}>
                  <div className={isDetail ? SKIN.contactValue : SKIN.contactEmail}>
                    <EditableText
                      value={isDetail ? c.value : c.email}
                      onCommit={ops.set(
                        PATH.contact(c.id, isDetail ? "value" : "email"),
                        isDetail ? c.value : c.email,
                      )}
                      ariaLabel={isDetail ? "contact detail" : "contact email"}
                      placeholder={isDetail ? "(no detail)" : "(no email)"}
                      editingClassName={SKIN.editEditing}
                      restingClassName={SKIN.editResting}
                    />
                  </div>
                  {c.provenance === "user" ? (
                    <AttributionLine attribution={{ kind: "user" }} skin={SKIN.attribution} />
                  ) : c.edited ? (
                    <AttributionLine
                      attribution={{ kind: "edited", wasVerbatim: "" }}
                      skin={SKIN.attribution}
                    />
                  ) : null}
                </div>
              </div>
            </SuppressShell>
          );
        })}
      </div>

      {adding ? (
        <AddForm
          fields={[
            { key: "name", label: "Name" },
            { key: "title", label: "Title" },
            { key: "email", label: "Email" },
          ]}
          onCancel={() => setAdding(false)}
          onSave={(v) => {
            setAdding(false);
            ops.add({
              id: newAddedId(),
              at: Date.now(),
              kind: "contact",
              name: v.name,
              title: v.title,
              email: v.email,
            });
          }}
        />
      ) : (
        <AddButton label="Add a contact" onClick={() => setAdding(true)} />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ *
 * The card
 * ------------------------------------------------------------------ */

export interface ChurchCardProps {
  card: ResolvedCard;
  /** 1-based, so a reviewer can say "the sixth one is wrong". */
  index: number;
  stale: boolean;
  departed: boolean;
  onOp: (op: GroupOp) => void;
  /**
   * Removing a church is not just another op, which is why it is not sent through
   * `onOp`. It is the one action that has to LAND before the page redraws, so the
   * owner of the save queue performs it — see `GroupReview`.
   *
   * This prop existed once before and was removed because every caller passed a
   * fresh inline closure, which silently made the `memo()` below a no-op. It is
   * back on the condition that killed it: `GroupReview` memoises it, so twenty
   * cards do not re-render because one of them can be deleted.
   */
  onRemoveChurch: (orgId: string) => void;
}

function ChurchCardInner({
  card,
  index,
  stale,
  departed,
  onOp,
  onRemoveChurch,
}: ChurchCardProps) {
  const [addingStep, setAddingStep] = useState(false);
  const [addingPathway, setAddingPathway] = useState(false);
  const [addingContact, setAddingContact] = useState(false);

  /**
   * ONE DIALOG PER CARD, holding whichever removal was asked for.
   *
   * Per-card rather than per-item: forty items each owning a `<dialog>` is forty
   * elements in the top layer waiting to be opened, and only one can ever be.
   */
  const [pending, setPending] = useState<PendingRemoval | null>(null);
  const ops = opsFor(card.orgId, onOp, setPending);
  const plate = PLATE_CLASS[logoPlate(card.logo?.theme)];
  const touched = card.editedCount > 0 || card.suppressedCount > 0;
  const liveSteps = card.steps.filter((s) => !s.suppressed).length;
  const liveContacts = exportContacts(card.contacts).filter((r) => r.rank !== null).length;
  const host = hostOf(card.churchUrl);

  const bodies: Record<ReviewField, React.ReactNode> = {
    name: <NameBody card={card} ops={ops} />,
    slogan: <SloganBody card={card} ops={ops} />,
    steps: <StepsBody card={card} ops={ops} adding={addingStep} setAdding={setAddingStep} />,
    pathway: (
      <PathwayBody card={card} ops={ops} adding={addingPathway} setAdding={setAddingPathway} />
    ),
    contacts: (
      <ContactsBody card={card} ops={ops} adding={addingContact} setAdding={setAddingContact} />
    ),
  };

  // Counts earn their place: they differ per church, and "0" is a thing you want
  // to catch while skimming. `undefined` where a number would be a claim we cannot
  // make — next-step pages that were never read have no count, and printing 0
  // would say we looked.
  const counts: Partial<Record<ReviewField, number | undefined>> = {
    steps: card.stepsLooked ? liveSteps : undefined,
    pathway: card.pathway.steps.length || undefined,
    contacts: liveContacts,
  };

  return (
    <article data-church={card.orgId} className={SKIN.card}>
      {/* The status rail. Untouched churches look untouched, so what you have
          already been through is visible without reading any of it again. */}
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 z-[1] w-[3px] ${
          card.suppressedCount ? SKIN.railStruck : touched ? SKIN.railEdited : "bg-transparent"
        }`}
      />

      {(stale || departed) && <p className={SKIN.banner}>{departed ? COPY.departed : COPY.stale}</p>}

      {/* ── the identity band ──
          Logo, name, quoted slogan, and the way out to the church's own site, all
          in the block you land on. The website used to be a labelled row of its
          own with a citation under the name; it is one button now, sitting under
          the identity it belongs to rather than floating top-right, and it is the
          only outbound link on the card.

          `Remove church` keeps the top-right corner to itself — it is the one
          irreversible action here and it should not share a cluster with the
          control you press forty times a day. */}
      <div data-identity className={SKIN.head}>
        <span className={`${SKIN.index} pt-1`}>{String(index).padStart(2, "0")}</span>

        <div className="flex min-w-0 flex-1 basis-[420px] flex-col gap-3">
          <div className="flex min-w-0 items-start gap-4">
            <div className={`${SKIN.logoBox} ${plate}`}>
              {card.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/leads/asset/logos-thumb/${card.logo.sha}.webp`}
                  alt=""
                  className="h-full w-full object-contain p-1.5"
                />
              ) : (
                /* INITIALS, NOT A 7px EXPLANATION. The reason used to be printed
                   inside the plate at a size nobody can read. The distinction it
                   preserved ("none found" vs "found one and rejected it") rides on
                   the flag chips instead, where it is legible. */
                <span className={SKIN.logoInitials}>{initialsOf(card.name.text)}</span>
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              <div data-field="name">{bodies.name}</div>
              <div data-field="slogan">{bodies.slogan}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {card.churchUrl ? (
              <SafeLink
                href={card.churchUrl}
                title={`Open ${host || card.churchUrl} in a new tab`}
                // THE ONLY OUTBOUND LINK ON A CARD, and `/leads/audit` asserts
                // exactly that by checking no `a[href]` renders outside
                // `[data-identity]`. That is what dropping the per-quote citations
                // turned from a design decision into a checkable claim.
                className={SKIN.visit}
              >
                <span aria-hidden="true" className="text-[15px] leading-none">
                  ↗
                </span>
                <span className="truncate">Visit {host || "website"}</span>
              </SafeLink>
            ) : (
              // A real answer, so it keeps the control's footprint rather than
              // collapsing and leaving the reviewer to wonder where the button is.
              <span className={SKIN.visitAbsent}>no website on file</span>
            )}
            <Flags flags={cardFlags(card)} />
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            setPending({
              title: "Remove this church from the batch?",
              /**
               * NAMES WHAT IS LOST, not what the button does.
               *
               * A batch entry is a frozen snapshot plus every correction typed
               * into it, and there is no `put back` for a church — this is the
               * one irreversible control on the page. For a church that has since
               * left the dataset the card says so itself: it is the only copy we
               * hold, so removing it does not send you back to the console, it
               * sends you nowhere.
               */
              body: (
                <>
                  <strong className="text-lead-ink">{card.name.text || card.orgId}</strong> will be
                  taken out of this batch
                  {card.editedCount + card.suppressedCount > 0 ? (
                    <>
                      , along with the {card.editedCount + card.suppressedCount} change
                      {card.editedCount + card.suppressedCount === 1 ? "" : "s"} you made to it
                    </>
                  ) : null}
                  . {departed
                    ? "This church has left the dataset, so this card is the only copy we hold — it cannot be collected again."
                    : "You can collect it again from the console."}
                </>
              ),
              confirmLabel: "Remove church",
              // Saves, then reloads. `GroupReview` owns both halves because it
              // owns the save queue — see `onRemoveChurch` there.
              run: () => onRemoveChurch(card.orgId),
            })
          }
          title="Remove this church from the batch"
          className={SKIN.btnDanger}
        >
          ✕ Remove church
        </button>
      </div>

      {/* ALL FIVE FIELDS, ALWAYS, IN `REVIEW_FIELDS` ORDER. `name` and `slogan`
          render inside the band above and the other three below it, but every one
          carries its `data-field` and they appear in this order in the DOM.
          `/leads/audit` reads the engine's constant and asserts the rendered order
          against it, so no redesign can quietly drop one for being empty. */}
      {REVIEW_FIELDS.filter((id) => id !== "name" && id !== "slogan").map((id) => (
        <details key={id} data-field={id} open className={SKIN.field}>
          <summary className={SKIN.summary}>
            <h3 className={SKIN.label}>{FIELD_LABEL[id]}</h3>
            {counts[id] != null && <span className={SKIN.count}>{counts[id]}</span>}
            <Chevron className={SKIN.chevron} />
          </summary>
          <div className={SKIN.value}>{bodies[id]}</div>
        </details>
      ))}

      {/* Mounted always, `open` driven by state — see `ConfirmDialog`, which has
          to call `showModal()` on a node React already put in the tree. */}
      <ConfirmDialog
        open={pending !== null}
        title={pending?.title ?? ""}
        body={pending?.body ?? null}
        confirmLabel={pending?.confirmLabel ?? "Confirm"}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          // Close FIRST. `run` may reload the page, and a `<dialog>` left open
          // across a navigation is a modal that reappears over the fresh page.
          const go = pending?.run;
          setPending(null);
          go?.();
        }}
      />
    </article>
  );
}

/**
 * Every committed keystroke replaces the whole group object, so `GroupReview`
 * re-`resolve()`s all twenty cards. Without this, fixing one typo re-renders
 * nineteen churches that did not change.
 */
export const ChurchCard = memo(ChurchCardInner);
