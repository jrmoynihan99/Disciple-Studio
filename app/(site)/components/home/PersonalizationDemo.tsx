"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Monitor, Smartphone } from "lucide-react";
import { TrafficLights } from "@/components/ui";
import PhoneFrame from "@/app/(site)/components/PhoneFrame";
import GlowReveal from "@/components/reveal-animations/GlowReveal";
import Reveal from "@/components/reveal-animations/Reveal";

/* The engine demo: Sarah signs in and the site rearranges around her.
   Two devices (website / app) run the same 14s loop side by side, so
   toggling between them lands on the same beat of the story.

   Its own pz* keyframes rather than the shared scrA/scrB pair — the
   sign-in here is roughly twice as fast (typed by 15%, clicked by 21%,
   dashboard by 28%) which leaves ~9s on the personalized screen. */
const KEYFRAMES = `
@keyframes pzType{0%,3%{width:0}15%{width:17ch}100%{width:17ch}}
@keyframes pzCur{
  0%,8%{opacity:0;transform:translate(150px,110px)}
  12%{opacity:1;transform:translate(150px,110px)}
  19%{transform:translate(0,0)}
  21%{transform:translate(0,0) scale(.82)}
  23%{transform:translate(0,0) scale(1)}
  27%,100%{opacity:0}
}
@keyframes pzCurP{
  0%,8%{opacity:0;transform:translate(88px,96px)}
  12%{opacity:1;transform:translate(88px,96px)}
  19%{transform:translate(0,0)}
  21%{transform:translate(0,0) scale(.82)}
  23%{transform:translate(0,0) scale(1)}
  27%,100%{opacity:0}
}
@keyframes pzClick{0%,20%{background:#bb4a23}22%{background:#8a3418}26%,100%{background:#bb4a23}}
@keyframes pzA{0%,21%{opacity:1}26%,94%{opacity:0}99%,100%{opacity:1}}
@keyframes pzB{0%,22%{opacity:0;transform:translateY(14px)}28%{opacity:1;transform:none}94%{opacity:1;transform:none}99%,100%{opacity:0}}
/* the last leg of the journey fills in once the dashboard lands */
@keyframes pzFill{0%,32%{transform:scaleX(0)}46%,100%{transform:scaleX(1)}}
@keyframes pzSoft{0%,100%{opacity:1}50%{opacity:.45}}
/* the targeted message arrives a few seconds after she's signed in */
@keyframes pzToast{0%,40%{opacity:0;transform:translateY(-14px) scale(.97)}47%{opacity:1;transform:none}92%{opacity:1;transform:none}97%,100%{opacity:0;transform:translateY(-8px)}}
/* the phone banner dismisses itself — it sits over her greeting, and a
   push that never goes away isn't what a push does */
@keyframes pzBanner{0%,40%{opacity:0;transform:translateY(-76px)}47%{opacity:1;transform:none}64%{opacity:1;transform:none}70%,100%{opacity:0;transform:translateY(-76px)}}
`;

/* ——— what the engine knows about Sarah ——— */
const JOURNEY = ["BAPTISM", "MEMBERSHIP", "GROUP", "SERVE"];

/* Three on the website; the phone takes the first two side by side and
   gives the campus its own row. */
const STATS = [
  { label: "YOUR GROUP", value: "Young Adults", sub: "Tuesdays · 7 PM" },
  {
    label: "YOUR GIVING",
    value: "$250 · July",
    sub: "✓ Recurring",
    accent: true,
  },
  { label: "YOUR CAMPUS", value: "Cambridge", sub: "Sundays · 9 & 11 AM" },
];

/* The targeted message — it arrives mid-loop rather than sitting in the
   page, so it reads as sent to her, not published to everyone. */
const MESSAGE = {
  title: "Serve Day — Saturday, 9 AM",
  body: "The food pantry needs four more hands.",
};

function Cursor({ className = "" }: { className?: string }) {
  return (
    <span className={`pointer-events-none absolute z-[5] ${className}`}>
      <svg width="19" height="19" viewBox="0 0 24 24">
        <path
          d="M5 3l14 9-6 1.2-3.4 5.8L5 3z"
          fill="#f4f0e8"
          stroke="#1a1611"
          strokeWidth="1.4"
        />
      </svg>
    </span>
  );
}

/* ————————————————— website ————————————————— */

