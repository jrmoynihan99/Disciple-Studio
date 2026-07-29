/* Targeted-message demo: a cursor picks two audience filters, the match
   count climbs 64 → 108, then Send runs through sending → sent.

   Shared by the home engine rail and the CMS engine room. The cursor
   keyframes below travel by tuned pixel offsets, so both hosts have to
   render this at the same ScrollFeatureRail stage width — it is not a
   drop-anywhere component. Renders the panel *contents*; each host
   wraps it in its own Panel. */

const KEYFRAMES = `
/* 7s loop: cursor visits chip 1 -> chip 2 -> send, then the button
   runs send -> sending -> sent before the reset */
@keyframes rccur{
  0%,1%{opacity:0;transform:translate(-464px,-101px)}
  3%{opacity:1;transform:translate(-464px,-101px)}
  6%{transform:translate(-464px,-101px) scale(1)}
  7%{transform:translate(-464px,-101px) scale(.8)}
  9%{transform:translate(-464px,-101px) scale(1)}
  17%{transform:translate(-345px,-101px)}
  19%{transform:translate(-345px,-101px) scale(.8)}
  21%{transform:translate(-345px,-101px) scale(1)}
  30%{transform:translate(0,0)}
  32%{transform:translate(0,0) scale(.8)}
  34%{opacity:1;transform:translate(0,0) scale(1)}
  38%,100%{opacity:0;transform:translate(0,0)}
}
@keyframes rcsel1{
  0%,8%{background:rgba(244,240,232,0);color:rgba(244,240,232,0.55)}
  10%,90%{background:rgba(244,240,232,0.14);color:#f4f0e8}
  95%,100%{background:rgba(244,240,232,0);color:rgba(244,240,232,0.55)}
}
@keyframes rcsel2{
  0%,20%{background:rgba(244,240,232,0);color:rgba(244,240,232,0.55)}
  22%,90%{background:rgba(244,240,232,0.14);color:#f4f0e8}
  95%,100%{background:rgba(244,240,232,0);color:rgba(244,240,232,0.55)}
}
@keyframes rcshow{0%,9%{opacity:0}11%,90%{opacity:1}95%,100%{opacity:0}}
@keyframes rccnt1{0%,9%{opacity:0}11%,20%{opacity:1}22%,100%{opacity:0}}
@keyframes rccnt2{0%,21%{opacity:0}23%,90%{opacity:1}95%,100%{opacity:0}}
@keyframes rcsend{0%,31%{background:#bb4a23}33%{background:#8a3418}35%,100%{background:#bb4a23}}
@keyframes rcbl1{0%,32%{opacity:1}34%,94%{opacity:0}98%,100%{opacity:1}}
@keyframes rcbl2{0%,33%{opacity:0}35%,55%{opacity:1}57%,100%{opacity:0}}
@keyframes rcbl3{0%,56%{opacity:0}58%,90%{opacity:1}95%,100%{opacity:0}}
`;

function Cursor({ className = "" }: { className?: string }) {
  return (
    <span className={`pointer-events-none absolute z-[5] ${className}`}>
      <svg width="19" height="19" viewBox="0 0 24 24">
        <path
          d="M5 3l14 9-6 1.2-3.4 5.8L5 3z"
          fill="#f4f0e8"
          stroke="#1f1a14"
          strokeWidth="1.4"
        />
      </svg>
    </span>
  );
}

export default function TargetedMessagePanel() {
  return (
    <div className="relative">
      <style>{KEYFRAMES}</style>
      <div className="rounded-2xl bg-[#2a241d] px-4 py-3.5">
        <div className="flex items-center gap-[9px]">
          <span className="grid h-6 w-6 place-items-center rounded-[7px] bg-accent text-xs text-white">
            {"✝"}
          </span>
          <span className="text-[11.5px] font-semibold text-paper/80">
            GRACE FELLOWSHIP
          </span>
          <span className="ml-auto text-[11px] text-paper/50">now</span>
        </div>
        <b className="mt-[9px] block text-[14.5px]">
          Group Launch Night — Thursday
        </b>
        <span className="mt-0.5 block text-[13px] text-paper/65">
          Find your group before they fill up.
        </span>
      </div>
      <div className="mt-4 font-mono text-[10px] tracking-[0.12em] text-paper/50">
        TO
      </div>
      <div className="mt-[9px] flex flex-wrap gap-2">
        <span className="inline-flex items-center rounded-full px-[13px] py-[7px] text-[12.5px] font-semibold shadow-[inset_0_0_0_1px_rgba(244,240,232,0.22)] [animation:rcsel1_7s_infinite_both]">
          Not in a group
        </span>
        <span className="inline-flex items-center rounded-full px-[13px] py-[7px] text-[12.5px] font-semibold shadow-[inset_0_0_0_1px_rgba(244,240,232,0.22)] [animation:rcsel2_7s_infinite_both]">
          Joined this year
        </span>
        <span className="inline-flex items-center rounded-full px-[13px] py-[7px] text-[12.5px] font-semibold text-paper/40 shadow-[inset_0_0_0_1px_rgba(244,240,232,0.14)]">
          Cambridge campus
        </span>
        <span className="inline-flex items-center rounded-full px-[13px] py-[7px] text-[12.5px] font-semibold text-paper/40 shadow-[inset_0_0_0_1px_rgba(244,240,232,0.14)]">
          New believers
        </span>
      </div>
      <div className="mt-3 grid text-[13.5px] font-semibold text-accent-soft [animation:rcshow_7s_infinite_both]">
        <span className="col-start-1 row-start-1 flex items-center gap-[9px] [animation:rccnt1_7s_infinite_both]">
          <span className="h-[7px] w-[7px] animate-pulse-dot rounded-full bg-accent" />
          64 members match
        </span>
        <span className="col-start-1 row-start-1 flex items-center gap-[9px] [animation:rccnt2_7s_infinite_both]">
          <span className="h-[7px] w-[7px] animate-pulse-dot rounded-full bg-accent" />
          108 members match
        </span>
      </div>
      <div className="relative mt-[18px] flex justify-end">
        <span className="grid rounded-full bg-accent px-[17px] py-2.5 text-[13px] font-semibold text-white [animation:rcsend_7s_infinite_both]">
          <span className="col-start-1 row-start-1 inline-flex items-center justify-center gap-1.5 whitespace-nowrap [animation:rcbl1_7s_infinite_both]">
            Send to 108 {"→"}
          </span>
          <span className="col-start-1 row-start-1 inline-flex items-center justify-center gap-1.5 whitespace-nowrap [animation:rcbl2_7s_infinite_both]">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            Sending…
          </span>
          <span className="col-start-1 row-start-1 inline-flex items-center justify-center gap-1.5 whitespace-nowrap [animation:rcbl3_7s_infinite_both]">
            Sent to 108 {"✓"}
          </span>
        </span>
        <Cursor className="right-[46px] top-[16px] [animation:rccur_7s_infinite_both]" />
      </div>
    </div>
  );
}
