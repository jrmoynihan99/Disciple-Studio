"use client";

import { useEffect, useState } from "react";
import { churchFromRecord } from "@/lib/leads/engine/adapt";
import { colorState } from "@/lib/leads/engine/color";
import { favFmt } from "@/lib/leads/engine/favor";
import { answerLabel, QTITLE, recordLabel, verdictWord } from "@/lib/leads/engine/labels";
import { staffPhrase } from "@/lib/leads/engine/staff";
import { pathwayIsOrdered } from "@/lib/leads/engine/group-types";
import { pathwayOf } from "@/lib/leads/engine/snapshot";
import { stepsSummaryState } from "@/lib/leads/engine/steps";
import {
  APP_WEB_KEYS,
  REST_KEYS,
  type ChurchRecord,
  type EngineCtx,
  type QuestionKey,
  type VerdictState,
} from "@/lib/leads/engine/types";
import { hostOf, safeUrl } from "@/lib/leads/engine/url";
import { decodeEntities } from "@/lib/leads/engine/text";
import { BORDER_L, TEXT } from "../verdict";
import { Chevron } from "../Chevron";
import { SafeLink } from "../SafeLink";
import { EvidenceBody } from "./Evidence";
import { ProfileBlock } from "./ProfileBlock";
import { ContactBlock } from "./ContactBlock";

function Card({
  kicker,
  finding,
  state,
  q,
  children,
  qKey,
}: {
  kicker: string;
  finding: string;
  state: VerdictState;
  q?: (Record<string, unknown> & { answer?: string | null }) | null;
  children?: React.ReactNode;
  qKey?: QuestionKey;
}) {
  return (
    <details
      className={`group border-t border-l-[3px] border-lead-line first:border-t-0 ${BORDER_L[state]}`}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-3 hover:bg-lead-panel">
        <span className="min-w-0 flex-1">
          {/* The KICKER is the descriptive title, small; the FINDING is the
              church-specific answer and leads, because that is what a reader is
              looking for.

              Sizes are `.dv-tn` (10px mono bold) and `.dv-lbl` (13.5px / 1.35)
              out of `real-example.html`, not rounded-off approximations of them
              — the panel's whole hierarchy is built on half-pixel steps and
              flattening them is what made this read as one grey mass. */}
          <span className="block font-mono text-[10px] font-bold tracking-wider text-lead-ink2 uppercase">
            {kicker}
          </span>
          <span className="block text-[13.5px] leading-[1.35] font-semibold text-lead-ink">
            {finding}
          </span>
        </span>
        <span className={`shrink-0 text-[13px] font-bold ${TEXT[state]}`}>
          {verdictWord(state, qKey)}
        </span>
        {/* Native <details> owns its own open state, so the rotation comes off
            the parent's [open] attribute rather than from React. */}
        <Chevron className="text-lead-ink2 group-open:rotate-180" />
      </summary>
      <div className="px-3.5 pb-4">
        {children}
        {q && <EvidenceBody q={q} qKey={qKey} />}
      </div>
    </details>
  );
}

/**
 * Where the church is, without saying it twice.
 *
 * The record's `city` is already the fully-qualified display place
 * ("Clovis, CA, USA") while `region` is just its tail ("CA, USA") — so naively
 * joining them yields "Clovis, CA, USA, CA, USA". The slim index splits the two
 * (`ct: "Newton"`, `rg: "NC, USA"`), which is why this cannot be assumed either
 * way and has to be checked.
 */
function placeOf(record: ChurchRecord): string {
  const city = (record.city ?? "").trim();
  const region = (record.region ?? "").trim();
  if (!city && !region) return "";
  if (!city) return ` · ${region}`;
  if (!region || city.endsWith(region)) return ` · ${city}`;
  return ` · ${city}, ${region}`;
}

function Section({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-4">
      {/* .dv-h — 11px mono uppercase, .08em, 5px above its rule. It was 12.5px,
          which put the section heading ABOVE the finding it introduces in the
          type scale and inverted the hierarchy. */}
      <h3 className="mb-2 flex items-baseline gap-2 border-b border-lead-line pb-[5px] font-mono text-[11px] font-bold tracking-[.08em] text-lead-brand uppercase">
        <span className="flex-1">{title}</span>
        {right}
      </h3>
      <div className="overflow-hidden rounded-xl border border-lead-line">{children}</div>
    </section>
  );
}

