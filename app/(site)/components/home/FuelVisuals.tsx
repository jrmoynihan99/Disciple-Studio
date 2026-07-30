import type { CSSProperties } from "react";
import Reveal from "@/components/reveal-animations/Reveal";

/* ════════════════════════════════════════════════════════════════
   FuelBand visual — the relay in glass: a live two-way sync of
   people, events and groups between the church's ChMS and the
   website / app / CMS.

   Not a star — a circuit. The packet is handed on rather than
   bounced back: the ChMS feeds the CMS, the CMS pushes to the
   website and app, and those two carry it the long way home. The
   CMS never answers the ChMS directly, so the whole thing reads as
   one direction of travel.

   The materials: glass tubes with a bore shadow, ambient glow and a
   gloss line; capsules as solid slugs of light — dark tail into a hot
   head, a smear dragged behind and a glare sliding along the glass
   above; flanged ports that charge and drain; the core pale in a
   breathing halo against warm surfaces, the whole rig over one big
   furnace glow.

   The colour story: each beat the ChMS sends out one record type —
   people, events or groups, mapped in the legend inside the core
   node — and the CMS hands that same colour on. The write-backs come
   home in any of the three. Port flashes and card washes stay the
   node's own material colour; only the liquid carries the record's.

   Movement rides ride1/2/3 in globals.css. A slug is a plain HTML
   element put on the tube's own curve with offset-path, so it leans
   through the bends and travel is 0→100% of whatever that curve
   measures — the geometry can be moved without re-measuring anything.
   The colour rotation is a second animation on the same element
   (tonevars, 21s) touching nothing but the variables it paints from;
   its switches land between visibility windows, so a slug never
   changes colour mid-flight.

   Never name the ChMS vendor here — it's whatever the church already
   runs, so it's only ever "Your ChMS".
   ════════════════════════════════════════════════════════════════ */

/* ——— the record map ———
   One liquid palette per type (spill · ghost · slug · heart). Salmon,
   gold and cream: three clearly different warm colours. The slug colour
   doubles as the legend dot in the core node. */
const RL_TYPES = {
  people: {
    label: "PEOPLE",
    spill: "#bb4a23",
    ghost: "#e0764f",
    slug: "#f4a381",
    heart: "#ffe2cf",
  },
  events: {
    label: "EVENTS",
    spill: "#a3742a",
    ghost: "#cf9d45",
    slug: "#eec468",
    heart: "#ffeec2",
  },
  groups: {
    label: "GROUPS",
    spill: "#8c8273",
    ghost: "#cfc4ae",
    slug: "#efe4d4",
    heart: "#fffdf6",
  },
} as const;

type RelayToneKey = keyof typeof RL_TYPES;
type RelayToneOrder = [RelayToneKey, RelayToneKey, RelayToneKey];

/* Beat order for the chain out — the record the ChMS sends this beat, and
   the one the CMS hands on. Also the legend's order. */
const RL_TRIAD: RelayToneOrder = ["people", "events", "groups"];

/* Rotation order for each return slot (matching that leg's `delays`), each
   phased differently, so the write-backs come home as a changing mix. */
const RL_BACK_TONES: Record<string, RelayToneOrder[]> = {
  "web-core": [
    ["events", "people", "groups"],
    ["groups", "events", "people"],
  ],
  "app-core": [
    ["people", "groups", "events"],
    ["events", "groups", "people"],
  ],
};

/* Movement + colour, as one class per leg: the leg's own ride keyframes
   plus the tonevars pass. The ride is left on the default ease, which is
   what gives the slug its lean out of the port and its settle into the
   mouth. Written out in full for Tailwind's scanner. */
const RL_RIDE_CLS: Record<string, string> = {
  "core-cms":
    "animate-[ride1_7s_infinite_both,tonevars_21s_linear_infinite_both]",
  "cms-web":
    "animate-[ride2_7s_infinite_both,tonevars_21s_linear_infinite_both]",
  "cms-app":
    "animate-[ride2_7s_infinite_both,tonevars_21s_linear_infinite_both]",
  "web-core":
    "animate-[ride3_7s_infinite_both,tonevars_21s_linear_infinite_both]",
  "app-core":
    "animate-[ride3_7s_infinite_both,tonevars_21s_linear_infinite_both]",
};