function WebLogin() {
  return (
    <div className="absolute inset-0 grid place-items-center [animation:pzA_14s_infinite_both]">
      {/* lifted off centre so the Sign in button clears the bottom fade */}
      <div className="w-[340px] max-w-[86%] -translate-y-7">
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
        <div className="mt-1.5 rounded-[10px] border border-paper/15 bg-[#231d16] px-3.5 py-3 font-mono text-[13.5px]">
          <span className="inline-block overflow-hidden whitespace-nowrap align-bottom [animation:pzType_14s_infinite_both]">
            sarah.m@gmail.com
          </span>
          <span className="inline-block h-[15px] w-[2px] animate-blink bg-accent align-bottom" />
        </div>
        <div className="mt-3.5 font-mono text-[9px] tracking-[0.12em] text-paper/50">
          PASSWORD
        </div>
        <div className="mt-1.5 rounded-[10px] border border-paper/15 bg-[#231d16] px-3.5 py-3 text-[13.5px] tracking-[3px] text-paper/65">
          ••••••••
        </div>
        <div className="relative mt-5">
          <span className="grid place-items-center rounded-[11px] bg-accent p-[13px] text-[15px] font-semibold text-white [animation:pzClick_14s_infinite_both]">
            Sign in
          </span>
          <Cursor className="left-[58%] top-[55%] [animation:pzCur_14s_infinite_both]" />
        </div>
      </div>
    </div>
  );
}

