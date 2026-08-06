import type { Metadata } from "next";
import Nav from "@/app/(site)/components/Nav";
import FinalCTA from "@/app/(site)/components/FinalCTA";
import { Arrow } from "@/components/ui";
import { MEMBER_DEMO_URL } from "@/app/(site)/components/home/urls";
import ThanksHero from "../components/ThanksHero";

/* Standalone confirmation page. /book lands here via history.replaceState
   the moment Calendly reports a booking, so refreshes keep the confirmation;
   it also works as a Calendly redirect target if we ever turn that on. */

export const metadata: Metadata = {
  title: "You’re booked — Disciple Studio",
  description:
    "Your call is on the calendar — check your inbox for the invite.",
  robots: { index: false },
};

export default function BookThanksPage() {
  return (
    <>
      <Nav active="/book" />
      <main>
        <ThanksHero />
      </main>
      <FinalCTA
        title="Want the full tour"
        titleEm="before we talk?"
        primary={{
          href: "/",
          label: (
            <>
              Take the tour <Arrow />
            </>
          ),
        }}
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
