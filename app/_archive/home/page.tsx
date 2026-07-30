import Nav from "@/app/_archive/components/Nav";
import Hero from "@/app/_archive/components/hero-variants/HeroFaces";
import WhatYouGet from "@/app/_archive/components/WhatYouGet";
import TwoJobs from "@/app/_archive/components/TwoJobs";
import Problem from "@/app/_archive/components/Problem";
import Features from "@/app/_archive/components/Features";
import Discipleship from "@/app/_archive/components/Discipleship";
import Showcase from "@/app/_archive/components/Showcase";
import Backends from "@/app/_archive/components/Backends";
import Founders from "@/app/_archive/components/Founders";
import Pricing from "@/app/_archive/components/Pricing";
import FinalCTA from "@/app/_archive/components/FinalCTA";
import Footer from "@/app/_archive/components/Footer";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        {/*<WhatYouGet />*/}
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
