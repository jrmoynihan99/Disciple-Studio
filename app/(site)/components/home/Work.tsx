import Image from "next/image";
import { Btn, TrafficLights } from "@/components/ui";
import { DemoLabel, Glow, SectionHead } from "@/app/(site)/components/ui";
import SectionReveal from "@/components/reveal-animations/SectionReveal";
import Reveal from "@/components/reveal-animations/Reveal";
import GlowReveal from "@/components/reveal-animations/GlowReveal";
import { LIVE_SITE_URL, MEMBER_DEMO_URL } from "./urls";

export default function Work() {
  return (
    <section
      id="work"
      className="relative scroll-mt-[88px] overflow-hidden px-6 pb-[30px] pt-[150px] text-center max-[920px]:pt-24"
    >
      <Glow className="left-1/2 top-[-20px] h-[640px] w-[1100px] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(187,74,35,0.2),rgba(187,74,35,0.05)_55%,transparent_78%)]" />
      <div className="relative">
        <SectionReveal>
          <SectionHead
            animate
            kicker="05 // The work"
            title="Our latest build is live."
            sub="A ground-up discipleship engine built for Aletheia Church — website, app, CMS, and deep ChMS integration."
            subClassName="max-w-[30em]"
          />
          <Reveal
            delay={0.65}
            className="mt-[34px] flex flex-wrap justify-center gap-3.5"
          >
            <Btn href={LIVE_SITE_URL} target="_blank" rel="noreferrer">
              Visit live site {"↗"}
            </Btn>
            <Btn
              variant="ghostLight"
              href={MEMBER_DEMO_URL}
              target="_blank"
              rel="noreferrer"
            >
              <DemoLabel />
            </Btn>
          </Reveal>
        </SectionReveal>
        <GlowReveal
          delay={0.1}
          className="group relative mx-auto mt-[70px] w-[min(1000px,100%)]"
          glow={
            /* Backdrop glow — same construction as the personalization visual: a
               blurred outline (no fill, so nothing washes through the frame as it
               fades out) on its own layer, since a mask would clip it along with
               the frame. Dialed back here so it doesn't compete with the
               screenshot's own brightness. */
            <div
              aria-hidden
              className="pointer-events-none absolute -left-28 -right-28 -top-24 bottom-0 opacity-60 transition-opacity duration-500 [-webkit-mask-image:linear-gradient(to_bottom,#000_58%,transparent_93%)] [-webkit-mask-repeat:no-repeat] [mask-image:linear-gradient(to_bottom,#000_58%,transparent_93%)] [mask-repeat:no-repeat] group-hover:opacity-80"
            >
              <div className="absolute inset-x-28 -bottom-72 top-24 rounded-[44px] border-[30px] border-accent blur-[26px]" />
            </div>
          }
        >
          <div className="relative rounded-[30px] border border-paper/15 bg-paper/[0.03] p-3 transition-colors duration-500 [-webkit-mask-image:linear-gradient(to_bottom,#000_55%,transparent_98%)] [mask-image:linear-gradient(to_bottom,#000_55%,transparent_98%)] group-hover:border-paper/25">
            <div className="overflow-hidden rounded-[22px] border border-paper/10 bg-[#1a1611]">
              <div className="flex items-center gap-1.5 border-b border-paper/[0.09] px-[18px] py-[13px] font-mono text-[11px] text-paper/45">
                <TrafficLights small />
                <span className="ml-2">aletheia.org</span>
              </div>
              <Image
                src="/AletheiaScreenshot.JPG"
                alt="Aletheia Church website"
                width={1920}
                height={1080}
                className="block h-auto w-full"
              />
            </div>
          </div>
          <Reveal
            delay={0.5}
            className="absolute -right-9 bottom-9 z-[2] w-[350px] max-[860px]:static max-[860px]:mt-6 max-[860px]:w-full"
          >
            <div className="rounded-[18px] border border-paper/[0.13] bg-[#1f1a14] px-[26px] py-6 text-left shadow-[0_40px_90px_-35px_rgba(0,0,0,0.95)]">
              <div className="font-serif text-[19px] italic leading-[1.4] tracking-[-0.01em]">
                {"“"}They didn{"’"}t just build us a website — they built a
                front door and a discipleship pathway in one.{"”"}
              </div>
              <div className="mt-4 flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[#3a332a] text-[11px] font-bold">
                  A
                </span>
                <div>
                  <div className="text-[13px] font-semibold">
                    Aletheia Church
                  </div>
                  <div className="font-mono text-[10px] text-paper/50">
                    BOSTON, MA
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </GlowReveal>
      </div>
    </section>
  );
}
