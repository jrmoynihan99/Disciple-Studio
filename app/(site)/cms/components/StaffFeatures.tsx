import { Glow, SectionHead } from "@/app/(site)/components/ui";
import FeatureRow from "@/app/(site)/components/FeatureRow";
import AccentBand from "@/app/(site)/components/AccentBand";
import SectionReveal from "@/components/reveal-animations/SectionReveal";

/* ——— campuses editor window ——— */
function CampusesVisual() {
  return (
    <div className="relative h-[400px] max-[980px]:h-auto max-[980px]:px-4 max-[980px]:py-6">
      <Glow className="left-1/2 top-1/2 h-[500px] w-[760px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(closest-side,rgba(187,74,35,0.15),transparent_75%)]" />
      <div className="absolute -left-5 top-5 w-[620px] animate-[bob_7s_ease-in-out_infinite] overflow-hidden rounded-2xl border border-paper/[0.11] bg-[#1a1611] shadow-[0_60px_120px_-50px_rgba(0,0,0,0.9)] max-[980px]:static max-[980px]:mx-auto max-[980px]:w-full max-[980px]:max-w-[620px]">
        <div className="px-[26px] py-[22px] max-[720px]:px-4">
          <div className="flex items-center justify-between gap-3 max-[720px]:flex-col max-[720px]:items-start">
            <b className="font-serif text-[19px] font-medium">Campuses</b>
            <span className="inline-flex gap-1.5">
              <span className="rounded-full bg-accent px-[11px] py-[5px] font-mono text-[9px] tracking-[0.08em] text-white">
                CAMBRIDGE
              </span>
              <span className="rounded-full border border-paper/20 px-[11px] py-[5px] font-mono text-[9px] tracking-[0.08em] text-paper/55">
                BOSTON
              </span>
              <span className="rounded-full border border-dashed border-paper/25 px-[11px] py-[5px] font-mono text-[9px] tracking-[0.08em] text-paper/50">
                + ADD
              </span>
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2.5 max-[720px]:grid-cols-1">
            <div>
              <div className="font-mono text-[9px] tracking-[0.1em] text-paper/45">
                SERVICE TIMES
              </div>
              <div className="mt-[5px] rounded-[9px] border border-paper/[0.13] bg-[#221c15] px-3 py-2.5 text-[13px]">
                Sun · 9:00 &amp; 11:00 AM
              </div>
            </div>
            <div>
              <div className="font-mono text-[9px] tracking-[0.1em] text-paper/45">
                ADDRESS
              </div>
              <div className="mt-[5px] rounded-[9px] border border-paper/[0.13] bg-[#221c15] px-3 py-2.5 text-[13px]">
                454 Massachusetts Ave
              </div>
            </div>
          </div>
          <div className="mt-3 font-mono text-[9px] tracking-[0.1em] text-paper/45">
            THIS CAMPUS SHOWS
          </div>
          <div className="mt-1.5 flex flex-wrap gap-[7px]">
            {[
              ["Its own sermons ✓", "0.2s"],
              ["Its own events ✓", "0.45s"],
              ["Its own groups ✓", "0.7s"],
            ].map(([t, d]) => (
              <span
                key={t}
                className="animate-[cyc_8s_infinite_both] rounded-full bg-accent/[0.14] px-3 py-1.5 text-[11px] font-semibold text-accent-soft"
                style={{ animationDelay: d }}
              >
                {t}
              </span>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-[9px] rounded-xl border border-paper/[0.09] bg-[#1e1913] px-3.5 py-[11px]">
            <span className="h-[7px] w-[7px] animate-pulse-dot rounded-full bg-accent" />
            <span className="text-[12.5px] text-paper/70">
              Members see their own campus everywhere, automatically.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ——— "this week" content list window ——— */
function ContentVisual() {
  const rows = [
    {
      icon: "▶",
      title: "Sermon · From Scarcity to Surrender",
      sub: "Published Sunday · Cambridge",
      badge: "LIVE ✓",
      delay: "0.2s",
    },
    {
      icon: "📅",
      title: "Event · Group Launch Night",
      sub: "Thursday · signups open",
      badge: "LIVE ✓",
      delay: "0.45s",
    },
    {
      icon: "👥",
      title: "Group · Families North",
      sub: "Synced from Planning Center",
      badge: "SYNCED ⇄",
      delay: "0.7s",
    },
  ];
  return (
    <div className="relative h-[420px] max-[980px]:h-auto max-[980px]:px-4 max-[980px]:py-6">
      <Glow className="left-1/2 top-1/2 h-[500px] w-[760px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(closest-side,rgba(187,74,35,0.15),transparent_75%)]" />
      <div className="absolute -right-5 top-5 w-[640px] animate-[bob_7s_0.4s_ease-in-out_infinite] overflow-hidden rounded-2xl border border-paper/[0.11] bg-[#1a1611] shadow-[0_60px_120px_-50px_rgba(0,0,0,0.9)] max-[980px]:static max-[980px]:mx-auto max-[980px]:w-full max-[980px]:max-w-[640px]">
        <div className="px-[26px] py-[22px] max-[720px]:px-4">
          <b className="font-serif text-[19px] font-medium">This week</b>
          <div className="mt-3.5 flex flex-col gap-[9px]">
            {rows.map((r) => (
              <div
                key={r.title}
                className="flex animate-[cyc_8s_infinite_both] items-center gap-3 rounded-xl border border-paper/10 bg-[#1e1913] px-[15px] py-3"
                style={{ animationDelay: r.delay }}
              >
                <span className="grid h-[34px] w-[34px] place-items-center rounded-[10px] bg-accent/[0.16] text-[13px] text-accent-soft">
                  {r.icon}
                </span>
                <div>
                  <b className="block text-[13px]">{r.title}</b>
                  <span className="text-[11px] text-paper/55">{r.sub}</span>
                </div>
                <span className="ml-auto whitespace-nowrap font-mono text-[9px] text-accent-soft">
                  {r.badge}
                </span>
              </div>
            ))}
            <div className="flex animate-[cyc_8s_0.95s_infinite_both] items-center gap-3 rounded-xl border border-dashed border-paper/20 px-[15px] py-3">
              <span className="grid h-[34px] w-[34px] place-items-center rounded-[10px] border border-dashed border-paper/25 text-[15px] text-paper/50">
                +
              </span>
              <span className="text-[13px] text-paper/55">
                New series · {"“"}The Table Is Set{"”"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StaffFeatures() {
  return (
    <section className="relative pt-[150px] max-[920px]:pt-24">
      <Glow className="left-1/2 top-[-120px] h-[560px] w-[1000px] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(187,74,35,0.2),rgba(187,74,35,0.05)_55%,transparent_78%)]" />
      <SectionReveal>
        <SectionHead
          animate
          className="px-6"
          kicker="03 // Built around your staff"
          title="Exactly what you need."
          titleEm="Nothing you don’t."
          titleEmMarker
        />
      </SectionReveal>
      <FeatureRow
        reveal
        num="01"
        className="mt-24 max-[980px]:mt-14"
        side="left"
        tag="FEATURE — CAMPUSES"
        title={"Multi-campus,\nbuilt in"}
        desc="Each campus gets its own times, sermons, events, and groups — managed from one place."
        visual={<CampusesVisual />}
      />
      <FeatureRow
        reveal
        num="02"
        className="mt-[120px] max-[980px]:mt-16"
        side="right"
        tag="FEATURE — YOUR CONTENT"
        title={"Sermons, events,\ngroups & series"}
        desc="Every content type your church runs on, each with an editor your staff will actually enjoy using."
        visual={<ContentVisual />}
      />
      <AccentBand
        tag={<>✦ BUILT FROM SCRATCH, FOR YOU</>}
        title={"No bloated builder.\nNo code. No double entry."}
        sub="We design your CMS around how your staff actually works — and they’ll run it without calling anyone."
        subMaxW="max-w-[27em]"
      />
    </section>
  );
}