/* ——— toning the machinery ———
   The slug, and every port flash, wash, pop and ring that serves it, wear
   the colour of the record in flight. Each element runs tonevars
   (globals.css) beside its beat animation with the same delay; tonevars
   flips --v1…--v4 through the three per-beat palettes provided inline. The
   static --v* below double as fallbacks, so a failed animation still shows
   the first beat's colour. Most things need three slots; the slug is the
   one that takes a fourth. */

type RelayTone = (typeof RL_TYPES)[RelayToneKey];
type ToneMk = (t: RelayTone) => [string, string, string, string?];

function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/* surface arrivals: flood shades, then the flare and its rim */
const MK_WASH: ToneMk = (t) => [
  hexA(t.slug, 0.95),
  hexA(t.ghost, 0.45),
  hexA(t.spill, 0.16),
];
const MK_POP: ToneMk = (t) => [
  hexA(t.slug, 0.4),
  hexA(t.slug, 0.95),
  "transparent",
];
/* rings and port flashes take the slug colour straight */
const MK_LINE: ToneMk = (t) => [t.slug, "transparent", "transparent"];
/* the pale core drinks the colour a touch softer */
const MK_CORE_WASH: ToneMk = (t) => [
  hexA(t.slug, 0.9),
  hexA(t.ghost, 0.35),
  "transparent",
];
const MK_CORE_POP: ToneMk = (t) => [
  hexA(t.slug, 0.25),
  hexA(t.slug, 0.9),
  "transparent",
];
const MK_CORE_LINE: ToneMk = (t) => [
  hexA(t.slug, 0.85),
  "transparent",
  "transparent",
];
/* the liquid itself: the slug's dark back, its body — which also colours
   the halo it throws into the glass — the smear it drags, and its hot
   heart, kept up at the head where the light is densest */
const MK_PULSE: ToneMk = (t) => [
  t.spill,
  t.slug,
  hexA(t.ghost, 0.55),
  t.heart,
];

function toneStyle(delay: string, order: RelayToneOrder, mk: ToneMk) {
  const [a, b, c] = order.map((k) => mk(RL_TYPES[k]));
  return {
    animationDelay: delay,
    "--v1": a[0],
    "--v2": a[1],
    "--v3": a[2],
    "--v4": a[3],
    "--a1": a[0],
    "--a2": a[1],
    "--a3": a[2],
    "--a4": a[3],
    "--b1": b[0],
    "--b2": b[1],
    "--b3": b[2],
    "--b4": b[3],
    "--c1": c[0],
    "--c2": c[1],
    "--c3": c[2],
    "--c4": c[3],
  } as CSSProperties;
}

/* The spine's tail port charges just before the NEXT beat's launch, so
   its rotation leads the triad by one. */
const RL_TRIAD_LEAD: RelayToneOrder = ["events", "groups", "people"];

/* ——— geometry ——— */

const RL_W = 800;
const RL_H = 620;

const RL_CORE = { left: 400, top: 104 };
const RL_CARD_W = 148;
const RL_CARD_H = 96;
const RL_CORE_D = 168;

/* `feed` is where that tile's tube meets it, in stage coordinates. These
   tubes arrive off-centre and at a corner, so the wash origin is measured
   from the real endpoint rather than guessed from an angle. */
const RL_NODES = [
  /* fed by the core, so it lands on the chain's first beat */
  {
    key: "CMS",
    label: "CMS",
    glyph: "✎",
    left: 400,
    top: 340,
    feed: [400, 292] as [number, number],
    delay: "0s",
  },
  /* fed by the CMS — 1.68s is 24% of the 7s cycle, which slides the shared
     absorb beat from 26% to 50% without needing another keyframe */
  {
    key: "WEB",
    label: "WEBSITE",
    glyph: "◱",
    left: 175,
    top: 530,
    feed: [224, 482] as [number, number],
    delay: "1.68s",
  },
  {
    key: "APP",
    label: "APP",
    glyph: "▯",
    left: 625,
    top: 530,
    feed: [576, 482] as [number, number],
    delay: "1.68s",
  },
];

