import { Glow, SectionHead } from "@/app/(site)/components/ui";
import FeatureRow from "@/app/(site)/components/FeatureRow";
import AccentBand from "@/app/(site)/components/AccentBand";
import PhoneFrame from "@/app/(site)/components/PhoneFrame";
import SectionReveal from "@/components/reveal-animations/SectionReveal";

/* ——— discipleship track phone + floating ChMS-sync card ——— */
function TrackVisual() {
  return (
    <div className="relative h-[620px] max-[980px]:flex max-[980px]:h-auto max-[980px]:justify-center max-[980px]:py-6">
      <Glow className="left-1/2 top-1/2 h-[680px] w-[720px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(closest-side,rgba(187,74,35,0.15),transparent_75%)]" />
      <div className="absolute left-[140px] top-2.5 w-[266px] animate-[bobr_7s_ease-in-out_infinite] max-[980px]:static">
        <PhoneFrame size="sm" screenClassName="h-[540px]">
          <div className="h-[50px]" />
          <div className="px-4">
            <div className="font-serif text-[21px]">Your journey</div>
            <div className="mt-3 flex flex-col gap-2">
              {[
                { label: "Baptism", sub: "Start here", delay: "0.2s" },
                { label: "Membership", sub: "4-week class", delay: "0.5s" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="flex animate-[cyc_9s_infinite_both] items-center gap-2.5 rounded-[13px] border border-paper/10 bg-[#1e1913] px-3 py-2.5"
                  style={{ animationDelay: s.delay }}
                >
                  <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-accent text-[10px] text-white">
                    {"✓"}
                  </span>
                  <div>
                    <b className="block text-[12.5px]">{s.label}</b>
                    <span className="text-[10px] text-paper/50">{s.sub}</span>
                  </div>
                </div>
              ))}
              <div className="flex animate-[cyc_9s_0.8s_infinite_both] items-center gap-2.5 rounded-[13px] border-[1.5px] border-accent/60 bg-accent/[0.13] px-3 py-3 shadow-[0_20px_40px_-20px_rgba(187,74,35,0.5)]">
                <span className="grid h-6 w-6 flex-none place-items-center rounded-full border-2 border-accent text-[10px] text-accent-soft">
                  3
                </span>
                <div>
                  <b className="block text-[13px]">Community</b>
                  <span className="text-[10px] text-accent-soft">
                    Tap to explore {"→"}
                  </span>
                </div>
              </div>
              <div className="flex animate-[cyc_9s_1.1s_infinite_both] items-center gap-2.5 rounded-[13px] border border-dashed border-paper/[0.18] px-3 py-2.5">
                <span className="grid h-6 w-6 flex-none place-items-center rounded-full border-2 border-paper/20 text-[10px] text-paper/45">
                  4
                </span>
                <div>
                  <b className="block text-[12.5px] text-paper/60">Serving</b>
                  <span className="text-[10px] text-paper/45">Up next</span>
                </div>
              </div>
            </div>
            <div className="mt-3.5 flex animate-[cyc_9s_1.5s_infinite_both] items-center gap-2 rounded-xl border border-paper/[0.09] bg-[#1e1913] px-3 py-2.5">
              <span className="h-[7px] w-[7px] flex-none animate-pulse-dot rounded-full bg-accent" />
              <span className="text-[10.5px] text-paper/70">
                <b className="text-paper">Community groups</b> — see what it is
                and jump in.
              </span>
            </div>
          </div>
        </PhoneFrame>
      </div>
      <div className="absolute left-[380px] top-[140px] z-[2] w-[250px] animate-[bob_7s_0.7s_ease-in-out_infinite] rounded-2xl border border-paper/[0.13] bg-[#1e1913] px-[18px] py-4 shadow-[0_50px_100px_-40px_rgba(0,0,0,0.95)] max-[980px]:hidden">
        <div className="font-mono text-[9px] tracking-[0.1em] text-paper/50">
          ALWAYS IN SYNC
        </div>
        <div className="mt-[11px] flex items-center gap-2.5">
          <span className="grid h-[34px] w-[34px] place-items-center rounded-[10px] bg-accent text-[11px] text-white">
            {"⇄"}
          </span>
          <div>
            <b className="block text-xs">Progress syncs</b>
            <span className="text-[10.5px] text-paper/55">
              Straight from your ChMS
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ——— sermon player phone + floating background-audio card ——— */
function SermonsVisual() {
  return (
    <div className="relative h-[620px] max-[980px]:flex max-[980px]:h-auto max-[980px]:justify-center max-[980px]:py-6">
      <Glow className="left-1/2 top-1/2 h-[680px] w-[720px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(closest-side,rgba(187,74,35,0.15),transparent_75%)]" />
      <div className="absolute left-[150px] top-2.5 w-[266px] animate-[bobr_7s_ease-in-out_infinite] max-[980px]:static">
        <PhoneFrame size="sm" screenClassName="h-[540px]">
          <div className="grid h-[190px] place-items-center bg-[linear-gradient(165deg,#241c14,#15120e)]">
            <span className="grid h-[46px] w-[46px] place-items-center rounded-full bg-accent/90 text-sm text-white shadow-[0_16px_40px_-10px_rgba(187,74,35,0.7)]">
              {"▶"}
            </span>
          </div>
          <div className="px-4 py-3.5">
            <div className="font-mono text-[8px] tracking-[0.12em] text-accent-soft">
              NOW PLAYING
            </div>
            <b className="mt-[5px] block font-serif text-base font-medium">
              From Scarcity to Surrender
            </b>
            <span className="text-[10.5px] text-paper/50">
              Pastor John · 42 min
            </span>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-paper/10">
              <span className="block h-full animate-[playbar_12s_linear_infinite_both] rounded-full bg-accent" />
            </div>
            <div className="mt-1.5 flex justify-between font-mono text-[8px] text-paper/45">
              <span>18:24</span>
              <span>42:10</span>
            </div>
            <div className="mt-2.5 flex items-center justify-center gap-[18px] text-[15px] text-paper/80">
              <span>{"⏮"}</span>
              <span className="grid h-[34px] w-[34px] place-items-center rounded-full bg-paper/10">
                {"⏸"}
              </span>
              <span>{"⏭"}</span>
            </div>
            <div className="mt-3.5 rounded-[11px] border border-paper/[0.09] bg-[#1e1913] px-3 py-2.5">
              <div className="font-mono text-[8px] tracking-[0.1em] text-paper/50">
                YOUR NOTES
              </div>
              <span className="mt-2 flex items-center">
                <span className="h-1 w-[64%] rounded-[3px] bg-paper/[0.18]" />
                <span className="ml-[3px] inline-block h-[11px] w-[2px] animate-blink bg-accent" />
              </span>
            </div>
          </div>
        </PhoneFrame>
      </div>
      <div className="absolute left-[390px] top-[120px] z-[2] w-[250px] animate-[bob_7s_0.7s_ease-in-out_infinite] rounded-2xl border border-paper/[0.13] bg-[#1e1913] px-[18px] py-4 shadow-[0_50px_100px_-40px_rgba(0,0,0,0.95)] max-[980px]:hidden">
        <div className="font-mono text-[9px] tracking-[0.1em] text-paper/50">
          BACKGROUND AUDIO
        </div>
        <div className="mt-[11px] flex items-center gap-2.5">
          <span className="grid h-[34px] w-[34px] place-items-center rounded-[10px] bg-accent text-[11px] text-white">
            {"♫"}
          </span>
          <div>
            <b className="block text-xs">Keeps playing</b>
            <span className="text-[10.5px] text-paper/55">
              Lock the phone, keep listening
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ——— groups map phone ——— */
function GroupsVisual() {
  return (
    <div className="relative h-[620px] max-[980px]:flex max-[980px]:h-auto max-[980px]:justify-center max-[980px]:py-6">
      <Glow className="left-1/2 top-1/2 h-[680px] w-[720px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(closest-side,rgba(187,74,35,0.15),transparent_75%)]" />
      <div className="absolute left-[120px] top-2.5 w-[266px] animate-[bobr2_7s_ease-in-out_infinite] max-[980px]:static">
        <PhoneFrame size="sm" screenClassName="h-[540px]">
          <div className="relative h-[250px] bg-[#221c15]">
            <span className="absolute left-[12%] top-[70%] h-[3px] w-[76%] -rotate-[24deg] bg-paper/[0.07]" />
            <span className="absolute left-[6%] top-[36%] h-[3px] w-[88%] rotate-12 bg-paper/[0.07]" />
            <span className="absolute left-[30%] top-[6%] h-[88%] w-[3px] rotate-[18deg] bg-paper/[0.07]" />
            <span className="absolute left-[36%] top-[34%] h-[13px] w-[13px] animate-pulse-dot rounded-full border-[2.5px] border-paper bg-accent" />
            <span className="absolute left-[60%] top-[56%] h-[13px] w-[13px] animate-[pulse-dot_2s_0.7s_infinite] rounded-full border-[2.5px] border-paper bg-accent" />
            <div className="absolute left-2.5 top-11 flex gap-1.5">
              <span className="rounded-full bg-accent px-2.5 py-[5px] text-[9.5px] font-semibold text-white">
                Tuesdays
              </span>
              <span className="rounded-full bg-[rgba(10,10,8,0.7)] px-2.5 py-[5px] text-[9.5px] font-semibold text-paper">
                Near me
              </span>
            </div>
          </div>
          <div className="px-3.5 py-[13px]">
            <div className="animate-[cyc_8s_0.3s_infinite_both] rounded-[13px] border border-paper/10 bg-[#1e1913] px-[13px] py-3">
              <div className="flex items-center justify-between">
                <b className="text-[12.5px]">Young Adults</b>
                <span className="text-[9.5px] font-semibold text-accent-soft">
                  3 seats
                </span>
              </div>
              <span className="text-[10.5px] text-paper/55">
                Tue · 7 PM · The Hendersons{"’"}
              </span>
              <div className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-accent-soft">
                {"🚇"} 14 min from you · Directions {"→"}
              </div>
            </div>
            <div className="mt-[9px] animate-[cyc_8s_0.6s_infinite_both] rounded-[13px] border border-paper/10 bg-[#1e1913] px-[13px] py-3">
              <div className="flex items-center justify-between">
                <b className="text-[12.5px]">Grad Students</b>
                <span className="text-[9.5px] font-semibold text-accent-soft">
                  5 seats
                </span>
              </div>
              <span className="text-[10.5px] text-paper/55">
                Tue · 7:30 PM · Central Sq
              </span>
              <div className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-accent-soft">
                {"🚶"} 8 min walk · Directions {"→"}
              </div>
            </div>
          </div>
        </PhoneFrame>
      </div>
    </div>
  );
}

/* ——— giving phone ——— */
function GivingVisual() {
  return (
    <div className="relative h-[620px] max-[980px]:flex max-[980px]:h-auto max-[980px]:justify-center max-[980px]:py-6">
      <Glow className="left-1/2 top-1/2 h-[680px] w-[720px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(closest-side,rgba(187,74,35,0.15),transparent_75%)]" />
      <div className="absolute left-[220px] top-2.5 w-[266px] animate-[bobr_7s_0.4s_ease-in-out_infinite] max-[980px]:static">
        <PhoneFrame size="sm" screenClassName="h-[540px]">
          <div className="h-[50px]" />
          <div className="px-4">
            <div className="font-serif text-[21px]">Give</div>
            <div className="mt-3">
              <div className="font-mono text-[8px] tracking-[0.1em] text-paper/50">
                FUND
              </div>
              <div className="mt-[5px] flex items-center justify-between rounded-[10px] border border-paper/[0.13] bg-[#231d16] px-3 py-2.5 text-xs font-semibold">
                General · Cambridge{" "}
                <span className="text-accent-soft">{"✓"}</span>
              </div>
            </div>
            <div className="mt-2.5">
              <div className="font-mono text-[8px] tracking-[0.1em] text-paper/50">
                AMOUNT
              </div>
              <div className="mt-[5px] flex items-center justify-between rounded-[10px] border border-paper/[0.13] bg-[#231d16] px-3 py-2.5 text-xs font-semibold">
                $100 <span className="text-accent-soft">{"✓"}</span>
              </div>
            </div>
            <div className="mt-[11px] flex gap-1.5">
              <span className="rounded-full bg-paper/10 px-[11px] py-1.5 text-[10px] font-semibold">
                $50
              </span>
              <span className="rounded-full bg-accent px-[11px] py-1.5 text-[10px] font-semibold text-white">
                $100
              </span>
              <span className="rounded-full bg-paper/10 px-[11px] py-1.5 text-[10px] font-semibold">
                $250
              </span>
            </div>
            <div className="relative mt-4">
              <span className="grid animate-[clickfill_14s_infinite_both] place-items-center rounded-[11px] bg-accent p-3 text-[13px] font-semibold text-white">
                Give $100
              </span>
              <span className="absolute left-[58%] top-[55%] z-[3] animate-[cur2_14s_infinite_both]">
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path
                    d="M5 3l14 9-6 1.2-3.4 5.8L5 3z"
                    fill="#f4f0e8"
                    stroke="#161310"
                    strokeWidth="1.4"
                  />
                </svg>
              </span>
            </div>
            <div className="mt-[13px] flex items-center gap-1.5 font-mono text-[8.5px] text-paper/45">
              {"→"} Hands off to your platform, prefilled
            </div>
          </div>
        </PhoneFrame>
      </div>
    </div>
  );
}

/* ——— class page phone + floating sign-up card ——— */
function ClassVisual() {
  const items = [
    { icon: "▶", label: "Week 1 · Video", delay: "0.2s" },
    { icon: "🎙", label: "Podcast series", delay: "0.45s" },
    { icon: "📄", label: "Study guide", delay: "0.7s" },
  ];
  return (
    <div className="relative h-[620px] max-[980px]:flex max-[980px]:h-auto max-[980px]:justify-center max-[980px]:py-6">
      <Glow className="left-1/2 top-1/2 h-[680px] w-[720px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(closest-side,rgba(187,74,35,0.15),transparent_75%)]" />
      <div className="absolute left-[160px] top-2.5 w-[266px] animate-[bobr2_7s_0.3s_ease-in-out_infinite] max-[980px]:static">
        <PhoneFrame size="sm" screenClassName="h-[540px]">
          <div className="bg-[linear-gradient(165deg,#241c14,#161310)] px-4 pb-5 pt-[54px]">
            <span className="font-mono text-[8px] tracking-[0.12em] text-accent-soft">
              A CLASS AT GRACE
            </span>
            <div className="mt-1.5 font-serif text-[22px] tracking-[-0.015em]">
              Establishing Foundations
            </div>
            <span className="mt-3 inline-block animate-[cyc_8s_1.2s_infinite_both] rounded-full bg-accent px-3.5 py-2 text-[10.5px] font-semibold text-white">
              Sign up for the next session {"→"}
            </span>
          </div>
          <div className="px-4 pt-4">
            <div className="font-mono text-[8px] tracking-[0.12em] text-paper/50">
              EVERYTHING IN ONE PLACE
            </div>
            <div className="mt-2.5 flex flex-col gap-2">
              {items.map((it) => (
                <div
                  key={it.label}
                  className="flex animate-[cyc_8s_infinite_both] items-center gap-2.5 rounded-[11px] border border-paper/[0.09] p-2"
                  style={{ animationDelay: it.delay }}
                >
                  <span className="grid h-[30px] w-[30px] flex-none place-items-center rounded-lg bg-[#2a241d] text-[11px]">
                    {it.icon}
                  </span>
                  <b className="text-[11px]">{it.label}</b>
                </div>
              ))}
            </div>
          </div>
        </PhoneFrame>
      </div>
      <div className="absolute left-[400px] top-[110px] z-[2] w-[250px] animate-[bob_7s_0.5s_ease-in-out_infinite] rounded-2xl border border-paper/[0.13] bg-[#1e1913] px-[18px] py-4 shadow-[0_50px_100px_-40px_rgba(0,0,0,0.95)] max-[980px]:hidden">
        <div className="font-mono text-[9px] tracking-[0.1em] text-paper/50">
          SIGN-UPS
        </div>
        <div className="mt-[11px] flex items-center gap-2.5">
          <span className="grid h-[34px] w-[34px] place-items-center rounded-[10px] bg-accent text-[11px] text-white">
            {"📅"}
          </span>
          <div>
            <b className="block text-xs">Next session · Sep 14</b>
            <span className="text-[10.5px] text-paper/55">
              One tap to register
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Features() {
  return (
    <section className="relative pt-[150px] max-[920px]:pt-24">
      <Glow className="left-1/2 top-[-120px] h-[560px] w-[1000px] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(187,74,35,0.2),rgba(187,74,35,0.05)_55%,transparent_78%)]" />
      <SectionReveal>
        <SectionHead
          animate
          className="px-6"
          kicker="03 // The custom build"
          title="An Apple like experience"
          titleEm="built for your church"
          titleEmMarker
        />
      </SectionReveal>
      <FeatureRow
        reveal
        num="01"
        className="mt-24 max-[980px]:mt-14"
        side="left"
        tag="FEATURE — DISCIPLESHIP"
        title={"Interactive\nDiscipleship Track"}
        desc="Your pathway, made tappable. People see each step at a glance and can jump into any one at any point."
        visual={<TrackVisual />}
      />
      <FeatureRow
        reveal
        num="02"
        className="mt-[120px] max-[980px]:mt-16"
        side="right"
        tag="FEATURE — SERMONS"
        title={"Custom Sermon\nExperience"}
        desc="An immersive mobile player — take notes, play audio or video, and keep listening in the background."
        visual={<SermonsVisual />}
      />
      <FeatureRow
        reveal
        num="03"
        className="mt-[120px] max-[980px]:mt-16"
        side="left"
        tag="FEATURE — GROUPS"
        title={"Custom Small\nGroups Finder"}
        desc="Filter by type, day, or topic, preview each group on the map — with directions and commute times right in the app."
        visual={<GroupsVisual />}
      />
      <FeatureRow
        reveal
        num="04"
        className="mt-[120px] max-[980px]:mt-16"
        side="right"
        tag="FEATURE — GIVING"
        title={"Built-In\nCustom Giving"}
        desc="A giving form built into the app, linked straight to your platform — info already filled in, one tap to give."
        visual={<GivingVisual />}
      />
      <FeatureRow
        reveal
        num="05"
        className="mt-[120px] max-[980px]:mt-16"
        side="left"
        tag="FEATURE — CLASSES"
        title={"Custom\nClass Pages"}
        desc="A complete home for each class — videos, podcasts, and everything you teach, with a direct link to sign up."
        visual={<ClassVisual />}
      />
      <AccentBand
        tag={<>✦ FEATURE — WHATEVER YOU DREAM OF</>}
        title={"If it doesn’t exist yet,\nwe build it."}
        sub="A screen or tool your church needs that isn’t on this list? Make a list and bring it to our call."
      />
    </section>
  );
}
