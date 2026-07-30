import type { Metadata } from "next";
import Nav from "@/app/(site)/components/Nav";
import FinalCTA from "@/app/(site)/components/FinalCTA";
import Hero from "./components/Hero";
import LoginDemo from "./components/LoginDemo";
import EngineRail from "./components/EngineRail";
import Features from "./components/Features";
import { MEMBER_DEMO_URL } from "./components/urls";

export const metadata: Metadata = {
  title: "Disciple Studio — The App",
  description:
    "A real native app for iOS & Android — everything your website has, built for the phone, with the engine’s nudge at just the right moment.",
};

export default function AppPage() {
  return (
    <>
      <Nav active="/app" />
      <main>
        <Hero />
        <LoginDemo />
        <EngineRail />
        <Features />
      </main>
      <FinalCTA
        title="Want your church"
        titleEm="in their pocket?"
        demoHref={MEMBER_DEMO_URL}
        links={[
          { label: "The Website", href: "/website" },
          { label: "The CMS", href: "/cms" },
        ]}
      />
    </>
  );
}