/* Curved conduits. Ports are drawn at the ends; where an end sits under a
   card the card paints over it, which is what makes a capsule look like it
   is being taken in rather than stopping short.

   `delays` are the capsules riding a leg — one each, since a slug's whole
   trip fits inside its own beat. `sendDelays` / `fillDelays` are when the
   tail and mouth ports light, one entry per capsule.

   Both port keyframes peak at 26% of their own cycle, so each is placed by
   delay alone: (that leg's departure or arrival − 26%) × 7s, plus the
   capsule's own delay. Departures land at 6% / 33% / 57% of the cycle and
   arrivals at 26% / 50% / 76%, which is where these numbers come from —
   they only stay in step if the relay* keyframes keep those timings. */
type RelayLeg = {
  key: string;
  d: string;
  from: [number, number];
  to: [number, number];
  back?: boolean;
  delays: string[];
  sendDelays: string[];
  fillDelays: string[];
  /* rotation order of the capsule each port flash serves, one per slot */
  sendTones: RelayToneOrder[];
  fillTones: RelayToneOrder[];
};

const RL_LEGS: RelayLeg[] = [
  {
    key: "core-cms",
    d: "M400 188L400 292",
    from: [400, 188],
    to: [400, 292],
    delays: ["0s"],
    sendDelays: ["5.6s"],
    fillDelays: ["0s"],
    sendTones: [RL_TRIAD_LEAD],
    fillTones: [RL_TRIAD],
  },
  {
    key: "cms-web",
    d: "M352 388C322 424 268 444 224 482",
    from: [352, 388],
    to: [224, 482],
    delays: ["0s"],
    sendDelays: ["0.49s"],
    fillDelays: ["1.68s"],
    sendTones: [RL_TRIAD],
    fillTones: [RL_TRIAD],
  },
  {
    key: "cms-app",
    d: "M448 388C478 424 532 444 576 482",
    from: [448, 388],
    to: [576, 482],
    delays: ["0s"],
    sendDelays: ["0.49s"],
    fillDelays: ["1.68s"],
    sendTones: [RL_TRIAD],
    fillTones: [RL_TRIAD],
  },
  {
    key: "web-core",
    d: "M101 518C20 400 40 180 354 176",
    from: [101, 518],
    to: [354, 176],
    back: true,
    delays: ["0s", "2.8s"],
    sendDelays: ["2.17s", "4.97s"],
    fillDelays: ["3.5s", "6.3s"],
    sendTones: RL_BACK_TONES["web-core"],
    fillTones: RL_BACK_TONES["web-core"],
  },
  {
    key: "app-core",
    d: "M699 518C780 400 760 180 446 176",
    from: [699, 518],
    to: [446, 176],
    back: true,
    delays: ["1.4s", "4.2s"],
    sendDelays: ["3.57s", "6.37s"],
    fillDelays: ["4.9s", "7.7s"],
    sendTones: RL_BACK_TONES["app-core"],
    fillTones: RL_BACK_TONES["app-core"],
  },
];

/* ——— arrival machinery ——— */

/* Where the light lands, as a percentage of the element's own box: a point
   in stage coordinates mapped into a box centred on `centre`. */
type Contact = { left: string; top: string };

function contactIn(
  centre: { left: number; top: number },
  w: number,
  h: number,
  at: [number, number],
): Contact {
  return {
    left: `${((at[0] - (centre.left - w / 2)) / w) * 100}%`,
    top: `${((at[1] - (centre.top - h / 2)) / h) * 100}%`,
  };
}

/* Long, soft falloff and a wider-than-tall box: the light spreads along the
   tile the way it's shaped instead of reading as a circle sat on top of it.
   The stops ride --v1/--v2/--v3, which tonevars rotates to the colour of
   whatever is landing. */
