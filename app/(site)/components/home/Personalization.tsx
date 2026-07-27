import { Glow, SectionHead } from "@/app/(site)/components/ui";
import SectionReveal from "@/components/reveal-animations/SectionReveal";
import PersonalizationDemo from "@/app/(site)/components/home/PersonalizationDemo";

/* The engine section. PersonalizationDemo carries the device toggle and
   the sign-in loop — see it for the visual itself. */
export default function Personalization() {
  return (
    <section
      id="engine"
      className="relative scroll-mt-[88px] overflow-hidden px-6 pb-14 pt-24 text-center max-[920px]:pt-16"
    >
      <Glow className="left-1/2 top-0 h-[720px] w-[1150px] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(187,74,35,0.24),rgba(187,74,35,0.06)_55%,transparent_78%)]" />
      <div className="relative">
        <SectionReveal>
          <SectionHead
            animate
            kicker="01 // The engine"
            title={"Personalization,\nlike never before."}
            sub="Members sign in — and the whole site & app rearranges around them. Their name, their group, their giving, **their one clear next step.**"
            titleClassName="text-[clamp(38px,5vw,64px)]"
            subClassName="max-w-[34em]"
          />
        </SectionReveal>
        <PersonalizationDemo />
      </div>
    </section>
  );
}
