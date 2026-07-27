import Image from "next/image";
import PhoneFrame from "@/app/(site)/components/PhoneFrame";
import CarouselTrack from "./CarouselTrack";

/* Marquee of engine moments mixed with church photos.
   Deck: member dashboard → lock-screen phone → targeted message →
   congregation pulse → app-peek phone, with photo slots between.

   Desktop drifts under an edge-fade mask. Mobile drops the mask, shrinks
   the deck so more of it fits, and becomes a real horizontal scroller you
   can throw — see CarouselTrack for how the drift and the fling share one
   position. The third deck below is mobile-only and its count is mirrored
   by COPIES there. */

/* Targeted-message choreography (14s loop): cursor selects the second
   segment, the match count jumps 64 → 108, cursor clicks Send, the
   button runs Sending… → Sent ✓, then everything resets. Cursor is
   anchored at the Send button; earlier stops are negative offsets. */
const TG_KEYFRAMES = `
@keyframes tgcur{
  0%,6%{opacity:0;transform:translate(-40px,-224px)}
  9%{opacity:1;transform:translate(-40px,-224px)}
  13%{transform:translate(-40px,-224px) scale(1)}
  14%{transform:translate(-40px,-224px) scale(.8)}
  16%{transform:translate(-40px,-224px) scale(1)}
  32%{transform:translate(0,0)}
  34%{transform:translate(0,0) scale(.8)}
  36%{transform:translate(0,0) scale(1)}
  40%{opacity:1;transform:translate(0,0)}
  46%,100%{opacity:0;transform:translate(0,0)}
}
@keyframes tgsel{
  0%,14%{background:rgba(187,74,35,0);color:#4c4538;box-shadow:inset 0 0 0 1.5px rgba(28,24,19,0.16)}
  16%,90%{background:#bb4a23;color:#fff;box-shadow:inset 0 0 0 1.5px rgba(187,74,35,0)}
  95%,100%{background:rgba(187,74,35,0);color:#4c4538;box-shadow:inset 0 0 0 1.5px rgba(28,24,19,0.16)}
}
@keyframes tgc1{0%,15%{opacity:1}17%,94%{opacity:0}98%,100%{opacity:1}}
@keyframes tgc2{0%,15%{opacity:0}17%,90%{opacity:1}95%,100%{opacity:0}}
@keyframes tgbtn{0%,33%{background:#bb4a23}35%{background:#8a3418}37%,100%{background:#bb4a23}}
@keyframes tgl1{0%,15%{opacity:1}17%,96%{opacity:0}100%{opacity:1}}
@keyframes tgl2{0%,15%{opacity:0}17%,35%{opacity:1}37%,100%{opacity:0}}
@keyframes tgl3{0%,36%{opacity:0}38%,48%{opacity:1}50%,100%{opacity:0}}
@keyframes tgl4{0%,49%{opacity:0}51%,92%{opacity:1}96%,100%{opacity:0}}
`;

function Cursor({ className = "" }: { className?: string }) {
  return (
    <span className={`pointer-events-none absolute z-[5] ${className}`}>
      <svg width="19" height="19" viewBox="0 0 24 24">
        <path
          d="M5 3l14 9-6 1.2-3.4 5.8L5 3z"
          fill="#f4f0e8"
          stroke="#1c1813"
          strokeWidth="1.4"
        />
      </svg>
    </span>
  );
}

function PhotoSlot({
  src,
  alt,
  width,
}: {
  src: string;
  alt: string;
  width: string;
}) {
  return (
    <div
      className={`relative h-[320px] flex-none overflow-hidden rounded-[26px] border border-paper/10 bg-[#1a1611] ${width}`}
    >
      <Image src={src} alt={alt} fill sizes="280px" className="object-cover" />
    </div>
  );
}

