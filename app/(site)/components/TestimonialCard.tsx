/* Adam Mabry's testimonial — one source of truth, shown floating over the
   Work screenshot and beside the booking calendar. His words verbatim.
   The opening line carries as the serif pull-quote; the rest runs at body
   size under it so the whole thing reads at either width. */
const LEAD =
  "What we got with Jason was more than help building a pretty website.";
const REST =
  "We got a man passionate about discipleship and passionate about using whatever digital tools we have to make disciples and fulfill the Great Commission. I’d recommend any church serious about making disciples work with him and his team.";

export default function TestimonialCard({
  className = "",
}: {
  className?: string;
}) {
  return (
    <figure
      className={`rounded-[18px] border border-paper/[0.13] bg-[#1f1a14] px-[26px] py-6 text-left shadow-[0_40px_90px_-35px_rgba(0,0,0,0.95)] ${className}`}
    >
      <blockquote>
        <p className="font-serif text-[19px] italic leading-[1.4] tracking-[-0.01em]">
          {`“${LEAD}`}
        </p>
        <p className="pt-3 text-[14.5px] leading-[1.6] text-paper/70">
          {`${REST}”`}
        </p>
      </blockquote>
      <figcaption className="mt-4 flex items-center gap-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#3a332a] text-[11px] font-bold">
          A
        </span>
        <div>
          <div className="text-[13px] font-semibold">Adam Mabry</div>
          <div className="font-mono text-[10px] text-paper/50">
            SENIOR PASTOR {"·"} ALETHEIA CHURCH
          </div>
        </div>
      </figcaption>
    </figure>
  );
}
