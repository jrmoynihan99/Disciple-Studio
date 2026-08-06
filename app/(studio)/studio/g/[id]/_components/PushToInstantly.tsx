"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, Mail, Send, X } from "lucide-react";
import { renderRich } from "@/lib/leads/engine/merge";

/**
 * The batch → campaign handoff, and the last screen before a congregation is
 * emailed.
 *
 * IT PREVIEWS BEFORE IT SENDS, AND THE PREVIEW IS THE PLAN ITSELF. The GET and
 * the POST on this route share one planner server-side, so what is listed here
 * is what goes out — not a rendering of what probably goes out. The three things
 * worth reading before pressing send are the address, the greeting, and whether
 * we have written to this church before, so those are the three columns.
 *
 * NOTHING IS BLOCKED. Jason asked to be able to write to a church twice — a
 * second round to a different inbox after no reply is the plan, not an accident —
 * so a prior contact is a warning with its own button, never a refusal.
 */

interface Campaign {
  id: string;
  name: string;
  status: number;
  hasSteps: boolean;
  stepCount: number;
}

interface PriorContact {
  matchedAddress: string;
  replyCount: number;
  openCount: number;
  createdAt: string;
}

interface PlannedRow {
  churchName: string;
  slug: string;
  demoLink: string;
  email: string | null;
  firstName: string;
  title: string;
  source: "person" | "church_email" | null;
  why: string;
  priorContact: PriorContact | null;
  vars: Record<string, string>;
}

interface SequenceStep {
  number: number;
  delay: number;
  subject: string;
  body: string;
  variants: number;
}

interface Plan {
  groupName: string;
  rows: PlannedRow[];
  lookupFailed: string[];
  counts: {
    total: number;
    sendable: number;
    unreachable: number;
    named: number;
    previouslyContacted: number;
  };
}

interface PushResult {
  ok: boolean;
  redirectedTo: string | null;
  pushed: number;
  pushedNames: string[];
  skipped: { churchName: string; reason: string }[];
  failed: { churchName: string; error: string }[];
}

const daysSince = (iso: string) => {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.round((Date.now() - t) / 86_400_000));
};