function WebDash() {
  return (
    <div className="absolute inset-0 [animation:pzB_14s_infinite_both]">
      <div className="flex items-center justify-between border-b border-paper/10 px-[30px] py-[15px] max-[720px]:px-4">
        <b className="font-serif text-[17px]">Grace Fellowship</b>
        <span className="inline-flex items-center gap-2 text-[13px] text-paper/65">
          <span className="grid h-[26px] w-[26px] place-items-center rounded-full bg-[#3a332a] text-[10px] font-bold text-paper">
            S
          </span>
          Sarah
        </span>
      </div>
      <div className="px-10 pb-6 pt-[26px] max-[720px]:px-4">
        <div className="font-serif text-[32px] tracking-[-0.015em]">
          Welcome back, Sarah.
        </div>

        <div className="mt-[18px] rounded-2xl border-[1.5px] border-accent/55 bg-accent/[0.13] px-6 py-5 shadow-[0_18px_34px_-22px_rgba(187,74,35,0.5)]">
          <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-accent-soft">
            <span className="h-[7px] w-[7px] animate-pulse-dot rounded-full bg-accent" />
            YOUR NEXT STEP
          </div>
          <div className="mt-[9px] flex items-center justify-between gap-3.5">
            <b className="font-serif text-[25px] font-medium">Serve on a team</b>
            <span className="flex-none rounded-full bg-accent px-[19px] py-[11px] text-[13.5px] font-semibold text-white">
              Explore teams {"→"}
            </span>
          </div>
        </div>

        {/* her journey — three steps behind her, the fourth filling in */}
        <div className="mt-[22px] flex items-center">
          {[0, 1, 2].map((i) => (
            <span key={i} className="contents">
              <span className="grid h-5 w-5 flex-none place-items-center rounded-full bg-accent text-[11px] text-white">
                {"✓"}
              </span>
              {i < 2 ? (
                <span className="h-0.5 flex-1 bg-accent" />
              ) : (
                <span className="h-0.5 flex-1 overflow-hidden bg-paper/[0.13]">
                  <span className="block h-full w-full origin-left bg-accent [animation:pzFill_14s_infinite_both]" />
                </span>
              )}
            </span>
          ))}
          <span className="h-[18px] w-[18px] flex-none animate-pulse-dot rounded-full border-2 border-accent" />
        </div>
        <div className="mt-2 flex justify-between font-mono text-[10px] tracking-[0.06em]">
          {JOURNEY.map((label, i) => (
            <span
              key={label}
              className={
                i === JOURNEY.length - 1
                  ? "text-accent-soft [animation:pzSoft_2.4s_ease-in-out_infinite]"
                  : "text-paper/65"
              }
            >
              {label}
            </span>
          ))}
        </div>

        <div className="mt-[22px] grid grid-cols-3 gap-3">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="rounded-[14px] border border-paper/10 bg-[#231d16] px-[17px] py-[13px] max-[720px]:px-3"
            >
              <div className="font-mono text-[9px] tracking-[0.12em] text-paper/50">
                {s.label}
              </div>
              <b className="mt-1.5 block text-[14.5px] max-[720px]:text-[12px]">
                {s.value}
              </b>
              <span
                className={`mt-0.5 block text-[12px] max-[720px]:text-[10.5px] ${
                  s.accent ? "text-accent-soft" : "text-paper/55"
                }`}
              >
                {s.sub}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-3 rounded-[14px] border border-paper/10 bg-[#231d16] px-[17px] py-3">
          <span className="grid h-[34px] w-[34px] flex-none place-items-center rounded-full bg-accent text-[10px] text-white">
            {"▶"}
          </span>
          <div>
            <div className="font-mono text-[9px] tracking-[0.12em] text-paper/50">
              LATEST SERMON
            </div>
            <b className="mt-0.5 block text-[14px]">
              From Scarcity to Surrender
            </b>
          </div>
        </div>
      </div>

      {/* Hidden on narrow screens: at phone width the browser mock is already
          squeezed and the toast lands on top of her name. The app view carries
          the message there instead. */}
      <div className="absolute right-6 top-[66px] w-[290px] rounded-[15px] border border-paper/[0.14] bg-[#2a231b] px-[17px] py-[13px] shadow-[0_30px_60px_-24px_rgba(0,0,0,0.9)] [animation:pzToast_14s_infinite_both] max-[720px]:hidden">
        <div className="flex items-center gap-2">
          <span className="grid h-[22px] w-[22px] place-items-center rounded-[7px] bg-accent text-[11px] text-white">
            {"✝"}
          </span>
          <span className="font-mono text-[9.5px] tracking-[0.1em] text-paper/60">
            GRACE FELLOWSHIP
          </span>
          <span className="ml-auto text-[11px] text-paper/40">now</span>
        </div>
        <b className="mt-2 block text-[13.5px]">{MESSAGE.title}</b>
        <span className="mt-px block text-[12px] text-paper/60">
          {MESSAGE.body}
        </span>
      </div>
    </div>
  );
}

/* —————————————————— app —————————————————— */

function PhoneLogin() {
  return (
    <div className="absolute inset-0 grid place-items-center [animation:pzA_14s_infinite_both]">
      <div className="w-[248px] -translate-y-6">
        <span className="mx-auto grid h-[46px] w-[46px] place-items-center rounded-[13px] bg-accent text-[21px] text-white">
          {"✝"}
        </span>
        <div className="mt-4 text-center font-serif text-2xl tracking-[-0.01em]">
          Welcome back.
        </div>
        <div className="mt-1 text-center text-[12.5px] text-paper/50">
          Sign in to see your next step.
        </div>
        <div className="mt-5 font-mono text-[9px] tracking-[0.12em] text-paper/50">
          EMAIL
        </div>
        <div className="mt-1.5 rounded-[10px] border border-paper/[0.14] bg-[#231d16] px-3 py-[11px] font-mono text-[11.5px]">
          <span className="inline-block overflow-hidden whitespace-nowrap align-bottom [animation:pzType_14s_infinite_both]">
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
          <span className="grid place-items-center rounded-[11px] bg-accent p-3 text-sm font-semibold text-white [animation:pzClick_14s_infinite_both]">
            Sign in
          </span>
          <Cursor className="left-[58%] top-[55%] [animation:pzCurP_14s_infinite_both]" />
        </div>
        <div className="mt-4 text-center text-[11px] text-paper/45">
          Face ID enabled
        </div>
      </div>
    </div>
  );
}

function PhoneDash() {
  const [group, giving, campus] = STATS;

  return (
    <div className="absolute inset-0 [animation:pzB_14s_infinite_both]">
      <div className="h-[52px]" />
      <div className="px-[18px]">
        <div className="flex items-center justify-between">
          <div className="font-serif text-[23px]">Hi, Sarah.</div>
          <span className="grid h-[26px] w-[26px] place-items-center rounded-full bg-[#3a332a] text-[10px] font-bold text-paper">
            S
          </span>
        </div>

        <div className="mt-3 rounded-[14px] border-[1.5px] border-accent/55 bg-accent/[0.13] px-[15px] py-3.5 shadow-[0_18px_34px_-22px_rgba(187,74,35,0.5)]">
          <div className="flex items-center gap-[7px] font-mono text-[8.5px] tracking-[0.12em] text-accent-soft">
            <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-accent" />
            YOUR NEXT STEP
          </div>
          <b className="mt-[5px] block font-serif text-[18px] font-medium">
            Serve on a team
          </b>
          <span className="mt-[9px] inline-block rounded-full bg-accent px-3 py-[7px] text-[10.5px] font-semibold text-white">
            Explore teams {"→"}
          </span>
        </div>

        <div className="mt-3 rounded-[14px] border border-paper/10 bg-[#1e1913] px-[13px] py-3">
          <div className="font-mono text-[8px] tracking-[0.1em] text-paper/50">
            YOUR JOURNEY
          </div>
          <div className="mt-2.5 flex items-center">
            {[0, 1, 2].map((i) => (
              <span key={i} className="contents">
                <span className="grid h-4 w-4 flex-none place-items-center rounded-full bg-accent text-[9px] text-white">
                  {"✓"}
                </span>
                {i < 2 ? (
                  <span className="h-[2px] flex-1 bg-accent" />
                ) : (
                  <span className="h-[2px] flex-1 overflow-hidden bg-paper/[0.13]">
                    <span className="block h-full w-full origin-left bg-accent [animation:pzFill_14s_infinite_both]" />
                  </span>
                )}
              </span>
            ))}
            <span className="h-[15px] w-[15px] flex-none animate-pulse-dot rounded-full border-2 border-accent" />
          </div>
          <div className="mt-1.5 flex justify-between font-mono text-[7.5px] tracking-[0.04em]">
            {JOURNEY.map((label, i) => (
              <span
                key={label}
                className={
                  i === JOURNEY.length - 1
                    ? "text-accent-soft [animation:pzSoft_2.4s_ease-in-out_infinite]"
                    : "text-paper/60"
                }
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-2">
          {[group, giving].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-paper/10 bg-[#1e1913] px-3 py-2.5"
            >
              <div className="font-mono text-[7.5px] tracking-[0.1em] text-paper/50">
                {s.label}
              </div>
              <b className="mt-1 block text-[11.5px]">{s.value}</b>
              <span
                className={`block text-[9.5px] ${
                  s.accent ? "text-accent-soft" : "text-paper/55"
                }`}
              >
                {s.sub}
              </span>
            </div>
          ))}
        </div>

        {/* campus gets its own row — two stats side by side is plenty on a phone */}
        <div className="mt-2 flex items-center justify-between rounded-xl border border-paper/10 bg-[#1e1913] px-3 py-2.5">
          <div>
            <div className="font-mono text-[7.5px] tracking-[0.1em] text-paper/50">
              {campus.label}
            </div>
            <b className="mt-1 block text-[11.5px]">{campus.value}</b>
          </div>
          <span className="text-[9.5px] text-paper/55">{campus.sub}</span>
        </div>

        <div className="mt-2 flex items-center gap-[9px] rounded-xl border border-paper/10 bg-[#1e1913] px-3 py-2.5">
          <span className="grid h-[30px] w-[30px] flex-none place-items-center rounded-full bg-accent text-[9px] text-white">
            {"▶"}
          </span>
          <div>
            <b className="block text-[11px]">From Scarcity to Surrender</b>
            <span className="text-[9.5px] text-paper/50">
              Sunday · Cambridge
            </span>
          </div>
        </div>
      </div>

      {/* slides down from behind the notch, clearing the next-step card */}
      <div className="absolute inset-x-3 top-3 rounded-[16px] border border-paper/[0.14] bg-[#2a231b] px-3.5 py-2.5 shadow-[0_24px_50px_-20px_rgba(0,0,0,0.95)] [animation:pzBanner_14s_infinite_both]">
        <div className="flex items-center gap-[7px]">
          <span className="grid h-[18px] w-[18px] place-items-center rounded-[6px] bg-accent text-[9px] text-white">
            {"✝"}
          </span>
          <span className="font-mono text-[8px] tracking-[0.1em] text-paper/60">
            GRACE FELLOWSHIP
          </span>
          <span className="ml-auto text-[9.5px] text-paper/40">now</span>
        </div>
        <b className="mt-1.5 block text-[11.5px]">{MESSAGE.title}</b>
        <span className="block text-[10px] text-paper/60">{MESSAGE.body}</span>
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
  );
}

/* ————————————————— shell ————————————————— */

const DEVICES = [
  { id: "web" as const, label: "Website", Icon: Monitor },
  { id: "app" as const, label: "App", Icon: Smartphone },
];

/* Snappier than the reveal ease — this one answers a click. */
const SWAP = {
  duration: 0.5,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

export default function PersonalizationDemo() {
  const [device, setDevice] = useState<"web" | "app">("web");
  const isApp = device === "app";

  return (
    <>
      <style>{KEYFRAMES}</style>

      <Reveal delay={0.1} className="mt-9 flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-full border border-paper/15 bg-paper/[0.04] p-1">
          {DEVICES.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setDevice(id)}
              aria-pressed={device === id}
              className={`relative inline-flex items-center gap-2 rounded-full px-[18px] py-2 text-[13px] font-semibold transition-colors ${
                device === id ? "text-white" : "text-paper/55 hover:text-paper"
              }`}
            >
              {device === id && (
                <motion.span
                  layoutId="pzDevicePill"
                  transition={SWAP}
                  className="absolute inset-0 rounded-full bg-accent"
                />
              )}
              <Icon className="relative h-[15px] w-[15px]" strokeWidth={2} />
              <span className="relative">{label}</span>
            </button>
          ))}
        </div>
      </Reveal>

      <GlowReveal
        delay={0.15}
        className="group relative mx-auto mt-11 w-[min(920px,100%)]"
        glow={
          /* Backdrop glow: a blurred rounded rect matching the window, so the
             halo reads rectangular rather than as a round blob. It lives on its
             own layer because the frame is masked, and it fades out well before
             the frame starts going transparent — otherwise the glow shows
             straight through the bottom of the frame. The wrapper carries that
             fade (no-repeat so nothing tiles outside it) and is padded wide
             enough that the blur dies before reaching its own edges.

             Each device gets its own rect rather than one that scales —
             scaling squashes the border with it, so the phone's halo ends up
             both too wide and too thin on the sides. These two crossfade. */
          <div
            aria-hidden
            className="pointer-events-none absolute -left-28 -right-28 -top-24 bottom-0 opacity-85 transition-opacity duration-500 [-webkit-mask-image:linear-gradient(to_bottom,#000_58%,transparent_93%)] [-webkit-mask-repeat:no-repeat] [mask-image:linear-gradient(to_bottom,#000_58%,transparent_93%)] [mask-repeat:no-repeat] group-hover:opacity-100"
          >
            <motion.div
              animate={{ opacity: isApp ? 0 : 1 }}
              transition={SWAP}
              className="absolute inset-x-28 -bottom-72 top-24 rounded-[44px] border-[30px] border-accent blur-[26px]"
            />
            {/* sized just inside the 330px phone so the halo hugs its edges */}
            <motion.div
              animate={{ opacity: isApp ? 1 : 0 }}
              transition={SWAP}
              className="absolute -bottom-72 left-1/2 top-24 w-[288px] -translate-x-1/2 rounded-[40px] border-[22px] border-accent blur-[22px]"
            />
          </div>
        }
      >
        {/* Both devices live in one masked, fixed-height stage so the fade
            into the page is identical either way — and so the loops stay in
            lockstep, landing on the same beat when you switch. */}
        <div className="relative h-[636px] [-webkit-mask-image:linear-gradient(to_bottom,#000_62%,transparent_98%)] [mask-image:linear-gradient(to_bottom,#000_62%,transparent_98%)]">
          <div
            aria-hidden={isApp}
            className={`absolute inset-x-0 top-0 ${isApp ? "pointer-events-none" : ""}`}
          >
            <motion.div
              animate={{ opacity: isApp ? 0 : 1, scale: isApp ? 0.965 : 1 }}
              transition={SWAP}
              className="rounded-[30px] border border-paper/15 bg-paper/[0.03] p-3 transition-colors duration-500 group-hover:border-paper/25"
            >
              <div className="overflow-hidden rounded-[22px] border border-paper/10 bg-[#1a1611] text-left text-paper">
                <div className="flex items-center gap-1.5 border-b border-paper/10 px-[18px] py-[13px] font-mono text-[11px] text-paper/50">
                  <TrafficLights small />
                  <span className="ml-2">gracechurch.org/me</span>
                </div>
                <div className="relative h-[568px]">
                  <WebLogin />
                  <WebDash />
                </div>
              </div>
            </motion.div>
          </div>

          <div
            aria-hidden={!isApp}
            className={`absolute left-1/2 top-0 w-[330px] max-w-full -translate-x-1/2 ${
              isApp ? "" : "pointer-events-none"
            }`}
          >
            <motion.div
              animate={{ opacity: isApp ? 1 : 0, scale: isApp ? 1 : 0.965 }}
              transition={SWAP}
            >
              <PhoneFrame size="lg" screenClassName="h-[614px] text-left">
                <PhoneLogin />
                <PhoneDash />
              </PhoneFrame>
            </motion.div>
          </div>
        </div>
      </GlowReveal>
    </>
  );
}
