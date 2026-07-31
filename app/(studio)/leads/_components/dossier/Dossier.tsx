"use client";

import { useEffect, useState } from "react";
import { churchFromRecord } from "@/lib/leads/engine/adapt";
import { colorState } from "@/lib/leads/engine/color";
import { favFmt } from "@/lib/leads/engine/favor";
import { answerLabel, QTITLE, verdictWord } from "@/lib/leads/engine/labels";
import { staffText } from "@/lib/leads/engine/staff";
import { stepsSummaryState } from "@/lib/leads/engine/steps";
import {
  APP_WEB_KEYS,
  REST_KEYS,
  type ChurchRecord,
  type EngineCtx,
  type QuestionKey,
  type VerdictState,
} from "@/lib/leads/engine/types";
import { BORDER_L, TEXT } from "../verdict";
import { SafeLink } from "../SafeLink";
import { EvidenceBody } from "./Evidence";

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
    <details className={`border-t border-l-[3px] border-lead-line first:border-t-0 ${BORDER_L[state]}`}>
      <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-3 hover:bg-lead-panel">
        <span className="min-w-0 flex-1">
          {/* The KICKER is the descriptive title, small; the FINDING is the
              church-specific answer and leads, because that is what a reader is
              looking for. */}
          <span className="block font-mono text-[9.5px] font-bold tracking-wider text-lead-ink2 uppercase">
            {kicker}
          </span>
          <span className="block text-[13px] font-semibold text-lead-ink">{finding}</span>
        </span>
        <span className={`shrink-0 text-[13px] font-bold ${TEXT[state]}`}>
          {verdictWord(state, qKey)}
        </span>
        <span className="shrink-0 font-mono text-[11px] text-lead-ink2">⌄</span>
      </summary>
      <div className="px-3.5 pb-4">
        {children}
        {q && <EvidenceBody q={q} />}
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
      <h3 className="mb-2 flex items-baseline gap-2 border-b border-lead-line pb-1 font-mono text-[12.5px] font-bold tracking-wide text-lead-brand uppercase">
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

  // "The rest" scores over its five rows: good = 1, good2 = 1/2.
  const restScore = view
    ? REST_KEYS.reduce((n, k) => {
        const s = colorState(k, view.q(k), ctx);
        return n + (s === "good" ? 1 : s === "good2" ? 0.5 : 0);
      }, 0)
    : 0;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <aside
        aria-label="church dossier"
        className="fixed top-0 right-0 z-50 flex h-screen w-[480px] max-w-[94vw] flex-col border-l border-lead-line bg-lead-bg shadow-2xl"
      >
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

        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-16">
          {error && (
            <p className="py-8 text-center font-mono text-xs text-lead-ink2">
              This church&apos;s record could not be loaded.
            </p>
          )}

          {/* An unloaded dossier shows a SKELETON, never a default-coloured
              answer. A colour that appears before its data has arrived is a
              claim we did not verify. */}
          {!record && !error && (
            <div className="space-y-3">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-lead-panel" />
              ))}
            </div>
          )}

          {record && view && (
            <>
              {/* ── brand header ──
                  It ALWAYS says something: a church we found nothing for must
                  look different from one we never looked at. */}
              <div className="mb-4 flex items-center gap-3 border-b border-lead-line pb-3">
                <div className="min-w-0">
                  <div className="text-[15px] font-bold text-lead-ink">
                    {record.name || "(unnamed)"}
                  </div>
                  {typeof brand.slogan === "string" && brand.slogan ? (
                    <p className="mt-1 text-[13px] leading-tight italic text-lead-ink2">
                      “{brand.slogan}”
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

              <div className="flex flex-wrap items-center gap-3">
                {record.own_url && (
                  <SafeLink
                    href={record.own_url}
                    className="rounded-md bg-lead-brand px-3 py-1.5 text-[12.5px] font-semibold text-white"
                  >
                    Visit website ↗
                  </SafeLink>
                )}
                {record.church_url && (
                  <SafeLink
                    href={record.church_url}
                    className="font-mono text-[11px] text-lead-link hover:underline"
                  >
                    church center ↗
                  </SafeLink>
                )}
              </div>

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
                  finding={
                    view.q("q2")?.answer === "counted" && view.q("q2")?.count != null
                      ? view.q("q2")?.count_is_floor
                        ? `${staffText(view.q("q2"))} paid staff (at least)`
                        : `${view.q("q2")?.count} paid staff (est.)`
                      : "Not counted"
                  }
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
                <Card
                  kicker="Custom login"
                  finding={record.q5?.label ?? answerLabel("q5", view.q("q5")?.answer ?? "unknown")}
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
                      (record[k]?.label as string) ??
                      answerLabel(k, view.q(k)?.answer ?? "unknown")
                    }
                    state={colorState(k, view.q(k), ctx)}
                    q={record[k]}
                  />
                ))}
              </Section>

              {/* ── THE REST — five rows, scored x/5 ──
                  Rows are numbered 1..N linearly and that number is a POSITION,
                  NOT AN IDENTITY. No "Q1".."Q10" string appears anywhere. */}
              <Section
                title="The rest — lighter-touch signals"
                right={
                  <span
                    title="favorable lighter-touch signals (green = 1, light green = ½)"
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
                    finding={
                      (record[k]?.label as string) ??
                      answerLabel(k, view.q(k)?.answer ?? "unknown")
                    }
                    state={colorState(k, view.q(k), ctx)}
                    q={record[k]}
                  >
                    {/* Pathway reads OPPOSITE to its four neighbours: they are
                        all "the church lacks it, so there is something to sell",
                        where a green here means the church ALREADY HAS an
                        organized pathway — favourable because it signals fit. */}
                    {k === "q1" && (
                      <p className="mb-2 rounded-md bg-lead-panel2 px-2.5 py-1.5 text-[11px] italic text-lead-ink2">
                        Green here means the church <b>already has</b> a pathway — a fit
                        signal, not a gap to sell into.
                      </p>
                    )}
                  </Card>
                ))}
              </Section>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

/** Per-category own-terms and quotes — the point of the whole structure. */
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
          <span className="font-mono text-[9.5px] font-bold tracking-wider text-lead-brand uppercase">
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
              {c.quote && (
                <blockquote className="mt-1.5 max-h-24 overflow-y-auto rounded border border-lead-line bg-lead-bg px-2 py-1.5 font-mono text-[11px] text-lead-ink">
                  “{c.quote}”
                  {c.verified && (
                    <span className="ml-1.5 text-[10px] text-lead-ink2">
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
