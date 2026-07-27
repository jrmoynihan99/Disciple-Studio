import { Glow, SectionHead } from "@/app/(site)/components/ui";
import { SyncRelayGlass } from "@/app/(site)/components/home/FuelVisuals";
import SectionReveal from "@/components/reveal-animations/SectionReveal";

/* ——— the fuel: 2-way ChMS sync ———
   The relay in glass won the visual bake-off; the picker and the two
   alternates it compared against are in app/_archive. */

export default function Fuel() {
  return (
    <section className="relative px-6 pb-[130px] pt-[140px] text-center max-[920px]:pb-20 max-[920px]:pt-20">
      <Glow className="left-1/2 top-[40px] h-[500px] w-[900px] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(187,74,35,0.16),transparent_75%)]" />
      <SectionReveal className="relative">
        <SectionHead
          animate
          kicker="04 // The fuel"
          title={"Fueled by the software\nyou already run."}
          sub="A custom two-way sync with your ChMS. Every profile, group, and step — one source of truth."
          subClassName="max-w-[26em]"
        />
        <SyncRelayGlass />
      </SectionReveal>
    </section>
  );
}
