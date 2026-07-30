import type { Metadata } from "next";
import Nav from "@/app/(site)/components/Nav";
import FinalCTA from "@/app/(site)/components/FinalCTA";
import Hero from "./components/Hero";
import PublishDemo from "./components/PublishDemo";
import EngineRoom from "./components/EngineRoom";
import StaffFeatures from "./components/StaffFeatures";
import { MEMBER_DEMO_URL } from "./components/urls";

export const metadata: Metadata = {
  title: "Disciple Studio — The CMS",
  description:
    "A streamlined CMS that publishes to your website and app at once, sends targeted messages, and shows where every member is in their journey. All synced with your ChMS, so most of it never has to be entered at all.",
};

export default function CmsPage() {
  return (
    <>
      <Nav active="/cms" />
      <main>
        <Hero />
        <PublishDemo />
        <EngineRoom />
        <StaffFeatures />
      </main>
      <FinalCTA
        title="Want a backend"
        titleEm="your staff loves?"
        demoHref={MEMBER_DEMO_URL}
        links={[
          { label: "The Website", href: "/website" },
          { label: "The App", href: "/app" },
        ]}
      />
    </>
  );
}
