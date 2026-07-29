import { TrafficLights } from "@/components/ui";
import { Glow, SectionHead } from "@/app/(site)/components/ui";
import FeatureRow from "@/app/(site)/components/FeatureRow";
import PhoneFrame from "@/app/(site)/components/PhoneFrame";
import SectionReveal from "@/components/reveal-animations/SectionReveal";

/* ——— vehicle 01: guest site + floating /groups window ——— */
function WebsiteVisual() {
  return (
    <div className="relative h-[560px] max-[980px]:flex max-[980px]:h-auto max-[980px]:justify-center max-[980px]:px-4 max-[980px]:py-6">
      <Glow className="left-1/2 top-1/2 h-[620px] w-[860px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(closest-side,rgba(187,74,35,0.15),transparent_75%)]" />
      <div className="absolute -left-5 top-2.5 w-[620px] animate-[bob_7s_ease-in-out_infinite] overflow-hidden rounded-2xl border border-paper/[0.11] bg-[#1a1611] shadow-[0_60px_120px_-50px_rgba(0,0,0,0.9)] max-[980px]:static max-[980px]:w-full max-[980px]:max-w-[620px]">
        <div className="flex items-center gap-1.5 border-b border-paper/[0.09] px-4 py-3 font-mono text-[11px] text-paper/45">
          <TrafficLights small />
          <span className="ml-2">gracechurch.org</span>
        </div>
        <div className="flex items-center gap-3 border-b border-paper/[0.09] px-5 py-3">
          <b className="font-serif text-[15px]">Grace</b>
          <span className="ml-2.5 flex gap-2">
            {[0, 1, 2].map((i) => (
              <i key={i} className="block h-1 w-7 rounded-sm bg-paper/[0.14]" />
            ))}
          </span>
          <span className="ml-auto rounded-full bg-accent px-[13px] py-[5px] text-[10.5px] font-semibold text-white">
            Give
          </span>
        </div>
        <div className="bg-[linear-gradient(165deg,#241c14,#1a1611)] px-6 pb-[30px] pt-[34px]">
          <div className="font-serif text-[34px] leading-[1.05] tracking-[-0.015em]">
            You{"’"}re welcome here.
          </div>
          <div className="mt-2 text-[13.5px] text-paper/60">
            Sundays · 9 &amp; 11 AM
          </div>
          <span className="mt-4 inline-block rounded-full bg-paper px-[17px] py-[9px] text-xs font-semibold text-ink">
            Plan your visit
          </span>
        </div>
        <div className="px-6 pb-6 pt-[18px]">
          <div className="font-mono text-[9px] tracking-[0.12em] text-accent-soft">
            THIS SUNDAY
          </div>
          <div className="mt-[11px] grid grid-cols-3 gap-2.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex flex-col gap-[7px] rounded-[9px] border border-paper/[0.09] p-[9px]"
              >
                <span className="h-11 rounded-md bg-[#2a241d]" />
                <span className="h-1 w-[72%] rounded-sm bg-paper/[0.18]" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="absolute left-[360px] top-[150px] z-[2] w-[370px] animate-[bob_7s_0.8s_ease-in-out_infinite] overflow-hidden rounded-2xl border border-paper/[0.13] bg-[#1e1913] shadow-[0_50px_100px_-40px_rgba(0,0,0,0.95),0_24px_50px_-30px_rgba(187,74,35,0.25)] max-[980px]:hidden">
        <div className="flex items-center gap-1.5 border-b border-paper/10 px-[15px] py-[11px] font-mono text-[10.5px] text-paper/45">
          <TrafficLights small />
          <span className="ml-2">/groups</span>
        </div>
        <div className="px-5 pb-5 pt-[18px]">
          <b className="font-serif text-[19px] font-medium">
            Find your people.
          </b>
          <div className="mt-3.5 grid grid-cols-2 gap-[9px]">
            {[
              ["Young Adults", "Tuesdays · Cambridge", "3 seats open →"],
              ["Families North", "Sundays · Somerville", "5 seats open →"],
              ["Downtown", "Thursdays · Boston", "2 seats open →"],
            ].map(([t, s, cta]) => (
              <div
                key={t}
                className="rounded-[11px] border border-paper/10 px-[13px] py-3"
              >
                <b className="block text-[12.5px]">{t}</b>
                <span className="mt-[3px] block text-[11px] text-paper/55">
                  {s}
                </span>
                <span className="mt-2 inline-block text-[10.5px] font-semibold text-accent-soft">
                  {cta}
                </span>
              </div>
            ))}
            <div className="rounded-[11px] border-[1.5px] border-accent/55 bg-accent/[0.12] px-[13px] py-3">
              <b className="block text-[12.5px]">For you, Sarah</b>
              <span className="mt-[3px] block text-[11px] text-paper/55">
                Near you · Weeknights
              </span>
              <span className="mt-2 inline-block text-[10.5px] font-semibold text-accent-soft">
                Your next step {"→"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ——— vehicle 02: two floating phones ——— */
function AppVisual() {
  return (
    <div className="relative h-[660px] max-[980px]:flex max-[980px]:h-auto max-[980px]:justify-center max-[980px]:py-6">
      <Glow className="left-1/2 top-1/2 h-[720px] w-[760px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(closest-side,rgba(187,74,35,0.15),transparent_75%)]" />
      <div className="absolute left-[60px] top-5 w-[256px] animate-[bobr_7s_ease-in-out_infinite] max-[980px]:static">
        <PhoneFrame size="sm" screenClassName="flex h-[512px] flex-col">
          <div className="h-[42px]" />
          <div className="px-4">
            <div className="flex items-center justify-between">
              <div className="font-serif text-[21px]">Hi, Sarah.</div>
              <span className="rounded-full bg-accent/[0.16] px-2 py-1 font-mono text-[7.5px] tracking-[0.08em] text-accent-soft">
                CAMBRIDGE
              </span>
            </div>
            <div className="mt-2.5 rounded-[13px] border-[1.5px] border-accent/50 bg-accent/[0.13] px-[13px] py-2.5">
              <div className="flex items-center gap-1.5 font-mono text-[8.5px] tracking-[0.12em] text-accent-soft">
                <span className="h-[5px] w-[5px] animate-pulse-dot rounded-full bg-accent" />
                YOUR NEXT STEP
              </div>
              <b className="mt-1 block font-serif text-[15px] font-medium">
                Join a Community Group
              </b>
              <span className="mt-1.5 inline-block rounded-full bg-accent px-[11px] py-1.5 text-[10px] font-semibold text-white">
                Find a group {"→"}
              </span>
            </div>
            <div className="mt-2.5 rounded-[13px] border border-paper/10 bg-[#1e1913] px-3 py-2.5">
              <div className="font-mono text-[7.5px] tracking-[0.1em] text-paper/50">
                YOUR JOURNEY
              </div>
              <div className="mt-2 flex items-center">
                {[0, 1].map((i) => (
                  <span key={i} className="contents">
                    <span className="grid h-3.5 w-3.5 flex-none place-items-center rounded-full bg-accent text-[8px] text-white">
                      {"✓"}
                    </span>
                    <span className="h-[2px] flex-1 bg-accent" />
                  </span>
                ))}
                <span className="h-3 w-3 flex-none rounded-full border-2 border-accent" />
                <span className="h-[2px] flex-1 bg-paper/[0.13]" />
                <span className="h-3 w-3 flex-none rounded-full border-2 border-paper/20" />
              </div>
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <div className="rounded-[11px] border border-paper/10 bg-[#1e1913] px-2.5 py-2">
                <div className="font-mono text-[7px] tracking-[0.1em] text-paper/50">
                  YOUR GROUP
                </div>
                <b className="mt-0.5 block text-[10.5px]">Young Adults</b>
                <span className="text-[8.5px] text-paper/55">Tue · 7 PM</span>
              </div>
              <div className="rounded-[11px] border border-paper/10 bg-[#1e1913] px-2.5 py-2">
                <div className="font-mono text-[7px] tracking-[0.1em] text-paper/50">
                  YOUR GIVING
                </div>
                <b className="mt-0.5 block text-[10.5px]">$250 · July</b>
                <span className="text-[8.5px] text-accent-soft">
                  {"✓"} Recurring
                </span>
              </div>
            </div>
            <div className="mt-2.5 rounded-[13px] border border-paper/10 bg-[#1e1913] px-3 py-2">
              <div className="flex items-center gap-[9px]">
                <span className="grid h-[26px] w-[26px] place-items-center rounded-full bg-accent text-[8px] text-white">
                  {"▶"}
                </span>
                <div>
                  <b className="block text-[10.5px]">
                    From Scarcity to Surrender
                  </b>
                  <span className="text-[9px] text-paper/50">
                    Pastor John · 42 min
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-auto flex items-center justify-around border-t border-paper/[0.09] bg-night px-1.5 pb-3.5 pt-2.5">
            <span className="flex flex-col items-center gap-[3px] text-[8.5px] font-bold text-accent-soft">
              <span className="h-[5px] w-[5px] rounded-full bg-accent" />
              Home
            </span>
            {["Sermons", "Groups", "Give"].map((t) => (
              <span
                key={t}
                className="flex flex-col items-center gap-[3px] text-[8.5px] font-semibold text-paper/45"
              >
                <span className="h-[5px] w-[5px] rounded-full bg-paper/20" />
                {t}
              </span>
            ))}
          </div>
        </PhoneFrame>
      </div>
      <div className="absolute left-[330px] top-[90px] z-[2] w-[256px] animate-[bobr2_7s_0.9s_ease-in-out_infinite] max-[980px]:hidden">
        <PhoneFrame size="sm" screenClassName="flex h-[512px] flex-col">
          <div className="h-[46px]" />
          <div className="mx-2.5 animate-[cyc_8s_0.6s_infinite_both] rounded-[14px] border border-paper/[0.12] bg-[rgba(30,25,19,0.96)] px-[13px] py-[11px] shadow-[0_14px_30px_-14px_rgba(0,0,0,0.8)]">
            <div className="flex items-center gap-[7px]">
              <span className="grid h-5 w-5 place-items-center rounded-md bg-accent text-[10px] text-white">
                {"✝"}
              </span>
              <span className="text-[10px] font-semibold text-paper/70">
                GRACE FELLOWSHIP
              </span>
              <span className="ml-auto text-[9.5px] text-paper/45">now</span>
            </div>
            <b className="mt-1.5 block text-xs">Baptism Sunday — Aug 9</b>
            <span className="mt-px block text-[11px] text-paper/60">
              Your next step: sign up to be baptized.
            </span>
          </div>
          <div className="px-4 pt-3">
            <div className="font-serif text-[17px]">Sermons</div>
            <div className="mt-2 flex flex-col gap-1.5">
              {[
                ["From Scarcity to Surrender", "Jul 19"],
                ["The Table Is Set", "Jul 12"],
              ].map(([t, d]) => (
                <div
                  key={t}
                  className="flex items-center gap-[9px] rounded-[11px] border border-paper/[0.09] p-1.5"
                >
                  <span className="h-[30px] w-11 rounded-[7px] bg-[#2a241d]" />
                  <div>
                    <b className="block text-[10.5px]">{t}</b>
                    <span className="text-[9.5px] text-paper/50">{d}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="px-4 pt-3">
            <div className="font-serif text-[17px]">Events</div>
            <div className="mt-2 flex flex-col gap-1.5">
              {[
                ["Group Launch Night", "Thu · 7 PM", "📅"],
                ["Serve Day · Food Pantry", "Sat · 9 AM", "🤝"],
              ].map(([t, d, ic]) => (
                <div
                  key={t}
                  className="flex items-center gap-[9px] rounded-[11px] border border-paper/[0.09] p-1.5"
                >
                  <span className="grid h-[30px] w-[30px] place-items-center rounded-[9px] bg-accent/[0.16] text-[11px]">
                    {ic}
                  </span>
                  <div>
                    <b className="block text-[10.5px]">{t}</b>
                    <span className="text-[9.5px] text-paper/50">{d}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-auto flex items-center justify-around border-t border-paper/[0.09] bg-night px-1.5 pb-3.5 pt-2.5">
            <span className="flex flex-col items-center gap-[3px] text-[8.5px] font-semibold text-paper/45">
              <span className="h-[5px] w-[5px] rounded-full bg-paper/20" />
              Home
            </span>
            <span className="flex flex-col items-center gap-[3px] text-[8.5px] font-bold text-accent-soft">
              <span className="h-[5px] w-[5px] rounded-full bg-accent" />
              Sermons
            </span>
            {["Groups", "Give"].map((t) => (
              <span
                key={t}
                className="flex flex-col items-center gap-[3px] text-[8.5px] font-semibold text-paper/45"
              >
                <span className="h-[5px] w-[5px] rounded-full bg-paper/20" />
                {t}
              </span>
            ))}
          </div>
        </PhoneFrame>
      </div>
    </div>
  );
}

/* ——— vehicle 03: CMS editor clicks Publish, website + app stacked down
   its right edge with the fresh sermon live in each — every layer
   fading out through its own bottom mask ——— */
function CmsVisual() {
  return (
    <div className="relative h-[560px] max-[980px]:flex max-[980px]:h-auto max-[980px]:justify-center max-[980px]:px-4 max-[980px]:py-6">
      <Glow className="left-1/2 top-1/2 h-[620px] w-[860px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(closest-side,rgba(187,74,35,0.15),transparent_75%)]" />
      {/* the CMS — the one edit that starts it */}
      <div className="absolute -left-5 top-[46px] w-[520px] max-[980px]:static max-[980px]:w-full max-[980px]:max-w-[540px]">
        <div className="animate-[bob_7s_ease-in-out_infinite]">
          <div className="[-webkit-mask-image:linear-gradient(to_bottom,#000_66%,transparent_99%)] [mask-image:linear-gradient(to_bottom,#000_66%,transparent_99%)] max-[980px]:[-webkit-mask-image:none] max-[980px]:[mask-image:none]">
            <div className="overflow-hidden rounded-2xl border border-paper/[0.11] bg-[#1a1611] shadow-[0_60px_120px_-50px_rgba(0,0,0,0.9)]">
              <div className="grid grid-cols-[130px_1fr] max-[720px]:grid-cols-1">
                <div className="border-r border-paper/[0.09] py-4 max-[720px]:hidden">
                  <div className="flex items-center gap-[9px] bg-accent/[0.14] px-4 py-[9px] text-[12.5px] font-semibold text-accent-soft">
                    Sermons
                  </div>
                  {["Events", "Groups", "Series", "Campuses"].map((t) => (
                    <div
                      key={t}
                      className="px-4 py-[9px] text-[12.5px] font-medium text-paper/55"
                    >
                      {t}
                    </div>
                  ))}
                </div>
                <div className="px-[22px] pb-[26px] pt-[18px]">
                  <div className="flex items-center justify-between gap-3">
                    <b className="font-serif text-lg font-medium">
                      Edit sermon
                    </b>
                    <span className="relative">
                      <span className="inline-block animate-[clickfill_14s_infinite_both] rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white">
                        Publish
                      </span>
                      <span className="absolute left-1/2 top-[60%] z-[3] animate-[cur2_14s_infinite_both]">
                        <svg width="19" height="19" viewBox="0 0 24 24">
                          <path
                            d="M5 3l14 9-6 1.2-3.4 5.8L5 3z"
                            fill="#f4f0e8"
                            stroke="#1a1611"
                            strokeWidth="1.4"
                          />
                        </svg>
                      </span>
                    </span>
                  </div>
                  <div className="mt-3.5 font-mono text-[9px] tracking-[0.1em] text-paper/45">
                    TITLE
                  </div>
                  <div className="mt-[5px] rounded-[9px] border border-paper/[0.13] bg-[#221c15] px-3 py-[9px] text-[13.5px] font-medium">
                    From Scarcity to Surrender
                    <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-blink bg-accent align-middle" />
                  </div>
                  <div className="mt-2.5 grid grid-cols-2 gap-2.5 max-[720px]:grid-cols-1">
                    <div>
                      <div className="font-mono text-[9px] tracking-[0.1em] text-paper/45">
                        SPEAKER
                      </div>
                      <div className="mt-[5px] rounded-[9px] border border-paper/[0.13] bg-[#221c15] px-3 py-[9px] text-[13px]">
                        Pastor John
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-[9px] tracking-[0.1em] text-paper/45">
                        DATE
                      </div>
                      <div className="mt-[5px] rounded-[9px] border border-paper/[0.13] bg-[#221c15] px-3 py-[9px] text-[13px]">
                        Sun, Jul 19
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 font-mono text-[9px] tracking-[0.1em] text-paper/45">
                    MEDIA
                  </div>
                  <div className="mt-[5px] flex items-center gap-2.5 rounded-[9px] border border-dashed border-paper/20 px-3 py-2.5 text-xs text-paper/55">
                    <span className="grid h-[26px] w-[26px] place-items-center rounded-[7px] bg-[#2a241d]">
                      {"▶"}
                    </span>
                    sermon-0719.mp4 · uploaded {"✓"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* website — mini browser over the editor's right edge */}
      <div className="absolute left-[366px] top-[22px] z-[2] w-[340px] max-[980px]:hidden">
        <div className="animate-[bob_7s_0.6s_ease-in-out_infinite]">
          <div className="h-[248px] overflow-hidden [-webkit-mask-image:linear-gradient(to_bottom,#000_52%,transparent_97%)] [mask-image:linear-gradient(to_bottom,#000_52%,transparent_97%)]">
            <div className="overflow-hidden rounded-2xl border border-paper/[0.13] bg-[#1a1611] shadow-[0_50px_100px_-40px_rgba(0,0,0,0.95),0_24px_50px_-30px_rgba(187,74,35,0.25)]">
              <div className="flex items-center gap-1.5 border-b border-paper/[0.09] px-3.5 py-[11px] font-mono text-[10.5px] text-paper/45">
                <TrafficLights small />
                <span className="ml-2">gracechurch.org/sermons</span>
              </div>
              <div className="px-[18px] pb-5 pt-3.5">
                <div className="flex items-center justify-between gap-2">
                  <b className="font-serif text-[17px] font-medium">Sermons</b>
                  <span className="inline-flex animate-[cyc_8s_0.4s_infinite_both] items-center gap-1.5 rounded-full bg-accent/[0.14] px-[11px] py-[5px] text-[10.5px] font-semibold text-accent-soft">
                    {"✓"} Live on website
                  </span>
                </div>
                <div className="mt-3 flex animate-[cyc_8s_0.3s_infinite_both] items-center gap-2.5 rounded-xl border-[1.5px] border-accent/50 bg-accent/[0.10] p-2.5">
                  <span className="grid h-[36px] w-[50px] flex-none place-items-center rounded-lg bg-[#2a241d] text-[10px]">
                    {"▶"}
                  </span>
                  <div>
                    <b className="block text-[12.5px]">
                      From Scarcity to Surrender
                    </b>
                    <span className="text-[10.5px] text-paper/55">
                      Pastor John · Sun, Jul 19
                    </span>
                  </div>
                </div>
                {[
                  ["The Table Is Set", "Jul 12"],
                  ["Where Your Treasure Is", "Jul 5"],
                ].map(([t, d]) => (
                  <div
                    key={t}
                    className="mt-2 flex items-center gap-2.5 rounded-xl border border-paper/10 p-2.5"
                  >
                    <span className="h-[34px] w-12 flex-none rounded-lg bg-[#2a241d]" />
                    <div>
                      <b className="block text-xs text-paper/80">{t}</b>
                      <span className="text-[10.5px] text-paper/50">{d}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* app — phone tucked in below the browser, on top of everything */}
      <div className="absolute left-[404px] top-[240px] z-[3] w-[200px] max-[980px]:hidden">
        <div className="animate-[bob_7s_1.2s_ease-in-out_infinite]">
          <div className="h-[320px] overflow-hidden [-webkit-mask-image:linear-gradient(to_bottom,#000_42%,transparent_84%)] [mask-image:linear-gradient(to_bottom,#000_42%,transparent_84%)]">
            <PhoneFrame size="sm" screenClassName="h-[380px]">
              <div className="h-[42px]" />
              <div className="px-3.5">
                <div className="flex items-center justify-between gap-1.5">
                  <div className="font-serif text-[16px]">Sermons</div>
                  <span className="inline-flex animate-[cyc_8s_0.8s_infinite_both] items-center gap-1 rounded-full bg-accent/[0.14] px-2 py-1 text-[9px] font-semibold text-accent-soft">
                    {"✓"} Live in app
                  </span>
                </div>
                <div className="mt-2.5 animate-[cyc_8s_0.7s_infinite_both] rounded-[13px] border-[1.5px] border-accent/50 bg-accent/[0.13] px-2.5 py-2">
                  <div className="flex items-center gap-2">
                    <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-accent text-[8px] text-white">
                      {"▶"}
                    </span>
                    <div>
                      <b className="block text-[10.5px] leading-[1.3]">
                        From Scarcity to Surrender
                      </b>
                      <span className="text-[9px] text-paper/55">
                        Pastor John · Jul 19
                      </span>
                    </div>
                  </div>
                </div>
                {[
                  ["The Table Is Set", "Jul 12"],
                  ["Where Your Treasure Is", "Jul 5"],
                ].map(([t, d]) => (
                  <div
                    key={t}
                    className="mt-1.5 flex items-center gap-[9px] rounded-[11px] border border-paper/[0.09] p-1.5"
                  >
                    <span className="h-[30px] w-11 flex-none rounded-[7px] bg-[#2a241d]" />
                    <div>
                      <b className="block text-[10.5px]">{t}</b>
                      <span className="text-[9.5px] text-paper/50">{d}</span>
                    </div>
                  </div>
                ))}
              </div>
            </PhoneFrame>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Vehicles() {
  return (
    <section
      id="vehicles"
      className="relative scroll-mt-[88px] pt-[150px] max-[920px]:pt-24"
    >
      <Glow className="left-1/2 top-[-120px] h-[560px] w-[1000px] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(187,74,35,0.18),rgba(187,74,35,0.05)_55%,transparent_78%)]" />
      <SectionReveal>
        <SectionHead
          animate
          className="px-6"
          kicker="03 // The vehicles"
          title="Three vehicles deliver it."
          titleEm="Your ChMS fuels it."
          titleEmMarker
        />
      </SectionReveal>
      <FeatureRow
        reveal
        buttonCta
        num="01"
        className="mt-24 max-[980px]:mt-14"
        side="left"
        tag="VEHICLE 01 — THE WEBSITE"
        title="Your home base."
        desc="Custom and fast — built to represent you, function flawlessly, and help people take their next step."
        points={[
          "100% custom — no templates",
          "A warm front door for first-time guests",
          "A personal tool for every member who signs in",
        ]}
        link={{ label: "Learn more", href: "/website" }}
        visual={<WebsiteVisual />}
      />
      <FeatureRow
        reveal
        buttonCta
        num="02"
        className="mt-[120px] max-[980px]:mt-16"
        side="right"
        tag="VEHICLE 02 — THE APP"
        title="In their pocket."
        desc="Custom native iOS & Android — takes the engine to the next level with personalization in their pocket."
        points={[
          "100% custom — built from scratch",
          "Push notifications, timed by the engine",
          "Sermons, groups & giving built in",
        ]}
        link={{ label: "Learn more", href: "/app" }}
        visual={<AppVisual />}
      />
      <FeatureRow
        reveal
        buttonCta
        num="03"
        className="mt-[120px] max-[980px]:mt-16"
        side="left"
        tag="VEHICLE 03 — THE CMS"
        title="Publish once."
        desc="One edit updates the website and app together. Targeted messaging & every member’s journey at your fingertips."
        points={[
          "Targeted, segmented messaging",
          "A discipleship journey dashboard for every member",
          "Automatic two-way sync with your ChMS",
        ]}
        link={{ label: "Learn more", href: "/cms" }}
        visual={<CmsVisual />}
      />
    </section>
  );
}
