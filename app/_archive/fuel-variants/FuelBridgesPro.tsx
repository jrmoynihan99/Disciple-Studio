import Reveal from "@/components/reveal-animations/Reveal";

/* ════════════════════════════════════════════════════════════════
   FuelBridgesPro — the chasm: the church's ChMS on one side, the
   Discipleship Engine on the other, three lanes of records crossing
   between them, pushed into real depth.

   The three lanes sit at different depths and only the middle one is
   in focus — the front and back lanes blur like a shallow depth of
   field. Fog drifts behind, dust motes hang in the air, and each slab
   blooms and reflects into the pit below it.

   Same rules as FuelVisuals.tsx: never name the ChMS vendor, and the
   scene must read without any of its text.
   ════════════════════════════════════════════════════════════════ */

function Caption({ children }: { children: string }) {
  return (
    <div className="mt-6 text-center font-mono text-[10.5px] tracking-[0.14em] text-paper/40">
      {children}
    </div>
  );
}

/* Depth classes are written out in full for Tailwind's scanner. The blur
   on a lane blurs its chips with it, which is the point — the whole lane
   is out of the focal plane, not just its container. */
const CHASM_LANES = [
  {
    name: "GROUPS",
    out: "Families North",
    back: "2 seats claimed",
    goCls: "animate-[lanego_6.8s_linear_infinite]",
    backCls: "animate-[laneback_6.8s_linear_3.4s_infinite_both]",
    depth:
      "[transform:translateZ(-110px)] blur-[2.5px] opacity-60 max-[900px]:[transform:none] max-[900px]:blur-none max-[900px]:opacity-100",
  },
  {
    name: "EVENTS",
    out: "Baptism Sunday · Aug 9",
    back: "12 RSVPs tonight",
    goCls: "animate-[lanego_6s_linear_infinite]",
    backCls: "animate-[laneback_6s_linear_3s_infinite_both]",
    depth: "",
  },
  {
    name: "PEOPLE",
    out: "Marcus · new profile",
    back: "Sarah · baptized ✓",
    goCls: "animate-[lanego_5.4s_linear_infinite]",
    backCls: "animate-[laneback_5.4s_linear_2.7s_infinite_both]",
    depth:
      "[transform:translateZ(85px)] blur-[1.2px] opacity-95 max-[900px]:[transform:none] max-[900px]:blur-none max-[900px]:opacity-100",
  },
];

const CHASM_CHIP =
  "absolute top-1/2 z-[2] -translate-y-1/2 whitespace-nowrap rounded-full border px-[12px] py-[5px] text-[10.5px] font-semibold shadow-[0_12px_26px_-12px_rgba(0,0,0,0.9)]";

/* Motes: left%, top px, size px, blur, duration, delay. */
const MOTES: [number, number, number, string, string][] = [
  [16, 30, 3, "blur-[1px]", "animate-[dustfloat_7s_ease-in-out_infinite]"],
  [30, 150, 4, "blur-[2px]", "animate-[dustfloat_9s_ease-in-out_1.2s_infinite]"],
  [48, 60, 3, "blur-[1px]", "animate-[dustfloat_8s_ease-in-out_2.4s_infinite]"],
  [58, 190, 5, "blur-[2px]", "animate-[dustfloat_10s_ease-in-out_0.6s_infinite]"],
  [72, 40, 3, "blur-[1px]", "animate-[dustfloat_7.5s_ease-in-out_3s_infinite]"],
  [86, 130, 4, "blur-[2px]", "animate-[dustfloat_9.5s_ease-in-out_1.8s_infinite]"],
];