export function Dossier({
  orgId,
  ctx,
  position,
  total,
  starred,
  note,
  onNote,
  onStar,
  onStep,
  onClose,
}: {
  orgId: string;
  ctx: EngineCtx;
  position: number;
  total: number;
  starred: boolean;
  note: string;
  onNote: (t: string) => void;
  onStar: () => void;
  onStep: (d: number) => void;
  onClose: () => void;
}) {
  const [record, setRecord] = useState<ChurchRecord | null>(null);
  const [error, setError] = useState(false);

  // No synchronous reset here: the caller mounts this with `key={orgId}`, so
  // moving to another church gives a genuinely fresh component. Clearing state
  // in the effect instead would render the previous church's evidence for one
  // frame under the new church's name.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/leads/church/${encodeURIComponent(orgId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: ChurchRecord) => !cancelled && setRecord(d))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const view = record ? churchFromRecord(record) : null;
  const brand = (record?.brand ?? {}) as Record<string, unknown>;
  const siteUrl = safeUrl(record?.own_url);

  /**
   * `w` opens the church's site.
   *
   * Lives here rather than in LeadConsole's global handler because that handler
   * has the org id but not the record, and re-fetching to answer a keypress
   * would put a network round trip in front of the most frequent action in the
   * product. Opening from a real keydown keeps it inside the user gesture, so no
   * popup blocker sees it.
   */
  useEffect(() => {
    if (!siteUrl) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "w" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      // The notes box is right here; typing "w" in it must type a w.
      if (["INPUT", "TEXTAREA", "SELECT"].includes(t?.tagName ?? "") || t?.isContentEditable) return;
      e.preventDefault();
      window.open(siteUrl, "_blank", "noopener,noreferrer");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [siteUrl]);

  // Read once here rather than inside the card, so the header's count and the
  // body's list are the same number by construction.
  const pathwaySteps = record ? pathwayOf(record).steps.length : 0;

  // "The rest" scores over its four rows: good = 1, good2 = 1/2.
  const restScore = view
    ? REST_KEYS.reduce((n, k) => {
        const s = colorState(k, view.q(k), ctx);
        return n + (s === "good" ? 1 : s === "good2" ? 0.5 : 0);
      }, 0)
    : 0;

  return (
    <>
      <header className="flex items-center gap-2 border-b border-lead-line px-4 py-3.5">
        <button
          type="button"
          onClick={() => onStep(-1)}
          title="previous (k / ↑)"
          className="size-[30px] rounded-md border border-lead-line bg-lead-panel font-mono text-sm text-lead-ink2 hover:text-lead-ink"
        >
          ↑
        </button>
        <button
          type="button"
          onClick={() => onStep(1)}
          title="next (j / ↓)"
          className="size-[30px] rounded-md border border-lead-line bg-lead-panel font-mono text-sm text-lead-ink2 hover:text-lead-ink"
        >
          ↓
        </button>
        <div className="min-w-0 flex-1">
          <span className="block truncate font-serif text-[19px] font-semibold text-lead-ink">
            {record?.name || (record ? "(unnamed)" : "…")}
          </span>
          <span className="font-mono text-[11px] text-lead-ink2">
            {position} of {total}
            {record ? placeOf(record) : ""}
          </span>
        </div>
        <button
          type="button"
          onClick={onStar}
          title="star (s)"
          aria-pressed={starred}
          className={`text-[22px] leading-none ${starred ? "text-lead-warn" : "text-lead-line"}`}
        >
          ★
        </button>
        <button
          type="button"
          onClick={onClose}
          title="close (Esc)"
          className="size-[30px] rounded-md border border-lead-line bg-lead-panel font-mono text-sm text-lead-ink2 hover:text-lead-ink"
        >
          ✕
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {error && (
          <p className="py-8 text-center font-mono text-xs text-lead-ink2">
            This church&apos;s record could not be loaded.
          </p>
        )}

        {/* An unloaded dossier shows a SKELETON, never a default-coloured
            answer. A colour that appears before its data has arrived is a
            claim we did not verify. */}
        {!record && !error && (
          <div className="space-y-3 pt-4">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-lead-panel" />
            ))}
          </div>
        )}

        {/* `lead-fade-in` runs once, on the frame the record replaces the
            skeleton. The panel is already open by then — the slide answered the
            click — so this is only about the swap not being a hard cut. */}
        {record && view && (
          <div className="lead-fade-in">
            {/* ── brand header ──
                It ALWAYS says something: a church we found nothing for must
                look different from one we never looked at. */}
            <div className="mb-4 flex items-center gap-3 border-b border-lead-line pt-4 pb-3">
              <div className="min-w-0">
                <div className="text-[15px] font-bold text-lead-ink">
                  {record.name || "(unnamed)"}
                </div>
                {typeof brand.slogan === "string" && brand.slogan.trim() ? (
                  <p className="mt-1 text-[13px] leading-tight italic text-lead-ink2">
                    “{decodeEntities(brand.slogan)}”
                  </p>
                ) : brand.slogan_scope === "homepage_only" ? (
                  <p
                    className="mt-1 text-xs text-lead-ink2 opacity-70"
                    title="Only the homepage was read for branding; inner pages such as /about were not fetched."
                  >
                    No slogan on the homepage{" "}
                    <span className="rounded bg-lead-unk px-1.5 font-mono text-[9px] text-lead-bg">
                      inner pages not read
                    </span>
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-lead-ink2 opacity-70">No slogan found</p>
                )}
              </div>
            </div>

            {/* The primary action, near the top and in the flow — no pinning.
                Bigger and clearer than the original small text link, but it
                belongs with the church's identity rather than in a bar of its
                own. It names the host so you can see where the click goes. */}
            {siteUrl ? (
              <SafeLink
                href={siteUrl}
                title="Open the church's website in a new tab (w)"
                className="mt-1 flex h-11 w-full items-center justify-center gap-2.5 rounded-xl bg-lead-brand px-4 text-[14.5px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                <span aria-hidden="true" className="text-[16px] leading-none">
                  ↗
                </span>
                Visit {hostOf(siteUrl)}
              </SafeLink>
            ) : (
              // Never a dead-looking button: say why there is nothing to open.
              <p className="mt-1 flex h-11 w-full items-center justify-center rounded-xl border border-dashed border-lead-line font-mono text-[11.5px] text-lead-ink2">
                no website URL on this record
              </p>
            )}
            {record.church_url && (
              <div className="mt-1.5 text-right font-mono text-[10.5px]">
                <SafeLink href={record.church_url} className="text-lead-link hover:underline">
                  church center ↗
                </SafeLink>
              </div>
            )}

            <textarea
              value={note}
              onChange={(e) => onNote(e.target.value)}
              placeholder="Team notes — everyone can see these."
              className="mt-3 min-h-[74px] w-full resize-y rounded-lg border border-lead-line bg-lead-panel px-2.5 py-2 text-xs text-lead-ink"
            />

            <Section title="Key findings — the crucial fields, highest scrutiny">
              <Card
                kicker="Paid staff"
                qKey="q2"
                // `staffPhrase`, not a local branch. This used to re-implement
                // the floor rule inline, so the dossier and the list tile each
                // knew it separately — and when a third claim (`floor_uncited`)
                // arrived, only one of them would have learned about it.
                finding={staffPhrase(view.q("q2"))}
                state={colorState("q2", view.q("q2"), ctx)}
                q={record.q2}
              />
              <Card
                kicker="Next steps"
                finding={
                  view.steps.looked
                    ? `${view.steps.nPresent}/${view.steps.nCats} Next Steps`
                    : "Next Steps (pages not read)"
                }
                state={stepsSummaryState(view.steps)}
              >
                <StepsDetail view={view} />
              </Card>
              {/* ── Discipleship ──
                  Promoted out of "the rest", where it used to be a yes/no
                  verdict on whether a pathway existed. The named stages are the
                  thing worth having: "they call it Growth Track and step two is
                  Baptism" is something a salesperson can open a call with, where
                  "has organized discipleship pathway: yes" is not.

                  Deliberately shaped like the Next steps card above it — same
                  kicker, same category tiles, same serif-on-a-rule quote — so a
                  reader comparing what a church offers against the order it puts
                  things in does not have to learn two layouts.

                  No `q` and no `qKey`, so no evidence panel: everything this
                  card knows is already in its body, and the retired verdict is
                  not something to resurrect underneath it. */}
              <Card
                kicker="Discipleship"
                finding={
                  pathwaySteps > 0
                    ? `${pathwaySteps} discipleship step${pathwaySteps === 1 ? "" : "s"}`
                    : "None identified"
                }
                // Green when a church is already thinking in stages — a fit
                // signal, the same reading the retired question had. Grey at
                // zero: "none identified" covers both "we never collected it"
                // and "there are none", and grey is the colour that already
                // means exactly that much.
                state={pathwaySteps > 0 ? "good" : "unk"}
              >
                <PathwayDetail record={record} />
              </Card>
              <Card
                kicker="Custom login"
                // `qKey` is REQUIRED here, not decorative. Without it the card
                // falls back to the generic verdict word, and q5's `unver` reads
                // "Needs a check" — the one wording this question must not use,
                // because the confirming step was retired upstream.
                qKey="q5"
                finding={
                  recordLabel(record.q5?.label) ||
                  answerLabel("q5", view.q("q5")?.answer ?? "unknown")
                }
                state={colorState("q5", view.q("q5"), ctx)}
                q={record.q5}
              />
            </Section>

            <Section title="App & Website">
              {APP_WEB_KEYS.map((k) => (
                <Card
                  key={k}
                  kicker={QTITLE[k]}
                  qKey={k}
                  finding={
                    recordLabel(record[k]?.label) ||
                    answerLabel(k, view.q(k)?.answer ?? "unknown")
                  }
                  state={colorState(k, view.q(k), ctx)}
                  q={record[k]}
                />
              ))}
            </Section>

            {/* ── THE REST — four rows, scored x/4 ──
                Rows are numbered 1..N linearly and that number is a POSITION,
                NOT AN IDENTITY. No "Q1".."Q10" string appears anywhere. */}
            <Section
              title="The rest — lighter-touch signals"
              right={
                <span
                  // 4/4 IS UNREACHABLE FOR MOST CHURCHES, ON PURPOSE. Campuses
                  // is `unknown` for 80% of the corpus, because only ~2,000 of
                  // 15,275 churches publish a locations page and the pipeline
                  // abstains rather than inferring single-site. An unmeasured
                  // signal must score 0, and a per-church denominator would make
                  // two churches incomparable — worse than a ceiling nobody
                  // reaches. The tooltip says so, so the gap reads as a fact
                  // about the data rather than a broken meter.
                  title="Favorable lighter-touch signals — green = 1, light green = ½. A signal we never measured scores 0, so most churches cannot reach 4."
                  className="font-mono text-[11px] normal-case text-lead-ink2"
                >
                  <b className="font-serif text-[15px] font-semibold text-lead-good">
                    {favFmt(restScore)}
                  </b>
                  /{REST_KEYS.length}
                </span>
              }
            >
              {REST_KEYS.map((k, i) => (
                <Card
                  key={k}
                  kicker={`${i + 1} · ${QTITLE[k]}`}
                  qKey={k}
                  finding={
                    recordLabel(record[k]?.label) ||
                    answerLabel(k, view.q(k)?.answer ?? "unknown")
                  }
                  state={colorState(k, view.q(k), ctx)}
                  q={record[k]}
                />
              ))}
            </Section>

            {/* `profileBlock` and `contactBlock` from core.js. They were the two
                pieces of the reference dossier this build had not ported — the
                console showed every verdict and none of the attributes or the
                people, so a reviewer who decided "yes" had nobody to call. */}
            <ProfileBlock record={record} />
            <ContactBlock record={record} />
          </div>
        )}
      </div>

    </>
  );
}