const ABSORB_WASH =
  "absolute inset-0 rounded-full bg-[radial-gradient(closest-side,var(--v1),var(--v2)_36%,var(--v3)_64%,transparent_100%)]";

/* Each return capsule needs the core to drink at the moment it lands, so
   these delays mirror the return legs' capsule delays exactly, the tones
   mirror their rotation orders, and the contact points are the legs'
   measured endpoints on the core's rim. */
type CoreHit = {
  key: string;
  contact: Contact;
  delay: string;
  tones: RelayToneOrder;
};

const RL_CORE_HITS: CoreHit[] = [
  { key: "w1", delay: "0s", tones: RL_BACK_TONES["web-core"][0] },
  { key: "w2", delay: "2.8s", tones: RL_BACK_TONES["web-core"][1] },
  { key: "a1", delay: "1.4s", tones: RL_BACK_TONES["app-core"][0] },
  { key: "a2", delay: "4.2s", tones: RL_BACK_TONES["app-core"][1] },
].map((h) => ({
  ...h,
  contact: contactIn(
    RL_CORE,
    RL_CORE_D,
    RL_CORE_D,
    h.key.startsWith("w") ? [354, 176] : [446, 176],
  ),
}));

/* The warm surface tile: deep orange body, hot glyph, and the
   strike-flood-flare-ring arrival — every stage of it toned to the
   incoming capsule. */
function SurfaceCard({
  glyph,
  label,
  delay,
  contact,
  tones,
}: {
  glyph: string;
  label: string;
  delay: string;
  contact: Contact;
  tones: RelayToneOrder;
}) {
  return (
    <div className="relative">
      {/* the ring it throws — outside the card so the clip can't eat it */}
      <span
        className="pointer-events-none absolute inset-[-10px] animate-[nodering_7s_infinite_both,tonevars_21s_linear_infinite_both] rounded-[30px] border-2 [border-color:var(--v1)]"
        style={toneStyle(delay, tones, MK_LINE)}
      />
      <div className="relative grid h-[96px] w-[148px] place-items-center overflow-hidden rounded-[20px] border-[1.5px] border-accent/60 [background:linear-gradient(160deg,#2e1d10,#1e140c_60%,#180f09)] shadow-[0_34px_70px_-34px_rgba(0,0,0,0.95),0_18px_50px_-24px_rgba(187,74,35,0.6)]">
        {/* light entering at the strike point, flooding across */}
        <span
          className="pointer-events-none absolute h-[240px] w-[330px] -translate-x-1/2 -translate-y-1/2"
          style={contact}
        >
          <span
            className={`${ABSORB_WASH} animate-[absorb_7s_infinite_both,tonevars_21s_linear_infinite_both]`}
            style={toneStyle(delay, tones, MK_WASH)}
          />
        </span>
        {/* and the flare once it's full. rounded-[19px] is the card's 20px
            radius less its border — the inset rim traces this element's own
            box, so without a radius here it lights up as a square and the
            card's clip just lops the corners off. */}
        <span
          className="pointer-events-none absolute inset-0 animate-[nodepop_7s_infinite_both,tonevars_21s_linear_infinite_both] rounded-[19px] [background-color:var(--v1)] shadow-[inset_0_0_0_2px_var(--v2)]"
          style={toneStyle(delay, tones, MK_POP)}
        />
        <div className="relative text-center">
          <div className="text-[23px] leading-none text-accent-glow">
            {glyph}
          </div>
          <div className="mt-2 font-mono text-[10px] tracking-[0.16em] text-paper/70">
            {label}
          </div>
        </div>
      </div>
    </div>
  );
}

/* The pale core — the white node against the warm surfaces — carrying the
   colour legend, stacked. emits: a ring per outbound packet. hits: a wash
   per inbound one, entering at the measured strike point. */
