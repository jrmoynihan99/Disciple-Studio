import type { Metadata } from "next";
import Nav from "@/app/(site)/components/Nav";
import FinalCTA from "@/app/(site)/components/FinalCTA";
import Hero from "./components/Hero";
import LoginDemo from "./components/LoginDemo";
import MemberRail from "./components/MemberRail";
import Features from "./components/Features";
import { MEMBER_DEMO_URL } from "./components/urls";

export const metadata: Metadata = {
  title: "Disciple Studio — The Website",
  description:
    "No templates. We design your church’s site from scratch — a warm front door for guests, and a personal tool for every member who signs in.",
};

export default function WebsitePage() {
  return (
    <>
      <Nav active="/website" />
      <main>
        <Hero />
        <LoginDemo />
        <MemberRail />
        <Features />
      </main>
      <FinalCTA
        title="Want a front door"
        titleEm="that disciples?"
        demoHref={MEMBER_DEMO_URL}
        links={[
          { label: "The App", href: "/app" },
          { label: "The Backend", href: "/backend" },
        ]}
      />
    </>
  );
}