function ChasmSlab({ accent }: { accent: boolean }) {
  const rows = accent
    ? ["Website", "App", "CMS"]
    : ["People · 542", "Events · 11", "Groups · 24"];
  return (
    <div className="relative">
      {/* bloom behind the slab */}
      <span
        aria-hidden
        className={`pointer-events-none absolute -inset-7 rounded-[30px] blur-2xl ${
          accent ? "bg-accent/25" : "bg-paper/[0.07]"
        }`}
      />
      <div
        className={`relative w-[240px] rounded-2xl px-5 py-[19px] text-left [background:linear-gradient(160deg,#251d15,#16120e_55%,#12100c)] ${
          accent
            ? "border-[1.5px] border-accent/50 shadow-[0_60px_120px_-45px_rgba(0,0,0,0.95),0_34px_80px_-40px_rgba(187,74,35,0.5),inset_0_1px_0_rgba(244,240,232,0.09)]"
            : "border border-paper/[0.14] shadow-[0_60px_120px_-45px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(244,240,232,0.09)]"
        }`}
      >
        <b className="block font-serif text-[18px] font-medium">
          {accent ? "Discipleship Engine" : "Your ChMS"}
        </b>
        <div className="mt-3.5 flex flex-col gap-[9px] text-[12.5px] font-semibold">
          {rows.map((t) => (
            <span key={t} className="flex items-center gap-[9px]">
              <span
                className={
                  accent
                    ? "h-[7px] w-[7px] animate-pulse-dot rounded-full bg-accent"
                    : "h-1.5 w-1.5 rounded-full bg-accent"
                }
              />
              {t}
            </span>
          ))}
        </div>
      </div>
      {/* reflection into the chasm — a blurred echo, not a mirror copy */}
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-x-2 top-full mt-[14px] h-[76px] rounded-2xl blur-[4px] [mask-image:linear-gradient(180deg,rgba(0,0,0,0.5),transparent_85%)] [-webkit-mask-image:linear-gradient(180deg,rgba(0,0,0,0.5),transparent_85%)] ${
          accent
            ? "bg-[linear-gradient(180deg,rgba(187,74,35,0.35),transparent)]"
            : "bg-[linear-gradient(180deg,rgba(244,240,232,0.18),transparent)]"
        }`}
      />
    </div>
  );
}

export function BridgeChasm() {
  return (
    <Reveal delay={0.2} className="mx-auto mt-14 w-full max-w-[1080px] px-4">
      <div className="relative [perspective:1200px]">
        {/* fog banks drifting through the gap */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-[14%] top-[-40px] h-[240px] w-[420px] animate-[fogdrift_13s_ease-in-out_infinite] rounded-full bg-[radial-gradient(closest-side,rgba(187,74,35,0.14),transparent_75%)] blur-2xl"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute right-[10%] top-[10px] h-[220px] w-[380px] animate-[fogdrift_17s_ease-in-out_4s_infinite_reverse] rounded-full bg-[radial-gradient(closest-side,rgba(244,240,232,0.08),transparent_75%)] blur-2xl"
        />

        {/* the floor grid, and the glow rising out of the chasm */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-[-12%] bottom-[-70px] h-[280px] [background:repeating-linear-gradient(90deg,rgba(244,240,232,0.09)_0_1px,transparent_1px_46px),repeating-linear-gradient(0deg,rgba(244,240,232,0.09)_0_1px,transparent_1px_46px)] [mask-image:radial-gradient(closest-side,#000,transparent)] [transform:perspective(600px)_rotateX(72deg)] [-webkit-mask-image:radial-gradient(closest-side,#000,transparent)]"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-[-46px] left-1/2 h-[110px] w-[64%] -translate-x-1/2 rounded-[100%] bg-[radial-gradient(closest-side,rgba(187,74,35,0.28),transparent_75%)] blur-xl"
        />

        {/* dust hanging in the air, at mixed focus */}
        {MOTES.map(([l, t, s, blurCls, animCls]) => (
          <span
            key={`${l}-${t}`}
            aria-hidden
            className={`pointer-events-none absolute rounded-full bg-accent-glow ${blurCls} ${animCls}`}
            style={{ left: `${l}%`, top: t, width: s, height: s }}
          />
        ))}

        <div className="relative flex items-center justify-center [transform-style:preserve-3d] max-[900px]:flex-col max-[900px]:items-center max-[900px]:gap-6">
          <div className="shrink-0 [transform:rotateY(26deg)_rotateX(4deg)] max-[900px]:[transform:none]">
            <ChasmSlab accent={false} />
          </div>

          <div className="mx-[-16px] flex min-w-0 flex-1 flex-col justify-center gap-[18px] py-2 [transform:rotateX(9deg)] [transform-style:preserve-3d] max-[900px]:mx-0 max-[900px]:w-full max-[900px]:max-w-[380px] max-[900px]:[transform:none]">
            {CHASM_LANES.map((l) => (
              <div
                key={l.name}
                className={`relative h-[42px] overflow-hidden rounded-full border border-paper/[0.09] [background:linear-gradient(180deg,rgba(244,240,232,0.05),rgba(0,0,0,0.3))] shadow-[inset_0_2px_8px_rgba(0,0,0,0.55)] ${l.depth}`}
              >
                <span className="absolute inset-0 grid place-items-center font-mono text-[9px] tracking-[0.22em] text-paper/20">
                  {l.name}
                </span>
                <span className="absolute inset-x-4 top-1/2 h-px -translate-y-1/2 animate-[flow_1.1s_linear_infinite] bg-[repeating-linear-gradient(90deg,rgba(187,74,35,0.4)_0_7px,transparent_7px_16px)]" />
                <span
                  className={`${CHASM_CHIP} border-paper/[0.16] bg-[#2a241d] text-paper shadow-[0_12px_26px_-12px_rgba(0,0,0,0.9),0_0_18px_rgba(187,74,35,0.2)] ${l.goCls}`}
                >
                  <span
                    aria-hidden
                    className="absolute right-full top-1/2 mr-1.5 h-[2px] w-12 -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,transparent,rgba(244,163,129,0.7))]"
                  />
                  {l.out} {"→"}
                </span>
                <span
                  className={`${CHASM_CHIP} border-accent/50 bg-[#2a241d] text-paper shadow-[0_12px_26px_-12px_rgba(0,0,0,0.9),0_0_18px_rgba(244,163,129,0.25)] ${l.backCls}`}
                >
                  <span
                    aria-hidden
                    className="absolute left-full top-1/2 ml-1.5 h-[2px] w-12 -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,rgba(244,240,232,0.7),transparent)]"
                  />
                  {"←"} {l.back}
                </span>
              </div>
            ))}
          </div>

          <div className="shrink-0 [transform:rotateY(-26deg)_rotateX(4deg)] max-[900px]:[transform:none]">
            <ChasmSlab accent />
          </div>
        </div>
      </div>
      <Caption>
        PEOPLE · EVENTS · GROUPS — MOVING BOTH WAYS, ALL DAY
      </Caption>
    </Reveal>
  );
}
