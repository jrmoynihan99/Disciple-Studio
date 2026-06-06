import Nav from "@/app/components/Nav";
import Hero from "@/app/components/Hero";
import TwoJobs from "@/app/components/TwoJobs";
import Problem from "@/app/components/Problem";
import Features from "@/app/components/Features";
import Showcase from "@/app/components/Showcase";
import Backends from "@/app/components/Backends";
import Founders from "@/app/components/Founders";
import Pricing from "@/app/components/Pricing";
import FinalCTA from "@/app/components/FinalCTA";
import Footer from "@/app/components/Footer";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Problem />
        <TwoJobs />
        <Features />
        <Showcase />
        <Backends />
        <Founders />
        <Pricing />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
