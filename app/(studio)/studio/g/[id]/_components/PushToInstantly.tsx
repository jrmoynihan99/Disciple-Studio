"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Send, X } from "lucide-react";

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
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/groups/${groupId}/instantly`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, onlyNew }),
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
      <div className="w-full max-w-3xl rounded-2xl border border-line bg-surface p-6 shadow-xl">
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
                              {r.email ? (
                                <span className="text-fg-secondary">{r.email}</span>
                              ) : (
                                <span className="text-warning">no address — skipped</span>
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

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => push(false)}
                    disabled={!campaignId || sending || plan.counts.sendable === 0}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-surface-inverted px-3 py-2 text-sm font-medium text-fg-inverted hover:opacity-90 disabled:opacity-50"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Push all {plan.counts.sendable}
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
