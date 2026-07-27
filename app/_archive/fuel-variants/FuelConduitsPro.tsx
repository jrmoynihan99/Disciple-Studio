import Reveal from "@/components/reveal-animations/Reveal";

/* ════════════════════════════════════════════════════════════════
   FuelConduitsPro — the glass conduits: the ChMS core in the middle,
   the three surfaces around it, records visibly carried out and back
   through glass tubes as liquid light.

   Runs on the shared 7s beat (spokeout/spokein for travel, absorb /
   nodepop / nodering / coreemit / coreabsorb / corepop / corering for
   arrivals — see globals.css). Never name the ChMS vendor.
   ════════════════════════════════════════════════════════════════ */

const SURFACES = [
  { label: "WEBSITE", glyph: "◱", delay: "0s" },
  { label: "APP", glyph: "▯", delay: "2.33s" },
  { label: "CMS", glyph: "✎", delay: "4.66s" },
];

/* Where the light lands, as a percentage of the element's own box. On a
   surface it enters from the core's side; on the core it enters from that
   surface's side — the same point seen from opposite ends. */
function contactPoint(angle: number, fromCore: boolean) {
  const r = (angle * Math.PI) / 180;
  const s = fromCore ? -1 : 1;
  return {
    left: `${50 + s * 50 * Math.cos(r)}%`,
    top: `${50 + s * 50 * Math.sin(r)}%`,
  };
}

const ABSORB_WASH =
  "absolute inset-0 rounded-full bg-[radial-gradient(closest-side,rgba(244,163,129,0.95),rgba(224,118,79,0.4)_45%,transparent_75%)]";

function coreSpokes(angles: number[]) {
  return {
    emits: SURFACES.map((s) => s.delay),
    hits: SURFACES.map((s, i) => ({
      key: s.label,
      angle: angles[i],
      delay: s.delay,
    })),
  };
}

/* The glass rig's surface card: glassy body, the glyph in a lit badge, and
   the strike-flood-flare-ring arrival. */
function ProSurfaceCard({
  glyph,
  label,
  delay,
  angle,
}: {
  glyph: string;
  label: string;
  delay: string;
  angle: number;
}) {
  return (
    <div className="relative">
      <span
        className="pointer-events-none absolute inset-[-11px] animate-[nodering_7s_infinite_both] rounded-[32px] border-2 border-accent-glow"
        style={{ animationDelay: delay }}
      />
      <div className="relative grid h-[102px] w-[156px] place-items-center overflow-hidden rounded-[22px] border border-accent/40 [background:linear-gradient(160deg,#261d14,#171310_60%,#131009)] shadow-[0_36px_80px_-34px_rgba(0,0,0,0.95),0_20px_50px_-28px_rgba(187,74,35,0.4),inset_0_1px_0_rgba(244,240,232,0.08)]">
        <span
          className="pointer-events-none absolute h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2"
          style={contactPoint(angle, true)}
        >
          <span
            className={`${ABSORB_WASH} animate-[absorb_7s_infinite_both]`}
            style={{ animationDelay: delay }}
          />
        </span>
        <span
          className="pointer-events-none absolute inset-0 animate-[nodepop_7s_infinite_both] rounded-[21px] bg-accent/40 shadow-[inset_0_0_0_2px_rgba(244,163,129,0.95)]"
          style={{ animationDelay: delay }}
        />
        <div className="relative flex items-center gap-3 px-4 text-left">
          <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full border border-accent/40 bg-accent/10 text-[19px] text-accent-soft shadow-[0_0_18px_rgba(187,74,35,0.35)]">
            {glyph}
          </span>
          <span className="font-mono text-[10px] tracking-[0.16em] text-paper/75">
            {label}
          </span>
        </div>
      </div>
    </div>
  );
}

/* The reactor core: breathing halo, spinning conic arc, dashed
   counter-orbit, and the same drink-it-in arrival as the relay's core. */
