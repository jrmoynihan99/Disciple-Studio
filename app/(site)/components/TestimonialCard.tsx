/* The Aletheia quote card — one source of truth for the testimonial, shown
   floating over the Work screenshot and beside the booking calendar. */
export default function TestimonialCard({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`rounded-[18px] border border-paper/[0.13] bg-[#1f1a14] px-[26px] py-6 text-left shadow-[0_40px_90px_-35px_rgba(0,0,0,0.95)] ${className}`}
    >
      <div className="font-serif text-[19px] italic leading-[1.4] tracking-[-0.01em]">
        {"“"}They didn{"’"}t just build us a website — they built a front door
        and a discipleship pathway in one.{"”"}
      </div>
      <div className="mt-4 flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-[#3a332a] text-[11px] font-bold">
          A
        </span>
        <div>
          <div className="text-[13px] font-semibold">Aletheia Church</div>
          <div className="font-mono text-[10px] text-paper/50">BOSTON, MA</div>
        </div>
      </div>
    </div>
  );
}
