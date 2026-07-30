import { Glow, SectionHead } from "@/app/(site)/components/ui";
import PhoneFrame from "@/app/(site)/components/PhoneFrame";
import SectionReveal from "@/components/reveal-animations/SectionReveal";
import GlowReveal from "@/components/reveal-animations/GlowReveal";

/* Phone that types the email, clicks Sign in, and crossfades from the
   login screen to Sarah's personalized home screen (14s loop). */
export default function LoginDemo() {
  return (
    <section className="relative overflow-hidden px-6 pb-[30px] pt-[130px] text-center max-[920px]:pt-20">
      <Glow className="left-1/2 top-[60px] h-[700px] w-[1000px] -translate-x-1/2" />
      <div className="relative">
        <SectionReveal>
          <SectionHead
            animate
            kicker="01 // The login"
            title={"Same engine.\nCloser than ever."}
            sub="They sign in once — and the app knows their campus, their group, their giving, and their exact next step. All a thumb away."
            titleClassName="text-[clamp(36px,4.8vw,60px)]"
          />
        </SectionReveal>
        <GlowReveal
          delay={0.15}
          glowDuration={1.5}
          glowDelay={0.1}
          className="relative mx-auto mt-[60px] w-[330px] max-w-full"
          glow={
            /* Same phone-hugging halo as the home page engine demo, but sized
               closer to the phone's edges (and peeking just past the top) so
               more of the bloom escapes around it. */
            <div
              aria-hidden
              className="pointer-events-none absolute -left-28 -right-28 -top-24 bottom-0 opacity-85 [-webkit-mask-image:linear-gradient(to_bottom,#000_58%,transparent_93%)] [-webkit-mask-repeat:no-repeat] [mask-image:linear-gradient(to_bottom,#000_58%,transparent_93%)] [mask-repeat:no-repeat]"
            >
              <div className="absolute -bottom-72 left-1/2 top-[80px] w-[308px] -translate-x-1/2 rounded-[42px] border-[22px] border-accent blur-[22px]" />
            </div>
          }
        >
          <div className="[-webkit-mask-image:linear-gradient(to_bottom,#000_58%,transparent_98%)] [mask-image:linear-gradient(to_bottom,#000_58%,transparent_98%)]">
          <PhoneFrame size="lg" screenClassName="h-[620px] text-left">
            {/* screen A — login */}
            <div className="absolute inset-0 grid animate-[scrA_14s_infinite_both] place-items-center">
              <div className="w-[240px]">
                <span className="mx-auto grid h-[46px] w-[46px] place-items-center rounded-[13px] bg-accent text-[21px] text-white">
                  {"✝"}
                </span>
                <div className="mt-4 text-center font-serif text-2xl tracking-[-0.01em]">
                  Welcome back.
                </div>
                <div className="mt-5 font-mono text-[9px] tracking-[0.12em] text-paper/50">
                  EMAIL
                </div>
                <div className="mt-1.5 rounded-[10px] border border-paper/[0.14] bg-[#231d16] px-3 py-[11px] font-mono text-[11.5px]">
                  <span className="inline-block animate-[typeE_14s_infinite_both] overflow-hidden whitespace-nowrap align-bottom">
                    sarah.m@gmail.com
                  </span>
                  <span className="inline-block h-[13px] w-[2px] animate-blink bg-accent align-bottom" />
                </div>
                <div className="mt-3 font-mono text-[9px] tracking-[0.12em] text-paper/50">
                  PASSWORD
                </div>
                <div className="mt-1.5 rounded-[10px] border border-paper/[0.14] bg-[#231d16] px-3 py-[11px] text-xs tracking-[3px] text-paper/65">
                  ••••••••
                </div>
                <div className="relative mt-[18px]">
                  <span className="grid animate-[clickfill_14s_infinite_both] place-items-center rounded-[11px] bg-accent p-3 text-sm font-semibold text-white">
                    Sign in
                  </span>
                  <span className="absolute left-[58%] top-[55%] z-[3] animate-[cur2_14s_infinite_both]">
                    <svg width="19" height="19" viewBox="0 0 24 24">
                      <path
                        d="M5 3l14 9-6 1.2-3.4 5.8L5 3z"
                        fill="#f4f0e8"
                        stroke="#161310"
                        strokeWidth="1.4"
                      />
                    </svg>
                  </span>
                </div>
                <div className="mt-4 text-center text-[11px] text-paper/45">
                  Face ID enabled
                </div>
              </div>
            </div>
            {/* screen B — Sarah's home */}
            <div className="absolute inset-0 animate-[scrB_14s_infinite_both]">
              <div className="h-[54px]" />
              <div className="px-[18px]">
                <div className="flex items-center justify-between">
                  <div className="font-serif text-[23px]">Hi, Sarah.</div>
                  <span className="rounded-full bg-accent/[0.16] px-[9px] py-1 font-mono text-[8px] tracking-[0.08em] text-accent-soft">
                    CAMBRIDGE
                  </span>
                </div>
                <div className="mt-3.5 rounded-[14px] border-[1.5px] border-accent/55 bg-accent/[0.13] px-[15px] py-3.5 shadow-[0_18px_34px_-22px_rgba(187,74,35,0.5)]">
                  <div className="flex items-center gap-[7px] font-mono text-[8.5px] tracking-[0.12em] text-accent-soft">
                    <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-accent" />
                    YOUR NEXT STEP
                  </div>
                  <b className="mt-[5px] block font-serif text-[17px] font-medium">
                    Join a Serve Team
                  </b>
                  <span className="mt-[9px] inline-block rounded-full bg-accent px-3 py-[7px] text-[10.5px] font-semibold text-white">
                    Explore teams {"→"}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-[9px]">
                  <div className="rounded-xl border border-paper/10 bg-[#1e1913] px-3 py-[11px]">
                    <div className="font-mono text-[8px] tracking-[0.1em] text-paper/50">
                      YOUR GROUP
                    </div>
                    <b className="mt-1 block text-[11.5px]">Young Adults</b>
                    <span className="text-[9.5px] text-paper/55">
                      Tue · 7 PM
                    </span>
                  </div>
                  <div className="rounded-xl border border-paper/10 bg-[#1e1913] px-3 py-[11px]">
                    <div className="font-mono text-[8px] tracking-[0.1em] text-paper/50">
                      YOUR GIVING
                    </div>
                    <b className="mt-1 block text-[11.5px]">$250 · July</b>
                    <span className="text-[9.5px] text-accent-soft">
                      {"✓"} Recurring
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-[9px] rounded-xl border border-paper/10 bg-[#1e1913] px-3 py-[11px]">
                  <span className="grid h-[30px] w-[30px] place-items-center rounded-full bg-accent text-[9px] text-white">
                    {"▶"}
                  </span>
                  <div>
                    <b className="block text-[11px]">
                      From Scarcity to Surrender
                    </b>
                    <span className="text-[9.5px] text-paper/50">
                      Sunday · Cambridge
                    </span>
                  </div>
                </div>
              </div>
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-around border-t border-paper/[0.09] bg-night px-1.5 pb-[18px] pt-3">
                <span className="flex flex-col items-center gap-[3px] text-[9px] font-bold text-accent-soft">
                  <span className="h-[5px] w-[5px] rounded-full bg-accent" />
                  Home
                </span>
                {["Sermons", "Groups", "Give"].map((t) => (
                  <span
                    key={t}
                    className="flex flex-col items-center gap-[3px] text-[9px] font-semibold text-paper/45"
                  >
                    <span className="h-[5px] w-[5px] rounded-full bg-paper/20" />
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </PhoneFrame>
          </div>
        </GlowReveal>
      </div>
    </section>
  );
}