function CoreOrb({
  emits,
  hits,
}: {
  emits: string[];
  hits: { key: string; angle: number; delay: string }[];
}) {
  return (
    <div className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-10 animate-[reactorbreathe_3.8s_ease-in-out_infinite] rounded-full bg-[radial-gradient(closest-side,rgba(187,74,35,0.35),transparent_72%)] blur-xl"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-[-26px] animate-[slowspin_7s_linear_infinite] rounded-full [background:conic-gradient(from_0deg,transparent_0_72%,rgba(244,163,129,0.55)_86%,transparent_100%)] [mask-image:radial-gradient(closest-side,transparent_74%,#000_76%)] [-webkit-mask-image:radial-gradient(closest-side,transparent_74%,#000_76%)]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-[-14px] animate-[slowspin_26s_linear_infinite_reverse] rounded-full border border-dashed border-paper/20"
      />
      {emits.map((d) => (
        <span
          key={`emit-${d}`}
          className="pointer-events-none absolute inset-[-9px] animate-[coreemit_7s_infinite_both] rounded-full border-2 border-accent-glow"
          style={{ animationDelay: d }}
        />
      ))}
      {hits.map((h) => (
        <span
          key={`ring-${h.key}`}
          className="pointer-events-none absolute inset-[-9px] animate-[corering_7s_infinite_both] rounded-full border-2 border-paper/75"
          style={{ animationDelay: h.delay }}
        />
      ))}
      <div className="relative grid h-[176px] w-[176px] place-items-center overflow-hidden rounded-full border-[1.5px] border-paper/20 text-center [background:radial-gradient(circle_at_50%_32%,#261d12,#151108_72%)] shadow-[0_44px_100px_-36px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(244,240,232,0.08)]">
        {hits.map((h) => (
          <span
            key={`wash-${h.key}`}
            className="pointer-events-none absolute h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2"
            style={contactPoint(h.angle, false)}
          >
            <span
              className="absolute inset-0 animate-[coreabsorb_7s_infinite_both] rounded-full bg-[radial-gradient(closest-side,rgba(244,240,232,0.9),rgba(244,240,232,0.3)_45%,transparent_75%)]"
              style={{ animationDelay: h.delay }}
            />
          </span>
        ))}
        {hits.map((h) => (
          <span
            key={`pop-${h.key}`}
            className="pointer-events-none absolute inset-0 animate-[corepop_7s_infinite_both] rounded-full bg-paper/25 shadow-[inset_0_0_0_2px_rgba(244,240,232,0.9)]"
            style={{ animationDelay: h.delay }}
          />
        ))}
        <div className="relative">
          <b className="block font-serif text-[21px] font-medium leading-tight">
            Your ChMS
          </b>
          <div className="mt-2 font-mono text-[10px] tracking-[0.12em] text-paper/45">
            542 · 24 · 11
          </div>
        </div>
      </div>
    </div>
  );
}

/* ——— the rig ——— */

const GL_W = 800;
const GL_H = 620;
const GL_CX = 400;
const GL_CY = 310;
const GL_R = 250;
const GL_ANGLES = [-90, 30, 150];
const GL_TUBE_IN = 88;
const GL_TUBE_LEN = GL_R - GL_TUBE_IN - 56;

function glPos(angle: number) {
  const r = (angle * Math.PI) / 180;
  return {
    left: GL_CX + GL_R * Math.cos(r),
    top: GL_CY + GL_R * Math.sin(r),
  };
}

function Flange() {
  return (
    <span className="absolute top-1/2 grid h-[30px] w-[30px] -translate-y-1/2 place-items-center rounded-full border-2 border-paper/25 bg-[#1a1610] shadow-[0_0_0_4px_rgba(18,16,13,0.9)]">
      <span className="h-[12px] w-[12px] rounded-full border border-accent/50 bg-accent/15" />
    </span>
  );
}

