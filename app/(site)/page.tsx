import type { Metadata } from "next";
import Nav from "@/app/(site)/components/Nav";
import Hero from "@/app/(site)/components/home/Hero";
import Personalization from "@/app/(site)/components/home/Personalization";
import EngineFeatures from "@/app/(site)/components/home/EngineFeatures";
import Vehicles from "@/app/(site)/components/home/Vehicles";
import Fuel from "@/app/(site)/components/home/Fuel";
import Integrations from "@/app/(site)/components/home/Integrations";
import Work from "@/app/(site)/components/home/Work";
import About from "@/app/(site)/components/home/About";
import Closing from "@/app/(site)/components/home/Closing";

export const metadata: Metadata = {
  title: "Disciple Studio — A digital ecosystem, built to disciple.",
  description:
    "Know every member. Move every one. A complete discipleship engine that knows each person in your church, makes their next step clear, and helps them take it.",
};

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Personalization />
        <EngineFeatures />
        <Vehicles />
        <Fuel />
        <Integrations />
        <Work />
        <About />
      </main>
      <Closing />
    </>
  );
}
