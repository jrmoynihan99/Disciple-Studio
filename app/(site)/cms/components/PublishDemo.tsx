import { TrafficLights } from "@/components/ui";
import { Glow, SectionHead } from "@/app/(site)/components/ui";
import PhoneFrame from "@/app/(site)/components/PhoneFrame";
import SectionReveal from "@/components/reveal-animations/SectionReveal";
import Reveal from "@/components/reveal-animations/Reveal";
import GlowReveal from "@/components/reveal-animations/GlowReveal";

/* CMS editor window that clicks Publish, with website + app mockups
   overlapping its right edge — the fresh sermon live at the top of
   each, all three fading out through the same bottom mask. */
export default function PublishDemo() {
  return (
    <section className="relative overflow-hidden px-6 pb-[30px] pt-[130px] text-center max-[920px]:pt-20">
      <Glow className="left-1/2 top-[-60px] h-[520px] w-[1000px] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(187,74,35,0.18),rgba(187,74,35,0.05)_55%,transparent_78%)]" />
      <div className="relative">
        <SectionReveal>
          <SectionHead
            animate
            kicker="01 // One edit"
            title={"Your staff edits once.\nEverything updates."}
            sub="No double entry, no bloated builder, no code. Effortless for non-technical staff to run and expand on their own."
            titleClassName="text-[clamp(36px,4.8vw,60px)]"
            subClassName="max-w-[31em]"
          />
        </SectionReveal>
        <GlowReveal
          delay={0.15}
          className="relative mx-auto mt-16 w-[min(980px,100%)] text-left"
          glow={
            <Glow className="left-1/2 top-1/2 h-[680px] w-[1200px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(closest-side,rgba(187,74,35,0.22),rgba(187,74,35,0.06)_55%,transparent_78%)]" />
          }
        >
          <div className="[-webkit-mask-image:linear-gradient(to_bottom,#000_60%,transparent_99%)] [mask-image:linear-gradient(to_bottom,#000_60%,transparent_99%)]">
            <div className="w-[660px] max-w-full overflow-hidden rounded-[18px] border border-paper/[0.11] bg-[#1a1611] shadow-[0_60px_140px_-50px_rgba(0,0,0,0.9)]">
              <div className="grid grid-cols-[140px_1fr] max-[720px]:grid-cols-1">
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
                <div className="px-6 pb-[26px] pt-5">
                  <div className="flex items-center justify-between gap-3">
                    <b className="font-serif text-[19px] font-medium">
                      Edit sermon
                    </b>
                    <span className="relative">
                      <span className="inline-block animate-[clickfill_14s_infinite_both] rounded-full bg-accent px-[18px] py-[9px] text-[12.5px] font-semibold text-white">
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
                  <div className="mt-4 font-mono text-[9px] tracking-[0.1em] text-paper/45">
                    TITLE
                  </div>
                  <div className="mt-[5px] rounded-[9px] border border-paper/[0.13] bg-[#221c15] px-3 py-2.5 text-[13.5px] font-medium">
                    From Scarcity to Surrender
                    <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-blink bg-accent align-middle" />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2.5 max-[720px]:grid-cols-1">
                    <div>
                      <div className="font-mono text-[9px] tracking-[0.1em] text-paper/45">
                        SPEAKER
                      </div>
                      <div className="mt-[5px] rounded-[9px] border border-paper/[0.13] bg-[#221c15] px-3 py-2.5 text-[13px]">
                        Pastor John
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-[9px] tracking-[0.1em] text-paper/45">
                        DATE
                      </div>
                      <div className="mt-[5px] rounded-[9px] border border-paper/[0.13] bg-[#221c15] px-3 py-2.5 text-[13px]">
                        Sun, Jul 19
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 font-mono text-[9px] tracking-[0.1em] text-paper/45">
                    MEDIA
                  </div>
                  <div className="mt-[5px] flex items-center gap-2.5 rounded-[9px] border border-dashed border-paper/20 px-3 py-[11px] text-[12.5px] text-paper/55">
                    <span className="grid h-[26px] w-[26px] place-items-center rounded-[7px] bg-[#2a241d]">
                      {"▶"}
                    </span>
                    sermon-0719.mp4 · uploaded {"✓"}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="max-[980px]:mt-8 max-[980px]:flex max-[980px]:flex-wrap max-[980px]:items-start max-[980px]:justify-center max-[980px]:gap-6">
            {/* website — mini browser, fresh sermon at the top */}
            <Reveal
              delay={0.5}
              className="absolute left-[450px] top-[64px] z-[2] w-[360px] max-[980px]:static max-[980px]:w-[min(380px,100%)]"
            >
              <div className="animate-[bob_7s_0.6s_ease-in-out_infinite]">
                <div className="h-[290px] overflow-hidden [-webkit-mask-image:linear-gradient(to_bottom,#000_55%,transparent_97%)] [mask-image:linear-gradient(to_bottom,#000_55%,transparent_97%)]">
                  <div className="overflow-hidden rounded-2xl border border-paper/[0.13] bg-[#1a1611] shadow-[0_50px_100px_-40px_rgba(0,0,0,0.95),0_24px_50px_-30px_rgba(187,74,35,0.25)]">
                    <div className="flex items-center gap-1.5 border-b border-paper/[0.09] px-3.5 py-[11px] font-mono text-[10.5px] text-paper/45">
                      <TrafficLights small />
                      <span className="ml-2">gracechurch.org/sermons</span>
                    </div>
                    <div className="px-[18px] pb-5 pt-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <b className="font-serif text-[18px] font-medium">
                          Sermons
                        </b>
                        <span className="inline-flex animate-[cyc_8s_0.4s_infinite_both] items-center gap-1.5 rounded-full bg-accent/[0.14] px-[11px] py-[5px] text-[10.5px] font-semibold text-accent-soft">
                          {"✓"} Live on website
                        </span>
                      </div>
                      <div className="mt-3 flex animate-[cyc_8s_0.3s_infinite_both] items-center gap-2.5 rounded-xl border-[1.5px] border-accent/50 bg-accent/[0.10] p-2.5">
                        <span className="grid h-[38px] w-[54px] flex-none place-items-center rounded-lg bg-[#2a241d] text-[10px]">
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
                            <span className="text-[10.5px] text-paper/50">
                              {d}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
            {/* app — phone, same sermon live in the list */}
            <Reveal
              delay={0.65}
              className="absolute right-0 top-[100px] z-[3] w-[212px] max-[980px]:static"
            >
              <div className="animate-[bob_7s_1.2s_ease-in-out_infinite]">
                <div className="h-[320px] overflow-hidden [-webkit-mask-image:linear-gradient(to_bottom,#000_55%,transparent_97%)] [mask-image:linear-gradient(to_bottom,#000_55%,transparent_97%)]">
                  <PhoneFrame size="sm" screenClassName="h-[400px]">
                    <div className="h-[44px]" />
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
                            <span className="text-[9.5px] text-paper/50">
                              {d}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </PhoneFrame>
                </div>
              </div>
            </Reveal>
          </div>
        </GlowReveal>
      </div>
    </section>
  );
}
