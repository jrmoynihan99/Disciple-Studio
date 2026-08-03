"use client";

import type { ChurchRecord } from "@/lib/leads/engine/types";
import { decodeEntities } from "@/lib/leads/engine/text";
import { SafeLink } from "../SafeLink";

/**
 * `profileBlock` from core.js — the church's attributes, and the scrape dates.
 *
 * Two rules the original records in comments, and both are load-bearing:
 *
 *  · SERVICE TIMES AND CAMPUSES ARE DELIBERATELY ABSENT. q9 and q10 answer both
 *    WITH citations; an uncited copy down here could contradict them, and the
 *    reader would have no way to tell which one was measured.
 *  · The three platform layers are THREE ROWS, and each says "Unknown" where we
 *    never identified one. Collapsing them into one line loses the difference
 *    between "we know the CMS and not the backend" and "we know nothing".
 *
 * The scrape dates are cache-file write times — the closest thing to a scrape
 * date that was ever recorded — and the block says exactly that rather than
 * implying a precision we do not have.
 */

interface Profile {
  place_display?: string;
  location?: string;
  address?: string;
  network?: string;
  denomination?: string;
  phone?: string;
  social?: Record<string, string>;
  giving_provider?: string;
  live_stream?: boolean;
  event_count?: number;
  analytics?: { has_ga?: boolean; has_pixel?: boolean };
  app_links?: string[];
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="shrink-0 text-lead-ink2">{label}:</span>
      <span className="min-w-0 font-semibold text-lead-ink">{children}</span>
    </div>
  );
}

export function ProfileBlock({ record }: { record: ChurchRecord }) {
  const pr = (record.profile ?? null) as Profile | null;
  const platforms =
    ((record.misc as Record<string, unknown> | undefined)?.platforms as
      | Record<string, string>
      | undefined) ?? {};
  const fetched = (record.fetched ?? {}) as Record<string, string>;

  if (!pr) return null;

  const social = Object.entries(pr.social ?? {}).filter(([, u]) => u);
  const apps = (pr.app_links ?? []).filter(Boolean);

  const activity: string[] = [];
  if (pr.live_stream) activity.push("live-stream");
  if (pr.event_count) activity.push(`${pr.event_count} dated events`);
  if (pr.analytics?.has_ga) activity.push("GA");
  if (pr.analytics?.has_pixel) activity.push("Meta Pixel");

  const place = pr.place_display || pr.location || "";
  const hasPlatforms = platforms.frontend || platforms.cms || platforms.backend;
  const dates = Object.entries(fetched).filter(([k]) => k !== "disc");

  const rows: React.ReactNode[] = [];
  if (place) rows.push(<Row key="loc" label="location">{decodeEntities(place)}</Row>);
  // Scraped off a contact page, so it arrives HTML-encoded — "Int&#39;l Ave".
  if (pr.address) rows.push(<Row key="addr" label="address">{decodeEntities(pr.address)}</Row>);
  if (pr.network) rows.push(<Row key="net" label="network">{pr.network}</Row>);
  if (pr.denomination) rows.push(<Row key="den" label="denomination">{pr.denomination}</Row>);
  if (pr.phone) rows.push(<Row key="ph" label="phone">{pr.phone}</Row>);
  if (pr.giving_provider) rows.push(<Row key="give" label="giving">{pr.giving_provider}</Row>);
  if (activity.length) rows.push(<Row key="act" label="activity">{activity.join(" · ")}</Row>);
  if (social.length)
    rows.push(
      <Row key="soc" label="social">
        {social.map(([k, u], i) => (
          <span key={k}>
            {i > 0 && " · "}
            <SafeLink href={u} className="font-normal text-lead-link hover:underline">
              {k}
            </SafeLink>
          </span>
        ))}
      </Row>,
    );
  if (apps.length)
    rows.push(
      <Row key="app" label="app">
        {apps.map((u, i) => (
          <span key={u}>
            {i > 0 && " · "}
            <SafeLink href={u} className="font-normal text-lead-link hover:underline">
              link
            </SafeLink>
          </span>
        ))}
      </Row>,
    );
  if (hasPlatforms) {
    rows.push(<Row key="fe" label="frontend">{platforms.frontend || "Unknown"}</Row>);
    rows.push(<Row key="cms" label="cms">{platforms.cms || "Unknown"}</Row>);
    rows.push(<Row key="be" label="backend">{platforms.backend || "Unknown"}</Row>);
  }

  if (!rows.length && !dates.length) return null;

  return (
    <section className="mt-5 border-t border-dashed border-lead-line pt-3 text-xs leading-[1.85] text-lead-ink2">
      <h4 className="mb-1 font-mono text-[10px] tracking-[.1em] text-lead-ink2 uppercase">
        Profile
      </h4>
      {rows}

      {dates.length > 0 && (
        <details className="mt-1.5 text-xs" open>
          <summary className="cursor-pointer font-mono text-[11px] text-lead-link">
            Date of Scraping
          </summary>
          <ul className="mt-[5px] pl-[15px]">
            {dates.map(([page, when]) => (
              <li key={page}>
                {page} — <b className="font-semibold text-lead-ink">{when}</b>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-[11px] text-lead-ink2">
            Taken from when each cached page was written. No fetch timestamp was recorded at
            crawl time.
          </p>
        </details>
      )}
    </section>
  );
}