function CoreCard({ emits, hits }: { emits: string[]; hits: CoreHit[] }) {
  return (
    <div className="relative">
      {/* the emit ring wears the colour of the record leaving this beat */}
      {emits.map((d) => (
        <span
          key={`emit-${d}`}
          className="pointer-events-none absolute inset-[-9px] animate-[coreemit_7s_infinite_both,tonevars_21s_linear_infinite_both] rounded-full border-2 [border-color:var(--v1)]"
          style={toneStyle(d, RL_TRIAD, MK_LINE)}
        />
      ))}
      {hits.map((h) => (
        <span
          key={`ring-${h.key}`}
          className="pointer-events-none absolute inset-[-9px] animate-[corering_7s_infinite_both,tonevars_21s_linear_infinite_both] rounded-full border-2 [border-color:var(--v1)]"
          style={toneStyle(h.delay, h.tones, MK_CORE_LINE)}
        />
      ))}
      <div className="relative grid h-[168px] w-[168px] place-items-center overflow-hidden rounded-full border-[1.5px] border-paper/55 text-center [background:radial-gradient(circle_at_50%_30%,#3a352b,#221d15_78%)] shadow-[0_40px_90px_-36px_rgba(0,0,0,0.95),0_0_50px_-8px_rgba(244,240,232,0.22),inset_0_1px_0_rgba(244,240,232,0.18)]">
        {hits.map((h) => (
          <span
            key={`wash-${h.key}`}
            className="pointer-events-none absolute h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2"
            style={h.contact}
          >
            <span
              className="absolute inset-0 animate-[coreabsorb_7s_infinite_both,tonevars_21s_linear_infinite_both] rounded-full bg-[radial-gradient(closest-side,var(--v1),var(--v2)_45%,transparent_75%)]"
              style={toneStyle(h.delay, h.tones, MK_CORE_WASH)}
            />
          </span>
        ))}
        {hits.map((h) => (
          <span
            key={`pop-${h.key}`}
            className="pointer-events-none absolute inset-0 animate-[corepop_7s_infinite_both,tonevars_21s_linear_infinite_both] rounded-full [background-color:var(--v1)] shadow-[inset_0_0_0_2px_var(--v2)]"
            style={toneStyle(h.delay, h.tones, MK_CORE_POP)}
          />
        ))}
        <div className="relative">
          <b className="block font-serif text-[19px] font-medium leading-tight">
            Your ChMS
          </b>
          <div className="mt-2.5 flex flex-col items-start gap-[6px]">
            {RL_TRIAD.map((t) => (
              <span
                key={t}
                className="flex items-center gap-[7px] font-mono text-[9px] tracking-[0.14em] text-paper/70"
              >
                <span
                  className="h-[7px] w-[7px] rounded-full"
                  style={{ background: RL_TYPES[t].slug }}
                />
                {RL_TYPES[t].label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StageCaption({ children }: { children: string }) {
  return (
    <div className="mt-3 text-center font-mono text-[10.5px] tracking-[0.14em] text-paper/40">
      {children}
    </div>
  );
}

/* ——— the liquid ——— */

/* One slug of light, riding its leg's curve.

   The whole thing hangs off a zero-size point: offset-path drops that
   point onto the tube's own path and offset-rotate turns it into the
   direction of travel, so everything below is drawn in the slug's own
   frame — the tail always trails, the head always leads, through every
   bend. A zero-size box also means the path lands on the point exactly,
   with no half-a-box to correct for.

   The parts, back to front: the smear it drags, the slug with its head-to-
   tail gradient and halo, and a glare sliding along the glass above it. */
function GlassPulse({
  d,
  cls,
  delay,
  tones,
}: {
  d: string;
  cls: string;
  delay: string;
  tones: RelayToneOrder;
}) {
  return (
    <span
      className={`absolute left-0 top-0 h-0 w-0 [offset-rotate:auto] ${cls}`}
      style={{
        offsetPath: `path("${d}")`,
        ...toneStyle(delay, tones, MK_PULSE),
      }}
    >
      <span className="absolute right-[11px] top-0 h-[7px] w-[48px] -translate-y-1/2 rounded-full blur-[2px] [background:linear-gradient(90deg,transparent,var(--v3))]" />
      <span className="absolute left-0 top-0 h-[17px] w-[38px] -translate-x-1/2 -translate-y-1/2 rounded-full [background:linear-gradient(90deg,var(--v1),var(--v2)_68%,var(--v4))] shadow-[0_0_20px_var(--v2)]" />
      <span className="absolute left-0 top-0 h-[24px] w-[52px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/15 blur-[10px]" />
    </span>
  );
}

/* A flange whose flash wears the colour of the capsule it charges for or
   catches — one rotation order per slot, matching that slot's capsule. */
function GlassRelayPort({
  at,
  delays,
  tones,
  send = false,
}: {
  at: [number, number];
  delays: string[];
  tones: RelayToneOrder[];
  send?: boolean;
}) {
  const cls = send
    ? "animate-[portsend_7s_infinite_both,tonevars_21s_linear_infinite_both]"
    : "animate-[portfill_7s_infinite_both,tonevars_21s_linear_infinite_both]";
  return (
    <g>
      <circle
        cx={at[0]}
        cy={at[1]}
        r="15"
        fill="#1a1610"
        stroke="rgba(244,240,232,0.28)"
        strokeWidth="2.5"
      />
      {/* the flange's inner collar, visible whenever the port isn't lit */}
      <circle
        cx={at[0]}
        cy={at[1]}
        r="6"
        fill="rgba(187,74,35,0.18)"
        stroke="rgba(187,74,35,0.55)"
        strokeWidth="1"
      />
      {delays.map((d, i) => (
        <circle
          key={d}
          cx={at[0]}
          cy={at[1]}
          r="13"
          className={cls}
          style={{ fill: "var(--v1)", ...toneStyle(d, tones[i], MK_LINE) }}
        />
      ))}
    </g>
  );
}

export function SyncRelayGlass() {
  return (
    <Reveal delay={0.2} className="mx-auto mt-6 w-full px-4">
      {/* The stage keeps its full 800px layout box at every size and is
          shrunk with a transform, so `mx-auto` can't centre it once the box
          is wider than the viewport — margin:auto resolves to 0 and the box
          overflows to the right, taking the scaled artwork with it. A
          calc'd left margin centres the box even when it's oversized, and
          origin-top then scales it about that same centre. The negative
          bottom margins reclaim the height the scale gives back
          (620 − 620 × scale). Page-level overflow-x-clip in the site layout
          hides the overhang. */}
      <div className="ml-[calc(50%_-_400px)] w-[800px] origin-top max-[860px]:scale-[0.8] max-[860px]:-mb-[124px] max-[680px]:scale-[0.6] max-[680px]:-mb-[248px] max-[500px]:scale-[0.44] max-[500px]:-mb-[347px]">
        <div className="relative" style={{ width: RL_W, height: RL_H }}>
          {/* the furnace: one broad wash behind the whole rig, one hotter
              pool at its middle */}
          <span
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-[860px] w-[1020px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(187,74,35,0.26),rgba(187,74,35,0.09)_55%,transparent_80%)] blur-2xl"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-[460px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(224,118,79,0.16),transparent_75%)] blur-2xl"
          />
          <svg
            viewBox={`0 0 ${RL_W} ${RL_H}`}
            className="absolute inset-0 h-full w-full"
          >
            {/* the glass: wall · bore · bore shadow · ambient glow · gloss ·
                flow texture. The gloss is the same path nudged up and left —
                on the sweeps it reads as light on the top of the glass; on
                the spine it just slides along the tube, which is harmless. */}
            {RL_LEGS.map((l) => (
              <g key={`tube-${l.key}`}>
                <path
                  d={l.d}
                  fill="none"
                  stroke="rgba(244,240,232,0.18)"
                  strokeWidth="38"
                  strokeLinecap="round"
                />
                <path
                  d={l.d}
                  fill="none"
                  stroke="#16130f"
                  strokeWidth="32"
                  strokeLinecap="round"
                />
                <path
                  d={l.d}
                  fill="none"
                  stroke="rgba(0,0,0,0.45)"
                  strokeWidth="24"
                  strokeLinecap="round"
                />
                <path
                  d={l.d}
                  fill="none"
                  stroke={
                    l.back ? "rgba(244,240,232,0.09)" : "rgba(187,74,35,0.13)"
                  }
                  strokeWidth="16"
                  strokeLinecap="round"
                />
                <path
                  d={l.d}
                  transform="translate(-3,-6)"
                  fill="none"
                  stroke="rgba(255,255,255,0.07)"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <path
                  d={l.d}
                  fill="none"
                  stroke={
                    l.back ? "rgba(244,240,232,0.22)" : "rgba(187,74,35,0.4)"
                  }
                  strokeWidth="1.5"
                  strokeDasharray="5 15"
                  className="animate-[dashcreep_1.1s_linear_infinite]"
                />
              </g>
            ))}

            {/* tail charges and launches, mouth catches and drains. Both sit
                half under their tile, so the light reads as coming out of
                the tile and going into the next one. */}
            {RL_LEGS.map((l) => (
              <g key={`port-${l.key}`}>
                <GlassRelayPort
                  send
                  at={l.from}
                  delays={l.sendDelays}
                  tones={l.sendTones}
                />
                <GlassRelayPort
                  at={l.to}
                  delays={l.fillDelays}
                  tones={l.fillTones}
                />
              </g>
            ))}
          </svg>

          {/* liquid light, colour-mapped by record type. The chain out
              rotates through the triad — one record type per beat, the CMS
              handing on whatever colour the ChMS sent. The write-backs
              rotate on their own phases: any colour, any time. Movement is
              plain ride1/2/3 throughout.

              These sit above the tubes but below the tiles, so a slug is
              painted over as it reaches a card — which is what makes it
              read as taken in rather than stopping short. */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            {RL_LEGS.filter((l) => !l.back).map((l) =>
              l.delays.map((d) => (
                <GlassPulse
                  key={`out-${l.key}-${d}`}
                  d={l.d}
                  cls={RL_RIDE_CLS[l.key]}
                  delay={d}
                  tones={RL_TRIAD}
                />
              )),
            )}
            {RL_LEGS.filter((l) => l.back).map((l) =>
              l.delays.map((d, i) => (
                <GlassPulse
                  key={`back-${l.key}-${d}`}
                  d={l.d}
                  cls={RL_RIDE_CLS[l.key]}
                  delay={d}
                  tones={RL_BACK_TONES[l.key][i]}
                />
              )),
            )}
          </div>

          {RL_NODES.map((n) => (
            <div
              key={n.key}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: n.left, top: n.top }}
            >
              <SurfaceCard
                glyph={n.glyph}
                label={n.label}
                delay={n.delay}
                contact={contactIn(n, RL_CARD_W, RL_CARD_H, n.feed)}
                tones={RL_TRIAD}
              />
            </div>
          ))}

          {/* the core in its reactor dressing: a breathing white halo, a
              slow conic arc and a counter-drifting orbit */}
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: RL_CORE.left, top: RL_CORE.top }}
          >
            <div className="relative">
              <span
                aria-hidden
                className="pointer-events-none absolute -inset-10 animate-[reactorbreathe_3.8s_ease-in-out_infinite] rounded-full bg-[radial-gradient(closest-side,rgba(244,240,232,0.26),transparent_72%)] blur-xl"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-[-24px] animate-[slowspin_7s_linear_infinite] rounded-full [background:conic-gradient(from_0deg,transparent_0_72%,rgba(244,163,129,0.55)_86%,transparent_100%)] [mask-image:radial-gradient(closest-side,transparent_74%,#000_76%)] [-webkit-mask-image:radial-gradient(closest-side,transparent_74%,#000_76%)]"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-[-13px] animate-[slowspin_26s_linear_infinite_reverse] rounded-full border border-dashed border-paper/20"
              />
              <CoreCard emits={["0s"]} hits={RL_CORE_HITS} />
            </div>
          </div>
        </div>
      </div>
      <StageCaption>
        {"ChMS → CMS → WEBSITE & APP → BACK TO ChMS"}
      </StageCaption>
    </Reveal>
  );
}