/* ——— 01: Sarah's member dashboard, lifted straight from the product ——— */
function NextStepCard() {
  return (
    <div className="flex h-[320px] w-[340px] flex-none flex-col overflow-hidden rounded-[26px] bg-card text-ink">
      <div className="flex items-center justify-between border-b border-ink/10 px-5 py-[11px]">
        <b className="font-serif text-[15px]">Grace Fellowship</b>
        <span className="inline-flex items-center gap-2 text-[12px] font-medium text-ink-soft">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-[9px] font-bold text-white">
            S
          </span>
          Sarah
        </span>
      </div>
      <div className="flex flex-1 flex-col px-5 pb-[18px] pt-3.5">
        <div className="font-serif text-[21px] tracking-[-0.01em]">
          Welcome back, Sarah.
        </div>
        <div className="mt-2.5 rounded-[14px] border-[1.5px] border-accent/60 bg-accent/[0.07] px-4 py-3 shadow-[0_14px_28px_-18px_rgba(187,74,35,0.55)]">
          <div className="flex items-center gap-2 font-mono text-[9px] tracking-[0.14em] text-accent">
            <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-accent" />
            YOUR NEXT STEP
          </div>
          <b className="mt-1.5 block font-serif text-[18px] font-medium leading-[1.15]">
            Join a Community Group
          </b>
          <span className="mt-2.5 inline-block rounded-full bg-accent px-3.5 py-[7px] text-[11.5px] font-semibold text-white">
            Find a group {"→"}
          </span>
        </div>
        <div className="mt-auto">
          <div className="flex items-center">
            {[0, 1].map((i) => (
              <span key={i} className="contents">
                <span className="grid h-4 w-4 flex-none place-items-center rounded-full bg-accent text-[9px] text-white">
                  {"✓"}
                </span>
                <span className="h-0.5 flex-1 bg-accent" />
              </span>
            ))}
            <span className="h-3.5 w-3.5 flex-none animate-pulse-dot rounded-full border-2 border-accent bg-card" />
            <span className="h-0.5 flex-1 bg-line" />
            <span className="h-3.5 w-3.5 flex-none rounded-full border-2 border-ink/20 bg-card" />
          </div>
          <div className="mt-1.5 flex justify-between font-mono text-[8px] tracking-[0.06em]">
            <span className="text-ink-soft">BAPTISM</span>
            <span className="text-ink-soft">MEMBERSHIP</span>
            <span className="text-accent">GROUP</span>
            <span className="text-muted">SERVE</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ——— 02: lock-screen pushes on a tilted phone ——— */
function LockScreenCard() {
  return (
    <div className="relative h-[320px] w-[290px] flex-none overflow-hidden rounded-[26px] border border-paper/10 bg-[#1c1813]">
      <div className="px-5 pt-5 font-mono text-[10px] tracking-[0.14em] text-muted">
        PUSH · TIMED BY THE ENGINE
      </div>
      <div className="absolute left-1/2 top-[54px] w-[236px] -translate-x-1/2 -rotate-2">
        <PhoneFrame size="sm" screenClassName="h-[400px]">
          <div className="h-[34px]" />
          <div className="text-center font-mono text-[8px] tracking-[0.14em] text-paper/45">
            SUNDAY · JULY 27
          </div>
          <div className="mt-0.5 text-center font-serif text-[40px] leading-none tracking-[-0.01em]">
            6:12
          </div>
          <div className="mt-3.5 flex flex-col gap-1.5 px-2.5">
            {[
              {
                title: "Your next step is ready",
                body: "6 serve teams have open spots near you.",
                time: "now",
                delay: "0.3s",
              },
              {
                title: "Your group meets Tuesday",
                body: "Luke 15 · Week 3 — guide is ready.",
                time: "2h",
                delay: "0.8s",
              },
            ].map((n) => (
              <div
                key={n.title}
                className="animate-[cyc_8s_infinite_both] rounded-[12px] border border-paper/[0.12] bg-[rgba(38,32,25,0.95)] px-3 py-2.5 shadow-[0_14px_28px_-14px_rgba(0,0,0,0.8)]"
                style={{ animationDelay: n.delay }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="grid h-[18px] w-[18px] place-items-center rounded-[5px] bg-accent text-[9px] text-white">
                    {"✝"}
                  </span>
                  <span className="text-[8.5px] font-semibold text-paper/70">
                    GRACE FELLOWSHIP
                  </span>
                  <span className="ml-auto text-[8.5px] text-paper/45">
                    {n.time}
                  </span>
                </div>
                <b className="mt-1 block text-[10.5px]">{n.title}</b>
                <span className="block text-[9.5px] leading-[1.4] text-paper/60">
                  {n.body}
                </span>
              </div>
            ))}
          </div>
        </PhoneFrame>
      </div>
    </div>
  );
}

/* ——— 03: targeted message — animated segment pick + send ——— */
function TargetedCard() {
  return (
    <div className="relative flex h-[320px] w-[320px] flex-none flex-col rounded-[26px] bg-card p-5 text-ink">
      <div className="font-mono text-[10px] tracking-[0.14em] text-accent">
        TARGETED MESSAGE
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <span className="inline-flex items-center rounded-full bg-accent px-3 py-[6px] text-[11.5px] font-semibold text-white">
          Not in a group
        </span>
        <span className="inline-flex items-center rounded-full px-3 py-[6px] text-[11.5px] font-semibold [animation:tgsel_14s_infinite_both]">
          Joined this year
        </span>
        <span className="inline-flex items-center rounded-full px-3 py-[6px] text-[11.5px] font-semibold text-ink-soft shadow-[inset_0_0_0_1.5px_rgba(28,24,19,0.16)]">
          Cambridge campus
        </span>
      </div>
      <div className="mt-2.5 grid text-[12.5px] font-semibold text-accent">
        <span className="col-start-1 row-start-1 flex items-center gap-2 [animation:tgc1_14s_infinite_both]">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-accent" />
          64 members match
        </span>
        <span className="col-start-1 row-start-1 flex items-center gap-2 [animation:tgc2_14s_infinite_both]">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-accent" />
          108 members match
        </span>
      </div>
      <div className="mt-2.5 rounded-2xl bg-[#2a241d] px-4 py-3 text-paper">
        <div className="flex items-center gap-2">
          <span className="grid h-5 w-5 place-items-center rounded-md bg-accent text-[10px] text-white">
            {"✝"}
          </span>
          <span className="text-[10.5px] font-semibold text-paper/80">
            GRACE FELLOWSHIP
          </span>
          <span className="ml-auto text-[10.5px] text-paper/50">now</span>
        </div>
        <b className="mt-1.5 block text-[13px]">
          Group Launch Night — Thursday
        </b>
        <span className="mt-0.5 block text-[12px] text-paper/65">
          Find your group before they fill up.
        </span>
      </div>
      <div className="mt-auto flex justify-end">
        <span className="grid rounded-full px-4 py-2 text-[12.5px] font-semibold text-white [animation:tgbtn_14s_infinite_both]">
          <span className="col-start-1 row-start-1 inline-flex items-center justify-center gap-1.5 whitespace-nowrap [animation:tgl1_14s_infinite_both]">
            Send to 64 {"→"}
          </span>
          <span className="col-start-1 row-start-1 inline-flex items-center justify-center gap-1.5 whitespace-nowrap [animation:tgl2_14s_infinite_both]">
            Send to 108 {"→"}
          </span>
          <span className="col-start-1 row-start-1 inline-flex items-center justify-center gap-1.5 whitespace-nowrap [animation:tgl3_14s_infinite_both]">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            Sending…
          </span>
          <span className="col-start-1 row-start-1 inline-flex items-center justify-center gap-1.5 whitespace-nowrap [animation:tgl4_14s_infinite_both]">
            Sent to 108 {"✓"}
          </span>
        </span>
      </div>
      <Cursor className="bottom-[24px] right-[48px] [animation:tgcur_14s_infinite_both]" />
    </div>
  );
}

/* ——— 04: live congregation pulse — big number + journey bars ——— */
const JOURNEY_BARS = [
  { label: "Newcomer", width: "w-full", opacity: "", delay: "0.1s", n: "212" },
  { label: "Baptized", width: "w-[71%]", opacity: "opacity-75", delay: "0.3s", n: "150" },
  { label: "In a Group", width: "w-[49%]", opacity: "opacity-55", delay: "0.5s", n: "104" },
  { label: "Serving", width: "w-[29%]", opacity: "opacity-40", delay: "0.7s", n: "62" },
];

function CongregationCard() {
  return (
    <div className="flex h-[320px] w-[300px] flex-none flex-col rounded-[26px] border border-paper/10 bg-[#1c1813] p-6 text-paper">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-[0.14em] text-muted">
          YOUR CONGREGATION
        </span>
        <span className="inline-flex items-center gap-1.5 font-mono text-[9px] tracking-[0.1em] text-accent-soft">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-accent" />
          LIVE
        </span>
      </div>
      <div className="mt-3 flex items-end gap-2.5">
        <span className="font-serif text-[68px] leading-[0.85] text-accent-soft">
          38
        </span>
        <span className="pb-0.5 text-[13px] font-semibold leading-[1.3] text-paper/75">
          next steps taken
          <br />
          this month
        </span>
      </div>
      <div className="mt-3 font-mono text-[9px] tracking-[0.1em] text-paper/45">
        542 MEMBERS · SYNCED FROM YOUR ChMS
      </div>
      <div className="mt-3.5 flex flex-1 flex-col justify-end gap-[10px] border-t border-paper/[0.08] pt-3.5">
        {JOURNEY_BARS.map((b) => (
          <div
            key={b.label}
            className="grid grid-cols-[76px_1fr_30px] items-center gap-2.5"
          >
            <span className="text-[12px] font-semibold">{b.label}</span>
            <span className="h-[19px] overflow-hidden rounded-[6px] bg-paper/[0.07]">
              <span
                className={`block h-full ${b.width} ${b.opacity} origin-left rounded-[6px] bg-accent animate-[barcyc_8s_cubic-bezier(0.2,0.8,0.2,1)_infinite_both]`}
                style={{ animationDelay: b.delay }}
              />
            </span>
            <span className="text-right font-mono text-[10px] text-paper/60">
              {b.n}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ——— 05: the app, peeking up from the card's bottom edge ——— */
function AppPeekCard() {
  return (
    <div className="relative h-[320px] w-[280px] flex-none overflow-hidden rounded-[26px] border border-paper/10 bg-[#1c1813]">
      <div className="px-5 pt-5 font-mono text-[10px] tracking-[0.14em] text-muted">
        CHURCH IN THEIR POCKET
      </div>
      <div className="absolute left-1/2 top-[58px] w-[216px] -translate-x-1/2 rotate-[3deg]">
        <PhoneFrame size="sm" screenClassName="h-[400px]">
          <div className="h-[36px]" />
          <div className="px-3.5">
            <div className="flex items-center justify-between">
              <div className="font-serif text-[17px]">Hi, Sarah.</div>
              <span className="rounded-full bg-accent/[0.16] px-2 py-[3px] font-mono text-[7px] tracking-[0.08em] text-accent-soft">
                CAMBRIDGE
              </span>
            </div>
            <div className="mt-2 rounded-[11px] border-[1.5px] border-accent/50 bg-accent/[0.13] px-3 py-2">
              <div className="flex items-center gap-1.5 font-mono text-[7.5px] tracking-[0.12em] text-accent-soft">
                <span className="h-1 w-1 animate-pulse-dot rounded-full bg-accent" />
                YOUR NEXT STEP
              </div>
              <b className="mt-1 block font-serif text-[13px] font-medium">
                Join a Community Group
              </b>
              <span className="mt-1.5 inline-block rounded-full bg-accent px-2.5 py-1 text-[9px] font-semibold text-white">
                Find a group {"→"}
              </span>
            </div>
            <div className="mt-2 rounded-[11px] border border-paper/10 bg-[#1e1913] px-2.5 py-2">
              <div className="font-mono text-[7px] tracking-[0.1em] text-paper/50">
                YOUR JOURNEY
              </div>
              <div className="mt-1.5 flex items-center">
                {[0, 1].map((i) => (
                  <span key={i} className="contents">
                    <span className="grid h-3 w-3 flex-none place-items-center rounded-full bg-accent text-[7px] text-white">
                      {"✓"}
                    </span>
                    <span className="h-[2px] flex-1 bg-accent" />
                  </span>
                ))}
                <span className="h-2.5 w-2.5 flex-none rounded-full border-2 border-accent" />
                <span className="h-[2px] flex-1 bg-paper/[0.13]" />
                <span className="h-2.5 w-2.5 flex-none rounded-full border-2 border-paper/20" />
              </div>
            </div>
          </div>
        </PhoneFrame>
      </div>
    </div>
  );
}

function Cards() {
  return (
    <div className="flex gap-[22px]">
      <PhotoSlot src="/worship.jpg" alt="Worship at a church service" width="w-[260px]" />
      <NextStepCard />
      <LockScreenCard />
      <PhotoSlot src="/community.JPG" alt="Church community together" width="w-[240px]" />
      <TargetedCard />
      <CongregationCard />
      <PhotoSlot src="/baptism.jpg" alt="A baptism" width="w-[260px]" />
      <AppPeekCard />
    </div>
  );
}

export default function Carousel() {
  return (
    <>
      <style>{TG_KEYFRAMES}</style>
      <CarouselTrack
        className="relative mt-[76px] overflow-x-hidden overflow-y-hidden pb-[88px] [-webkit-mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)] [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)] max-[920px]:mt-12 max-[920px]:overflow-x-auto max-[920px]:overscroll-x-contain max-[920px]:pb-14 max-[920px]:[-webkit-mask-image:none] max-[920px]:[mask-image:none] max-[920px]:[scrollbar-width:none] max-[920px]:[&::-webkit-scrollbar]:hidden"
        trackClassName="flex w-max animate-[marq_60s_linear_infinite] gap-[22px] hover:[animation-play-state:paused] max-[920px]:animate-none max-[920px]:[zoom:0.84]"
      >
        <Cards />
        <Cards />
        {/* the runway a thrown deck needs — mobile only */}
        <div className="hidden max-[920px]:contents">
          <Cards />
        </div>
      </CarouselTrack>
    </>
  );
}
