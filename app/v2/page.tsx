import { V2 } from "@/app/v2/data";
import { ChurchNameProvider } from "@/app/v2/church-name";
import TopBar from "@/app/v2/components/TopBar";
import Hero from "@/app/v2/components/Hero";
import Chapter, {
  Cms,
  DiagramAfter,
  DiagramBefore,
  Shots,
} from "@/app/v2/components/Chapter";
import ChapterDisciple from "@/app/v2/components/ChapterDisciple";
import Showcase from "@/app/v2/components/Showcase";
import Mirror from "@/app/v2/components/Mirror";
import Offer from "@/app/v2/components/Offer";
import Pricing from "@/app/v2/components/Pricing";
import Founders from "@/app/v2/components/Founders";
import FinalCTA from "@/app/v2/components/FinalCTA";

export default function V2Page() {
  return (
    <ChurchNameProvider>
      <TopBar />
      <main>
        <Hero />
        <Chapter ch={V2.chapters[0]} />
        <Chapter
          ch={V2.chapters[1]}
          art={<Shots />}
          receipt={V2.receipts.site}
          cta={V2.demos.site}
          arrow={1}
        />
        <Chapter
          ch={V2.chapters[2]}
          art={<Cms />}
          receipt={V2.receipts.cms}
          cta={V2.demos.cms}
          arrow={2}
        />
        <Chapter
          ch={V2.chapters[3]}
          splitAt={2}
          art={<DiagramBefore />}
          art2={<DiagramAfter />}
          receipt={V2.receipts.sync}
          arrow={3}
        />
        <ChapterDisciple ch={V2.chapters[4]} cta={V2.demos.member} />
        <Showcase />
        <Mirror />
        <Offer />
        <Pricing />
        <Founders />
        <FinalCTA />
      </main>
    </ChurchNameProvider>
  );
}
