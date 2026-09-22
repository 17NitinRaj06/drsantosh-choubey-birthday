import Cover from "@/components/Cover";
import ChapterSection from "@/components/ChapterSection";
import ImpactSection from "@/components/ImpactSection";
import InstitutionsSection from "@/components/InstitutionsSection";
import LiteratureAwards from "@/components/LiteratureAwards";
import WordsOfAppreciation from "@/components/WordsOfAppreciation";
import GallerySection from "@/components/GallerySection";
import WishesWall from "@/components/WishesWall";
import Footer from "@/components/Footer";
import ChatStream from "@/components/ChatStream";
import ContentsPill from "@/components/ContentsPill";
import LanguageToggle from "@/components/LanguageToggle";
import IntroAnimation from "@/components/IntroAnimation";
import RealtimeProvider from "@/lib/RealtimeProvider";
import { chapters } from "@/lib/content";

export default function Home() {
  return (
    <RealtimeProvider>
      <IntroAnimation />
      <LanguageToggle />
      <ContentsPill />
      <ChatStream />
      <main className="flex-1">
        <Cover />
        {chapters.map((chapter) => (
          <ChapterSection key={chapter.id} chapter={chapter} />
        ))}
        <ImpactSection />
        <InstitutionsSection />
        <LiteratureAwards />
        <WordsOfAppreciation />
        <GallerySection />
        <WishesWall />
      </main>
      <Footer />
    </RealtimeProvider>
  );
}
