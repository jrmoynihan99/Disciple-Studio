import Reveal from "@/components/reveal-animations/Reveal";

const NAMES = [
  "Planning Center",
  "Church Community Builder",
  "Rock RMS",
  "Breeze",
  "MinistryPlatform",
  "Tithe.ly",
  "Subsplash",
];

function Row() {
  return (
    <span className="inline-flex">
      {NAMES.map((n) => (
        <span
          key={n}
          className="inline-flex items-center gap-[22px] px-[22px] font-mono text-[13.5px] text-paper/55"
        >
          {n} <i className="not-italic text-accent opacity-60">✦</i>
        </span>
      ))}
    </span>
  );
}

export default function Integrations() {
  return (
    <Reveal>
      <div className="overflow-hidden border-y border-paper/[0.07] bg-[#0f0d0a] py-5 [-webkit-mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)] [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
        <div className="inline-flex animate-[marq_42s_linear_infinite] whitespace-nowrap">
          <Row />
          <Row />
        </div>
      </div>
    </Reveal>
  );
}