export function ConduitsGlass() {
  return (
    <Reveal delay={0.2} className="mx-auto mt-6 w-full px-4">
      <div className="mx-auto w-fit origin-top max-[860px]:scale-[0.8] max-[860px]:-mb-[124px] max-[680px]:scale-[0.6] max-[680px]:-mb-[248px] max-[500px]:scale-[0.44] max-[500px]:-mb-[347px]">
        <div className="relative" style={{ width: GL_W, height: GL_H }}>
          {SURFACES.map((s, i) => (
            <div
              key={s.label}
              className="absolute left-1/2 top-1/2 h-[40px] origin-left overflow-hidden rounded-full border border-paper/[0.18] [background:linear-gradient(180deg,rgba(244,240,232,0.13),rgba(244,240,232,0.02)_38%,rgba(0,0,0,0.4))] shadow-[inset_0_2px_6px_rgba(0,0,0,0.55),0_14px_34px_-14px_rgba(0,0,0,0.85)]"
              style={{
                width: GL_TUBE_LEN,
                transform: `translateY(-50%) rotate(${GL_ANGLES[i]}deg) translateX(${GL_TUBE_IN}px)`,
              }}
            >
              {/* ambient glow inside the glass, then the glossy streak */}
              <span className="absolute inset-0 rounded-full bg-[radial-gradient(closest-side,rgba(187,74,35,0.2),transparent_82%)]" />
              <span className="absolute inset-x-3 top-[6px] h-[7px] rounded-full bg-white/10 blur-[1.5px]" />

              {/* outbound slug — liquid light with a tail */}
              <span
                className="absolute top-1/2 h-[20px] w-[44px] -translate-y-1/2 animate-[spokeout_7s_infinite_both] rounded-full bg-[linear-gradient(90deg,#bb4a23,#f4a381)] shadow-[0_0_20px_rgba(244,163,129,0.9)]"
                style={{ animationDelay: s.delay }}
              >
                <span className="absolute right-[82%] top-1/2 h-[8px] w-[54px] -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,transparent,rgba(224,118,79,0.6))] blur-[2px]" />
              </span>
              {/* the glare riding the glass above it */}
              <span
                className="absolute top-1/2 h-[30px] w-[64px] -translate-y-1/2 animate-[spokeout_7s_infinite_both] rounded-full bg-white/15 blur-md"
                style={{ animationDelay: s.delay }}
              />
              {/* the reply, cooler and quieter */}
              <span
                className="absolute top-1/2 h-[20px] w-[44px] -translate-y-1/2 animate-[spokein_7s_infinite_both] rounded-full bg-[linear-gradient(90deg,#efe4d4,#8c8273)] shadow-[0_0_18px_rgba(244,240,232,0.6)]"
                style={{ animationDelay: s.delay }}
              >
                <span className="absolute left-[82%] top-1/2 h-[8px] w-[54px] -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,rgba(244,240,232,0.55),transparent)] blur-[2px]" />
              </span>
            </div>
          ))}

          {/* flanges live outside the tubes so the overflow clip can't eat
              them */}
          {SURFACES.map((s, i) => (
            <div
              key={`flange-${s.label}`}
              className="pointer-events-none absolute left-1/2 top-1/2 h-[40px] origin-left"
              style={{
                width: GL_TUBE_LEN,
                transform: `translateY(-50%) rotate(${GL_ANGLES[i]}deg) translateX(${GL_TUBE_IN}px)`,
              }}
            >
              <span className="absolute -left-[15px] top-0 h-full">
                <Flange />
              </span>
              <span className="absolute -right-[15px] top-0 h-full">
                <Flange />
              </span>
            </div>
          ))}

          {SURFACES.map((s, i) => (
            <div
              key={`card-${s.label}`}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={glPos(GL_ANGLES[i])}
            >
              <ProSurfaceCard {...s} angle={GL_ANGLES[i]} />
            </div>
          ))}

          <div
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: GL_CX, top: GL_CY }}
          >
            <CoreOrb {...coreSpokes(GL_ANGLES)} />
          </div>
        </div>
      </div>
      <div className="mt-3 text-center font-mono text-[10.5px] tracking-[0.14em] text-paper/40">
        PEOPLE · EVENTS · GROUPS — LOADED BOTH WAYS
      </div>
    </Reveal>
  );
}
