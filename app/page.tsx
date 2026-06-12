import Nav from "@/app/components/Nav";
import HeroSwitcher from "@/app/components/hero-variants/HeroSwitcher";
import TwoJobs from "@/app/components/TwoJobs";
import Problem from "@/app/components/Problem";
import Features from "@/app/components/Features";
import Discipleship from "@/app/components/Discipleship";
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
        <HeroSwitcher />
        <Problem />
        {/* <TwoJobs /> */}
        <Features />
        <Discipleship />
        <Showcase />
        <Backends />
        <Pricing />
        <FinalCTA />
        <Founders />
      </main>
      <Footer />
    </>
  );
}
