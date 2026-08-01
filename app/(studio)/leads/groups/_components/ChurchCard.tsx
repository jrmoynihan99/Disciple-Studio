"use client";

import { useState } from "react";
import { logoPlate, PLATE_CLASS } from "@/lib/leads/engine/logo";
import { hostOf } from "@/lib/leads/engine/url";
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
import { SafeLink } from "../../_components/SafeLink";
import { AttributionLine } from "./Attribution";
import { EditableText } from "./EditableText";

/**
 * One church, as it would go out.
 *
 * Deliberately not a console row. The console is a dense grid built for scanning
 * fourteen thousand churches; this is built for reading forty, slowly, and
 * noticing that one of them says something wrong. Wide measure, serif for
 * anything that is the church's own voice, and every claim carrying its
 * provenance on the line beneath it.
 */

interface Props {
  card: ResolvedCard;
  stale: boolean;
  departed: boolean;
  onOp: (op: GroupOp) => void;
  onRemoveChurch: () => void;
}

const H = "font-mono text-[10px] font-bold tracking-[0.14em] text-lead-ink2 uppercase";

function Section({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-7 border-t border-lead-line pt-5">
      <div className="mb-3 flex items-baseline gap-3">
        <h3 className={H}>{title}</h3>
        {right}
      </div>
      {children}
    </section>
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
      className={`group/item relative rounded-lg border px-3 py-2.5 ${
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

      <div className="absolute top-2 right-2 flex items-center gap-2 opacity-0 transition-opacity group-hover/item:opacity-100 focus-within:opacity-100">
        {suppressed ? (
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
            title="Strike this out. It stays here so you can put it back."
            className="rounded border border-lead-line bg-lead-panel px-1.5 py-0.5 font-mono text-[10px] text-lead-ink2 hover:text-lead-bad"
          >
            remove
          </button>
        ) : (
          <button
            type="button"
            onClick={onDelete}
            title="Delete. You wrote this, so there is nothing to put back."
            className="rounded border border-lead-line bg-lead-panel px-1.5 py-0.5 font-mono text-[10px] text-lead-ink2 hover:text-lead-bad"
          >
            delete
          </button>
        )}
      </div>
    </div>
  );
}

/** A quotation, with the claim it is allowed to make printed underneath. */
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
    <div className="mt-2 border-l-2 border-lead-line pl-3">
      <div data-quote className="font-serif text-[15px] leading-relaxed italic text-lead-ink">
        <EditableText value={voice.text} onCommit={onCommit} multiline ariaLabel={ariaLabel} />
      </div>
      <AttributionLine
        attribution={voice.attribution}
        onRevert={voice.attribution.kind === "edited" ? onRevert : undefined}
      />
    </div>
  );
}

export function ChurchCard({ card, stale, departed, onOp, onRemoveChurch }: Props) {
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

  return (
    <article
      data-church={card.orgId}
      className="relative mb-6 overflow-hidden rounded-2xl border border-lead-line bg-lead-panel"
    >
      {/* The status rail. Untouched cards look untouched, so what you have
          already been through is visible without reading any of it again. */}
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-[3px] ${
          card.suppressedCount ? "bg-lead-bad" : touched ? "bg-lead-brand" : "bg-transparent"
        }`}
      />

      <div className="px-7 py-6 pl-8">
        {(stale || departed) && (
          <p className="mb-4 rounded-lg border border-lead-unk/50 bg-lead-unk/10 px-3 py-2 font-mono text-[10px] leading-relaxed text-lead-ink">
            {departed
              ? "This church is no longer in the dataset. The card below is the only copy we hold, and there is nothing left to re-pull from."
              : "The source record has changed since this was added. The card below is what you froze — it is not being updated."}
          </p>
        )}

        {/* ── identity ── */}
        <div className="flex items-start gap-5">
          <div
            className={`grid h-[72px] w-[72px] shrink-0 place-items-center overflow-hidden rounded-xl ${plate}`}
          >
            {card.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/leads/asset/logos-thumb/${card.logo.sha}.webp`}
                alt=""
                className="h-full w-full object-contain p-1.5"
              />
            ) : (
              <span className="px-1 text-center font-mono text-[8px] leading-tight text-lead-ink2">
                {card.noLogo?.reason.replace(/_/g, " ") ?? "no logo"}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="font-serif text-[26px] leading-tight font-semibold tracking-tight text-lead-ink">
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
            {card.nameOriginal && card.nameOriginal !== card.name.text && (
              <p className="mt-1 font-mono text-[10px] text-lead-ink2">
                scraped as “{card.nameOriginal}”, repaired
              </p>
            )}

            {/* ── slogan: three states, and editing preserves all three ── */}
            <div className="mt-3">
              {card.slogan.kind === "slogan" ? (
                <>
                  <div className="font-serif text-[17px] leading-snug italic text-lead-ink2">
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
                <div className="text-[13px] text-lead-ink2 opacity-70">
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
                className="mt-2 inline-block font-mono text-[11px] text-lead-link underline underline-offset-2"
              >
                {hostOf(card.churchUrl) || card.churchUrl}
              </SafeLink>
            )}
          </div>

          <button
            type="button"
            onClick={onRemoveChurch}
            title="Remove this church from the group"
            className="shrink-0 rounded-md border border-lead-line px-2 py-1 font-mono text-[10px] text-lead-ink2 hover:border-lead-bad hover:text-lead-bad"
          >
            remove church
          </button>
        </div>

        {/* ── next steps ── */}
        <Section
          title="Next steps"
          right={
            <button
              type="button"
              onClick={() => setAddingStep(true)}
              className="font-mono text-[10px] text-lead-ink2 underline underline-offset-2 hover:text-lead-brand"
            >
              + add
            </button>
          }
        >
          {!card.stepsLooked && (
            <p className="mb-2 font-mono text-[11px] text-lead-ink2">
              Next-step pages were never read for this church. This is not a list of
              what they lack.
            </p>
          )}
          {card.stepsLooked && card.steps.length === 0 && (
            <p className="mb-2 font-mono text-[11px] text-lead-ink2">
              We read their next-step pages and found none named.
            </p>
          )}

          <div className="space-y-1">
            {card.steps.map((s: ResolvedStep) => (
              <SuppressShell
                key={s.id}
                suppressed={s.suppressed}
                provenance={s.provenance}
                onSuppress={suppress(s.id)}
                onRestore={restore(s.id)}
                onDelete={del(s.id)}
              >
                <div className="pr-20 text-[14px] font-medium text-lead-ink">
                  <EditableText
                    value={s.label.text}
                    onCommit={set(PATH.step(s.id, "label"), s.label.text)}
                    ariaLabel="step name"
                  />
                </div>
                {s.ownTerms.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1.5 pl-2">
                    {s.ownTerms.map((t) => (
                      // Their words, verbatim and read-only. Editing these would be
                      // editing a quotation without the affordances of one.
                      <span
                        key={t}
                        title="the church's own wording"
                        className="rounded-full border border-lead-line px-2 py-px font-mono text-[10px] text-lead-ink2"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
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
        </Section>

        {/* ── discipleship ── */}
        <Section
          title="Discipleship"
          right={
            <button
              type="button"
              onClick={() => setAddingPathway(true)}
              className="font-mono text-[10px] text-lead-ink2 underline underline-offset-2 hover:text-lead-brand"
            >
              + add step
            </button>
          }
        >
          {card.pathway.name && (
            <p className="mb-2 text-[13px] text-lead-ink2">
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
              <p className="font-mono text-[11px] text-lead-ink2">
                Nothing quotable about discipleship was found on the pages we read.
              </p>
            )
          )}

          {card.pathway.steps.length > 0 && (
            <ol className="mt-4 space-y-1">
              {card.pathway.steps.map((s: ResolvedPathwayStep) => (
                <li key={s.id}>
                  <SuppressShell
                    suppressed={s.suppressed}
                    provenance={s.provenance}
                    onSuppress={suppress(s.id)}
                    onRestore={restore(s.id)}
                    onDelete={del(s.id)}
                  >
                    <div className="flex items-baseline gap-2 pr-20">
                      {/* A number is only printed when the church's own page put
                          one there. DOM order is not a sequence. */}
                      {s.ordinal != null && (
                        <span className="shrink-0 font-mono text-[11px] text-lead-brand">
                          {s.ordinal}.
                        </span>
                      )}
                      <div className="min-w-0 flex-1 text-[14px] font-medium text-lead-ink">
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
        </Section>

        {/* ── contacts ── */}
        <Section
          title="Contacts"
          right={
            <button
              type="button"
              onClick={() => setAddingContact(true)}
              className="font-mono text-[10px] text-lead-ink2 underline underline-offset-2 hover:text-lead-brand"
            >
              + add
            </button>
          }
        >
          {card.contactNote && (
            <p className="mb-2 text-[13px] text-lead-ink2">{card.contactNote}</p>
          )}
          {card.contacts.length === 0 && (
            <p className="font-mono text-[11px] text-lead-ink2">No contact details found.</p>
          )}

          <div className="space-y-1">
            {card.contacts.map((c: ResolvedContact) => (
              <SuppressShell
                key={c.id}
                suppressed={c.suppressed}
                provenance={c.provenance}
                onSuppress={suppress(c.id)}
                onRestore={restore(c.id)}
                onDelete={del(c.id)}
              >
                <div className="grid grid-cols-[1fr_1fr] gap-x-3 pr-20 max-[680px]:grid-cols-1">
                  {c.kind === "phone" || c.kind === "social" ? (
                    <div className="col-span-2 text-[13px] text-lead-ink max-[680px]:col-span-1">
                      <span className={`${H} mr-2`}>{c.network || "phone"}</span>
                      <EditableText
                        value={c.value}
                        onCommit={set(PATH.contact(c.id, "value"), c.value)}
                        ariaLabel={c.network || "phone"}
                      />
                    </div>
                  ) : (
                    <>
                      <div className="text-[14px] font-medium text-lead-ink">
                        <EditableText
                          value={c.name}
                          onCommit={set(PATH.contact(c.id, "name"), c.name)}
                          ariaLabel="contact name"
                          placeholder={c.kind === "churchEmail" ? "(church address)" : "(no name)"}
                        />
                      </div>
                      <div className="font-mono text-[12px] text-lead-link">
                        <EditableText
                          value={c.email}
                          onCommit={set(PATH.contact(c.id, "email"), c.email)}
                          ariaLabel="contact email"
                          placeholder="(no email)"
                        />
                      </div>
                      <div className="text-[12px] text-lead-ink2">
                        <EditableText
                          value={c.title}
                          onCommit={set(PATH.contact(c.id, "title"), c.title)}
                          ariaLabel="contact title"
                          placeholder="(no title)"
                        />
                      </div>
                    </>
                  )}
                </div>
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
        </Section>
      </div>
    </article>
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
      className="mt-2 rounded-lg border border-dashed border-lead-brand/60 p-3"
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
            className="w-full rounded-md border border-lead-line bg-lead-bg px-2 py-1.5 text-[13px] text-lead-ink"
          />
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="submit"
          className="rounded-md bg-lead-brand px-3 py-1 font-mono text-[11px] text-white"
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