export function PushToInstantly({ groupId }: { groupId: string }) {
  const [open, setOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [campaignId, setCampaignId] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<PushResult | null>(null);
  const [steps, setSteps] = useState<SequenceStep[] | null>(null);
  const [previewSlug, setPreviewSlug] = useState("");
  const [testMode, setTestMode] = useState(false);
  const [redirectTo, setRedirectTo] = useState("");

  /**
   * `jason+dacus-church@gmail.com` — mirrors `testAddress` on the server so the
   * dialog can SHOW the destination before anything is pushed. The server does
   * this again and is the authority; this copy only has to be honest about what
   * is about to happen.
   */
  const testAddressPreview = (slug: string) => {
    const base = redirectTo.trim().toLowerCase();
    const at = base.indexOf("@");
    if (at <= 0) return "";
    const stem = base.slice(0, at).split("+")[0];
    const tag = slug.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "test";
    return `${stem}+${tag}@${base.slice(at + 1)}`;
  };

  /**
   * The sequence is fetched once per campaign and rendered in the browser against
   * the variables the plan already returned — so flicking between churches to
   * spot-check openers is instant instead of a request each.
   */
  useEffect(() => {
    if (!campaignId) {
      setSteps(null);
      return;
    }
    let alive = true;
    setSteps(null);
    (async () => {
      try {
        const res = await fetch(`/api/instantly/campaigns/${campaignId}`);
        const body = await res.json();
        if (!alive) return;
        if (res.ok) setSteps(body.steps);
      } catch {
        /* the preview is optional; the push does not depend on it */
      }
    })();
    return () => {
      alive = false;
    };
  }, [campaignId]);

  /** Default to the first church that will actually receive something. */
  useEffect(() => {
    if (!previewSlug && plan) {
      setPreviewSlug(plan.rows.find((r) => r.email)?.slug ?? "");
    }
  }, [plan, previewSlug]);

  const previewRow = plan?.rows.find((r) => r.slug === previewSlug) ?? null;

  /**
   * Rendered on the fly. `empty` and `unknown` are the reason this exists: an
   * opener that resolves to "Hi ," is invisible in a template and obvious here.
   */
  const rendered = useMemo(() => {
    if (!steps || !previewRow) return null;
    return steps.map((s) => {
      const subject = renderRich(s.subject, previewRow.vars, previewRow.slug);
      const body = renderRich(s.body, previewRow.vars, previewRow.slug);
      return {
        step: s,
        subject,
        body,
        holes: [...new Set([...subject.empty, ...body.empty])],
        unknown: [...new Set([...subject.unknown, ...body.unknown])],
      };
    });
  }, [steps, previewRow]);

  const totalHoles = (rendered ?? []).reduce((n, r) => n + r.holes.length, 0);

  /**
   * Both loads start together on open. The plan is the slow one — it asks
   * Instantly about every address the batch holds, which is a request each — and
   * making the campaign picker wait behind it would leave the dialog blank for
   * the whole time for no reason.
   */
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setError("");
    setPlan(null);
    setResult(null);

    (async () => {
      try {
        const res = await fetch("/api/instantly/campaigns");
        const body = await res.json();
        if (!alive) return;
        if (!res.ok) throw new Error(body.error ?? "Could not load campaigns");
        setCampaigns(body.campaigns);
        if (body.campaigns.length === 1) setCampaignId(body.campaigns[0].id);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Could not load campaigns");
      }
    })();

    (async () => {
      try {
        const res = await fetch(`/api/groups/${groupId}/instantly`);
        const body = await res.json();
        if (!alive) return;
        if (!res.ok) throw new Error(body.error ?? "Could not build the preview");
        setPlan(body);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Could not build the preview");
      }
    })();

    return () => {
      alive = false;
    };
  }, [open, groupId]);

  async function push(onlyNew: boolean) {
    if (!campaignId) return;
    if (testMode && !redirectTo.trim()) {
      setError("Enter the address to send the test to, or untick test mode.");
      return;
    }
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/groups/${groupId}/instantly`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          onlyNew,
          redirectTo: testMode ? redirectTo.trim() : "",
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Push failed");
      setResult(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Push failed");
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm font-medium text-fg-secondary hover:border-brand hover:text-brand"
      >
        <Send className="h-4 w-4" /> Push to Instantly
      </button>
    );
  }

  const chosen = campaigns?.find((c) => c.id === campaignId);
  const prior = plan?.counts.previouslyContacted ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
      {/* Wide enough for three email columns to each hold a readable line
          length. `max-w-6xl` puts them at roughly 22em apiece on a laptop,
          which is close to the measure an email is actually read at. */}
      <div className="w-full max-w-6xl rounded-2xl border border-line bg-surface p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-fg">Push to Instantly</h2>
            <p className="mt-1 text-sm text-fg-muted">
              Adds this batch as leads. The sequence itself lives in the campaign you pick.
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg p-1.5 text-fg-muted hover:bg-surface-raised hover:text-fg"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-error/40 bg-error/5 px-3 py-2 text-sm text-error">{error}</p>
        )}

        {result ? (
          <div className="mt-6 space-y-3 text-sm">
            <p className="font-medium text-fg">
              {result.pushed} of {plan?.counts.total ?? 0} pushed
              {chosen ? ` to “${chosen.name}”` : ""}.
            </p>
            {result.redirectedTo && (
              <p className="rounded-lg border border-brand/40 bg-brand/5 px-3 py-2 text-fg-secondary">
                <strong className="text-fg">Test run.</strong> Every email went to{" "}
                <span className="font-mono">{result.redirectedTo}</span> — no church was written to.
              </p>
            )}
            {result.skipped.length > 0 && (
              <details className="rounded-lg border border-line px-3 py-2">
                <summary className="cursor-pointer text-fg-secondary">{result.skipped.length} skipped</summary>
                <ul className="mt-2 space-y-1 text-fg-muted">
                  {result.skipped.map((s) => (
                    <li key={s.churchName}>
                      {s.churchName} — {s.reason}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {result.failed.length > 0 && (
              <div className="rounded-lg border border-error/40 bg-error/5 px-3 py-2">
                <p className="font-medium text-error">{result.failed.length} failed</p>
                <ul className="mt-1 space-y-1 text-error/90">
                  {result.failed.map((f) => (
                    <li key={f.churchName}>
                      {f.churchName} — {f.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <button
              onClick={() => setOpen(false)}
              className="mt-2 rounded-lg bg-surface-inverted px-3 py-2 font-medium text-fg-inverted hover:opacity-90"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <label className="mt-6 block text-sm font-medium text-fg">
              Campaign
              <select
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
                disabled={!campaigns}
                className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg disabled:opacity-50"
              >
                <option value="">{campaigns ? "Choose a campaign…" : "Loading…"}</option>
                {(campaigns ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.hasSteps ? ` · ${c.stepCount} step${c.stepCount === 1 ? "" : "s"}` : " · no sequence written"}
                  </option>
                ))}
              </select>
            </label>

            {/* An empty campaign accepts leads and then never emails them. That
                looks identical to a successful push until you go and check. */}
            {chosen && !chosen.hasSteps && (
              <p className="mt-2 inline-flex items-start gap-1.5 text-sm text-warning">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                This campaign has no sequence written yet. Leads will be added and nothing will be sent
                until you write the emails in Instantly.
              </p>
            )}

            {/* TEST MODE. Deliberately above the church table, because it changes
                what every row in that table means. */}
            <div className="mt-4 rounded-xl border border-line p-3">
              <label className="flex items-center gap-2 text-sm font-medium text-fg">
                <input
                  type="checkbox"
                  checked={testMode}
                  onChange={(e) => setTestMode(e.target.checked)}
                  className="h-4 w-4"
                />
                Send to me instead — no church receives anything
              </label>
              {testMode && (
                <>
                  <input
                    type="email"
                    value={redirectTo}
                    onChange={(e) => setRedirectTo(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-2 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg"
                  />
                  <p className="mt-1.5 text-xs text-fg-muted">
                    Each church goes to its own <span className="font-mono">+tag</span> address so they arrive
                    as separate emails rather than being deduped into one. Greeting, church name and demo link
                    stay exactly as the real send.
                  </p>
                </>
              )}
            </div>

            {!plan ? (
              <p className="mt-6 inline-flex items-center gap-2 text-sm text-fg-muted">
                <Loader2 className="h-4 w-4 animate-spin" /> Checking every address against Instantly…
              </p>
            ) : (
              <>
                <div className="mt-6 flex flex-wrap gap-x-5 gap-y-1 text-sm text-fg-secondary">
                  <span>
                    <strong className="text-fg">{plan.counts.sendable}</strong> sendable
                  </span>
                  <span>
                    <strong className="text-fg">{plan.counts.named}</strong> greeted by name
                  </span>
                  {plan.counts.unreachable > 0 && (
                    <span className="text-warning">{plan.counts.unreachable} with no email</span>
                  )}
                  {prior > 0 && <span className="text-warning">{prior} contacted before</span>}
                </div>

                {plan.lookupFailed.length > 0 && (
                  <p className="mt-2 inline-flex items-start gap-1.5 text-sm text-warning">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    {plan.lookupFailed.length} address
                    {plan.lookupFailed.length === 1 ? "" : "es"} could not be checked against Instantly. Those
                    are shown as new but may not be.
                  </p>
                )}

                <div className="mt-4 max-h-80 overflow-y-auto rounded-xl border border-line">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-surface-raised text-xs uppercase tracking-wide text-fg-muted">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Church</th>
                        <th className="px-3 py-2 font-semibold">Goes to</th>
                        <th className="px-3 py-2 font-semibold">Greeting</th>
                        <th className="px-3 py-2 font-semibold">History</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {plan.rows.map((r) => {
                        const days = r.priorContact ? daysSince(r.priorContact.createdAt) : null;
                        return (
                          <tr key={r.slug} className={r.email ? "" : "bg-warning/5"}>
                            <td className="px-3 py-2 align-top">
                              <div className="font-medium text-fg">{r.churchName}</div>
                              <div className="text-xs text-fg-muted">{r.why}</div>
                            </td>
                            <td className="px-3 py-2 align-top">
                              {!r.email ? (
                                <span className="text-warning">no address — skipped</span>
                              ) : testMode && redirectTo.trim() ? (
                                <>
                                  <span className="text-brand">{testAddressPreview(r.slug)}</span>
                                  <div className="text-xs text-fg-muted line-through">{r.email}</div>
                                </>
                              ) : (
                                <span className="text-fg-secondary">{r.email}</span>
                              )}
                            </td>
                            <td className="px-3 py-2 align-top text-fg-secondary">
                              {r.firstName || <span className="text-fg-muted">generic</span>}
                            </td>
                            <td className="px-3 py-2 align-top">
                              {r.priorContact ? (
                                <span className="text-warning">
                                  {days === null ? "contacted before" : `${days}d ago`}
                                  {r.priorContact.replyCount > 0 ? " · replied" : " · no reply"}
                                </span>
                              ) : (
                                <span className="text-fg-muted">new</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* THE FINAL REVIEW. Rendered by our own renderer, not
                    Instantly's — it proves a slot is EMPTY, which is the bug
                    worth catching, but only a real send proves the exact bytes. */}
                {steps && steps.length > 0 && previewRow && (
                  <div className="mt-5 rounded-xl border border-line">
                    <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
                      <Mail className="h-4 w-4 text-fg-muted" />
                      <span className="text-sm font-medium text-fg">Preview the emails as</span>
                      <select
                        value={previewSlug}
                        onChange={(e) => setPreviewSlug(e.target.value)}
                        className="rounded-lg border border-line bg-surface px-2 py-1 text-sm text-fg"
                      >
                        {plan.rows
                          .filter((r) => r.email)
                          .map((r) => (
                            <option key={r.slug} value={r.slug}>
                              {r.churchName}
                            </option>
                          ))}
                      </select>
                      <span className="text-xs text-fg-muted">→ {previewRow.email}</span>
                    </div>

                    {totalHoles > 0 && (
                      <p className="flex items-start gap-1.5 border-b border-line bg-warning/5 px-3 py-2 text-sm text-warning">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        {totalHoles} empty slot{totalHoles === 1 ? "" : "s"} for this church — the
                        email would send with a gap. Give the tag a fallback, or use{" "}
                        <code className="font-mono">{"{{greeting}}"}</code>, which is never empty.
                      </p>
                    )}

                    {/* SIDE BY SIDE, because the thing being reviewed is a
                        SEQUENCE — whether email 2 follows from email 1 without
                        repeating it, and whether the three escalate. Stacked and
                        scrolling, you can only ever see one at a time, which is
                        the one comparison the layout should make easy.

                        Columns collapse to a stack under `lg`, where three of
                        them would be too narrow to read a paragraph in. */}
                    <div className="grid gap-3 p-3 lg:grid-cols-3">
                      {rendered!.map((r) => (
                        <div
                          key={r.step.number}
                          className="flex min-w-0 flex-col rounded-lg bg-surface-raised p-3"
                        >
                          <div className="flex flex-wrap items-baseline gap-x-2 text-xs text-fg-muted">
                            <span className="font-semibold uppercase tracking-wide text-fg-secondary">
                              Email {r.step.number}
                            </span>
                            <span>
                              {r.step.delay > 0 ? `after ${r.step.delay} day${r.step.delay === 1 ? "" : "s"}` : "immediately"}
                            </span>
                          </div>
                          {r.step.variants > 1 && (
                            <div className="mt-0.5 text-xs text-fg-muted">
                              {r.step.variants} variants — showing the first
                            </div>
                          )}
                          <p className="mt-1.5 border-b border-line pb-2 text-sm font-medium text-fg">
                            {r.subject.text ? (
                              // The subject is plain text in every mail client;
                              // stripping tags here means a stray <b> in the
                              // editor cannot render as bold in the preview and
                              // set a false expectation.
                              r.subject.text.replace(/<[^>]+>/g, "")
                            ) : (
                              <span className="text-fg-muted">(same thread — no new subject)</span>
                            )}
                          </p>
                          {/* THE REAL HTML, so bold reads as bold and a link is a
                              link you can click to check it points at the right
                              church. Sanitised in `renderRich` — allow-listed
                              tags only, no handlers, no remote fetches — and the
                              content is the user's own campaign read back over an
                              authenticated API.

                              Each column scrolls on its own so one long email
                              cannot stretch the row and push the others off. */}
                          {r.body.text ? (
                            <div
                              className="preview-body mt-2 max-h-[26rem] flex-1 overflow-y-auto break-words text-[13px] leading-relaxed text-fg-secondary"
                              dangerouslySetInnerHTML={{ __html: r.body.text }}
                            />
                          ) : (
                            <div className="mt-2 flex-1 text-[13px] text-fg-muted">(empty body)</div>
                          )}
                          {(r.holes.length > 0 || r.unknown.length > 0) && (
                            <p className="mt-2 border-t border-line pt-2 text-xs text-warning">
                              {r.holes.length > 0 && <>empty: {r.holes.join(", ")}. </>}
                              {r.unknown.length > 0 && <>unknown: {r.unknown.join(", ")}.</>}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => push(false)}
                    disabled={!campaignId || sending || plan.counts.sendable === 0}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-surface-inverted px-3 py-2 text-sm font-medium text-fg-inverted hover:opacity-90 disabled:opacity-50"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {testMode ? `Send ${plan.counts.sendable} test emails to me` : `Push all ${plan.counts.sendable}`}
                  </button>
                  {prior > 0 && (
                    <button
                      onClick={() => push(true)}
                      disabled={!campaignId || sending}
                      className="rounded-lg border border-line px-3 py-2 text-sm font-medium text-fg-secondary hover:border-brand hover:text-brand disabled:opacity-50"
                    >
                      Push only the {plan.counts.sendable - prior} new
                    </button>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    disabled={sending}
                    className="rounded-lg px-3 py-2 text-sm text-fg-muted hover:text-fg disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
