import { TrafficLights } from "@/components/ui";
import { Glow, SectionHead } from "@/app/(site)/components/ui";
import SectionReveal from "@/components/reveal-animations/SectionReveal";
import GlowReveal from "@/components/reveal-animations/GlowReveal";

/* Browser window that types the email, clicks Sign in, and crossfades
   from the login form to Sarah's personalized dashboard (14s loop). */
export default function LoginDemo() {
  return (
    <section className="relative overflow-hidden px-6 pb-[30px] pt-[130px] text-center max-[920px]:pt-20">
      <Glow className="left-1/2 top-5 h-[700px] w-[1150px] -translate-x-1/2" />
      <div className="relative">
        <SectionReveal>
          <SectionHead
            animate
            kicker="01 // The login"
            title={"They sign in.\nIt becomes theirs."}
            sub="The site knows their campus, their group, their giving — and their exact next step. Not a homepage. A tool built for them."
            titleClassName="text-[clamp(36px,4.8vw,60px)]"
          />
        </SectionReveal>
        <GlowReveal
          delay={0.15}
          className="group relative mx-auto mt-16 w-[min(960px,100%)]"
          glow={
            /* Same construction as the home page visuals: a blurred
               rounded outline on its own layer, fading out before the
               masked frame goes transparent. */
            <div
              aria-hidden
              className="pointer-events-none absolute -left-28 -right-28 -top-24 bottom-0 opacity-85 transition-opacity duration-500 [-webkit-mask-image:linear-gradient(to_bottom,#000_58%,transparent_93%)] [-webkit-mask-repeat:no-repeat] [mask-image:linear-gradient(to_bottom,#000_58%,transparent_93%)] [mask-repeat:no-repeat] group-hover:opacity-100"
            >
              <div className="absolute inset-x-28 -bottom-72 top-24 rounded-[44px] border-[30px] border-accent blur-[26px]" />
            </div>
          }
        >
          <div className="relative rounded-[30px] border border-paper/15 bg-paper/[0.03] p-3 transition-colors duration-500 [-webkit-mask-image:linear-gradient(to_bottom,#000_52%,transparent_98%)] [mask-image:linear-gradient(to_bottom,#000_52%,transparent_98%)] group-hover:border-paper/25">
          <div className="overflow-hidden rounded-[22px] border border-paper/10 bg-[#1a1611] text-left text-paper">
            <div className="flex items-center gap-1.5 border-b border-paper/[0.09] px-[18px] py-[13px] font-mono text-[11px] text-paper/50">
              <TrafficLights small />
              <span className="ml-2">gracechurch.org/me</span>
            </div>
            <div className="relative h-[580px]">
              {/* screen A — login form */}
              <div className="absolute inset-0 grid animate-[scrA_14s_infinite_both] place-items-center">
                <div className="w-[340px] max-w-[86%]">
                  <span className="mx-auto grid h-[46px] w-[46px] place-items-center rounded-[13px] bg-accent text-[21px] text-white">
                    {"✝"}
                  </span>
                  <div className="mt-[18px] text-center font-serif text-[27px] tracking-[-0.01em]">
                    Welcome back.
                  </div>
                  <div className="mt-1.5 text-center text-sm text-paper/50">
                    Sign in to see your next step.
                  </div>
                  <div className="mt-6 font-mono text-[9px] tracking-[0.12em] text-paper/50">
                    EMAIL
                  </div>
                  <div className="mt-1.5 rounded-[10px] border border-paper/[0.14] bg-[#231d16] px-3.5 py-3 font-mono text-[13.5px]">
                    <span className="inline-block animate-[typeE_14s_infinite_both] overflow-hidden whitespace-nowrap align-bottom">
                      sarah.m@gmail.com
                    </span>
                    <span className="inline-block h-[15px] w-[2px] animate-blink bg-accent align-bottom" />
                  </div>
                  <div className="mt-3.5 font-mono text-[9px] tracking-[0.12em] text-paper/50">
                    PASSWORD
                  </div>
                  <div className="mt-1.5 rounded-[10px] border border-paper/[0.14] bg-[#231d16] px-3.5 py-3 text-[13.5px] tracking-[3px] text-paper/65">
                    ••••••••
                  </div>
                  <div className="relative mt-5">
                    <span className="grid animate-[clickfill_14s_infinite_both] place-items-center rounded-[11px] bg-accent p-[13px] text-[15px] font-semibold text-white">
                      Sign in
                    </span>
                    <span className="absolute left-[58%] top-[55%] z-[3] animate-[cur2_14s_infinite_both]">
                      <svg width="19" height="19" viewBox="0 0 24 24">
                        <path
                          d="M5 3l14 9-6 1.2-3.4 5.8L5 3z"
                          fill="#f4f0e8"
                          stroke="#1a1611"
                          strokeWidth="1.4"
                        />
                      </svg>
                    </span>
                  </div>
                </div>
              </div>
              {/* screen B — Sarah's dashboard */}
              <div className="absolute inset-0 animate-[scrB_14s_infinite_both]">
                <div className="flex items-center justify-between border-b border-paper/[0.09] px-[30px] py-3.5 max-[720px]:px-4">
                  <span className="inline-flex items-center gap-3">
                    <b className="font-serif text-[17px]">Grace Fellowship</b>
                    <span className="rounded-full bg-accent/[0.16] px-2.5 py-1 font-mono text-[9px] tracking-[0.1em] text-accent-soft max-[720px]:hidden">
                      CAMBRIDGE CAMPUS
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-2 text-[13px] text-paper/65">
                    <span className="grid h-[26px] w-[26px] place-items-center rounded-full bg-[#3a332a] text-[10px] font-bold text-paper">
                      S
                    </span>
                    Sarah
                  </span>
                </div>
                <div className="px-[34px] py-[26px] max-[720px]:px-4">
                  <div className="font-serif text-[30px] tracking-[-0.015em]">
                    Welcome back, Sarah.
                  </div>
                  <div className="mt-5 grid grid-cols-[1.15fr_0.85fr] gap-4 max-[720px]:grid-cols-1">
                    <div>
                      <div className="rounded-2xl border-[1.5px] border-accent/55 bg-accent/[0.13] px-[22px] py-[18px] shadow-[0_18px_34px_-22px_rgba(187,74,35,0.5)]">
                        <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-accent-soft">
                          <span className="h-[7px] w-[7px] animate-pulse-dot rounded-full bg-accent" />
                          YOUR NEXT STEP
                        </div>
                        <div className="mt-[9px] flex items-center justify-between gap-3.5">
                          <b className="font-serif text-[23px] font-medium">
                            Join a Serve Team
                          </b>
                          <span className="flex-none rounded-full bg-accent px-[17px] py-2.5 text-[13px] font-semibold text-white">
                            Explore teams {"→"}
                          </span>
                        </div>
                      </div>
                      <div className="mt-[22px] flex items-center">
                        {[0, 1, 2].map((i) => (
                          <span key={i} className="contents">
                            <span className="grid h-[19px] w-[19px] flex-none place-items-center rounded-full bg-accent text-[10px] text-white">
                              {"✓"}
                            </span>
                            <span className="h-0.5 flex-1 bg-accent" />
                          </span>
                        ))}
                        <span className="h-[17px] w-[17px] flex-none rounded-full border-2 border-accent" />
                      </div>
                      <div className="mt-2 flex justify-between font-mono text-[9.5px] tracking-[0.06em]">
                        <span className="text-paper/65">BAPTISM</span>
                        <span className="text-paper/65">MEMBERSHIP</span>
                        <span className="text-paper/65">GROUP</span>
                        <span className="text-accent-soft">SERVE</span>
                      </div>
                      <div className="mt-5 flex items-center gap-2.5 rounded-[14px] border border-paper/[0.09] bg-[#1e1913] px-4 py-[13px]">
                        <span className="grid h-[34px] w-[34px] place-items-center rounded-full bg-accent text-[10px] text-white">
                          {"▶"}
                        </span>
                        <div>
                          <b className="block text-[13.5px]">
                            From Scarcity to Surrender
                          </b>
                          <span className="text-[11.5px] text-paper/50">
                            Sunday{"’"}s sermon · Cambridge
                          </span>
                        </div>
                        <span className="ml-auto text-xs font-semibold text-accent-soft">
                          Watch {"→"}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3.5">
                      <div className="rounded-[14px] border border-paper/10 bg-[#1e1913] px-[17px] py-3.5">
                        <div className="font-mono text-[9px] tracking-[0.12em] text-paper/50">
                          YOUR GROUP
                        </div>
                        <b className="mt-1.5 block text-[14.5px]">
                          Young Adults · Cambridge
                        </b>
                        <span className="mt-0.5 block text-xs text-paper/55">
                          Tuesdays · 7:00 PM
                        </span>
                        <span className="mt-[9px] inline-block text-xs font-semibold text-accent-soft">
                          Message the group {"→"}
                        </span>
                      </div>
                      <div className="rounded-[14px] border border-paper/10 bg-[#1e1913] px-[17px] py-3.5">
                        <div className="font-mono text-[9px] tracking-[0.12em] text-paper/50">
                          YOUR GIVING
                        </div>
                        <b className="mt-1.5 block font-serif text-[21px] font-medium">
                          $250{" "}
                          <span className="font-sans text-xs font-semibold text-paper/55">
                            in July
                          </span>
                        </b>
                        <span className="mt-2 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-accent-soft">
                          {"✓"} Recurring on the 1st
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </GlowReveal>
      </div>
    </section>
  );
}
