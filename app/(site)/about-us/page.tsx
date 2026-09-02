import type { Metadata } from "next";
import { DATA } from "@/app/data";
import Nav from "@/app/(site)/components/Nav";
import FinalCTA from "@/app/(site)/components/FinalCTA";
import Story from "./components/Story";
import Values from "./components/Values";
import Team from "./components/Team";

export const metadata: Metadata = {
  title: "About Us — Disciple Studio",
  description:
    "Meet Jason and Arjun — two disciples building custom websites for the local church.",
};

const MEMBER_DEMO_URL =
  "https://www.aletheia.org/demo?k=a557d77fe749fddba7b92e37";

export default function AboutUsPage() {
  const cta = DATA.aboutUs.cta;
  return (
    <>
      <Nav active="/about-us" />
      <main>
        <Story />
        <Values />
        <Team />
      </main>
      <FinalCTA
        title={cta.title[0]}
        titleEm={cta.title[1]}
        sub={cta.sub}
        demoHref={MEMBER_DEMO_URL}
        links={[
          { label: "The Website", href: "/website" },
          { label: "The App", href: "/app" },
          { label: "The CMS", href: "/cms" },
        ]}
      />
    </>
  );
}