/** Per-category own-terms and quotes — the point of the whole structure. */
/**
 * The discipleship pathway, step by step.
 *
 * The sibling of `StepsDetail` below, and deliberately shaped like it — same
 * card, same uppercase kicker, same serif-on-a-rule quote — because a reader
 * comparing "what they offer" against "the order they put it in" should not have
 * to learn two layouts to do it.
 *
 * THREE THINGS HERE ARE NOT INTERCHANGEABLE, and collapsing any two of them
 * would assert something we did not measure:
 *
 *  · steps we captured, in the church's own order;
 *  · a pathway NAME with no steps — the site calls its programme something, and
 *    that is a real fact even when the stages were never enumerated;
 *  · nothing at all.
 *
 * Data note, so nobody reads the empty state as a bug: `q1.pathway_steps` is a
 * forward contract (INDEX-CONTRACT §3.1) and is unpopulated on all 134 records
 * in the current dataset. The console's rule is that a claim must not appear
 * before its data has, so this renders what is there and says so when nothing
 * is.
 */
export function PathwayDetail({ record }: { record: ChurchRecord }) {
  const pathway = pathwayOf(record);
  const steps = pathway.steps;

  if (steps.length === 0) {
    // ONE LINE, and not the header's words again. The card already says "None
    // identified"; repeating it here would spend a second row saying nothing,
    // on every church, in a section built for scanning. What this line adds is
    // the pathway's NAME where we have one — real data on 7 of 134, and the
    // difference between "we know nothing" and "we know what they call it".
    return (
      <p className="text-[12.5px] italic text-lead-ink2">
        {pathway.name ? (
          <>
            No steps collected · the site calls its pathway{" "}
            <span className="font-serif text-lead-ink">“{pathway.name}”</span>
          </>
        ) : (
          "No discipleship steps were collected for this church."
        )}
      </p>
    );
  }

  // A number is only printed when the church's own page put one there — the same
  // call the batch review card makes, from the same function, so the two can
  // never disagree about whether a church stated an order.
  const numbered = pathwayIsOrdered(pathway.orderBasis);

  return (
    <div className="flex flex-col gap-1.5">
      {pathway.name && (
        <p className="text-[12.5px] leading-snug text-lead-ink2">
          The site calls this{" "}
          <span className="font-serif italic text-lead-ink">“{pathway.name}”</span>.
        </p>
      )}

      <ol className="flex flex-col gap-1.5">
        {steps.map((s) => (
          <li
            key={s.id}
            className="rounded-md border border-lead-line bg-lead-panel2 px-2.5 py-1.5"
          >
            <span className="flex items-baseline gap-1.5">
              {numbered && (
                <span className="shrink-0 font-mono text-[10px] font-bold text-lead-brand tabular-nums">
                  {s.ordinal}.
                </span>
              )}
              {/* The step's name as the church wrote it. `label_verified` proves
                  those words are ON the page — never that they are the step's
                  name — so it is not shown as a badge here. Reading it as a
                  quality mark is exactly the misuse the type comment warns of. */}
              <span className="font-mono text-[10px] font-bold tracking-wider text-lead-brand uppercase">
                {s.label || "(unnamed step)"}
              </span>
            </span>

            {/* Their own word for the stage when it differs from the category we
                filed it under — "ConnectTR", "Growth Track". Verbatim, and the
                thing that makes a sales call sound informed. */}
            {s.categoryRaw && s.categoryRaw !== s.category && (
              <span className="mt-1 ml-1 inline-block rounded border border-lead-line bg-lead-bg px-2 py-0.5 text-xs text-lead-ink">
                {s.categoryRaw}
              </span>
            )}

            {s.blurb && !s.quote && (
              <p className="mt-1 text-[12px] leading-snug text-lead-ink2">{s.blurb}</p>
            )}

            {s.quote && (
              <blockquote className="mt-1.5 border-l-2 border-l-lead-line py-0.5 pl-2.5 font-serif text-[13px] leading-[1.5] text-lead-ink">
                “{s.quote}”
                {s.verified && (
                  <span className="ml-1.5 font-mono text-[10px] text-lead-ink2">
                    verified {s.verified}
                  </span>
                )}
                {s.sourceUrl && (
                  <span className="mt-1 block">
                    <SafeLink
                      href={s.sourceUrl}
                      className="text-[10px] break-all text-lead-link hover:underline"
                    />
                  </span>
                )}
              </blockquote>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

function StepsDetail({ view }: { view: ReturnType<typeof churchFromRecord> }) {
  const s = view.steps;

  if (!s.looked) {
    return (
      <p className="text-[12.5px] italic text-lead-ink2">
        No next-step / discipleship pages were read for this church — its next steps are
        unknown, not absent.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {s.cats.map((c) => (
        <div key={c.key} className="rounded-md border border-lead-line bg-lead-panel2 px-2.5 py-1.5">
          <span className="font-mono text-[10px] font-bold tracking-wider text-lead-brand uppercase">
            {c.label}
          </span>
          {c.state === "present" ? (
            <>
              {/* `own_terms` is what the church calls the thing — "ConnectTR",
                  "Growth Track". It is verbatim and is what makes a sales call
                  sound informed. Never normalise or title-case it. */}
              {!!c.own_terms?.length && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {c.own_terms.map((t) => (
                    <span
                      key={t}
                      className="rounded border border-lead-line bg-lead-bg px-2 py-0.5 text-xs text-lead-ink"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
              {/* Serif, on a left rule, like every other quote — this is a
                  sentence off the church's own page, not machine output. One
                  notch under `.dv-quote` because it is nested inside a category
                  card rather than standing on its own. */}
              {c.quote && (
                <blockquote className="mt-1.5 border-l-2 border-l-lead-line py-0.5 pl-2.5 font-serif text-[13px] leading-[1.5] text-lead-ink">
                  “{c.quote}”
                  {c.verified && (
                    <span className="ml-1.5 font-mono text-[10px] text-lead-ink2">
                      verified {c.verified}
                    </span>
                  )}
                  {c.source_url && (
                    <span className="mt-1 block">
                      <SafeLink
                        href={c.source_url}
                        className="text-[10px] break-all text-lead-link hover:underline"
                      />
                    </span>
                  )}
                </blockquote>
              )}
            </>
          ) : c.state === "absent_looked" ? (
            <p className="mt-0.5 text-[11.5px] italic text-lead-ink2">
              Not mentioned on the pages we read.
            </p>
          ) : (
            <p className="mt-0.5 text-[11.5px] italic text-lead-ink2">
              Next-step pages were not read.
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
