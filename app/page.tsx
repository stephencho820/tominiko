import type { Metadata } from "next";
import { getPageSettings } from "@/lib/page-content";
import { HeroMediaSection } from "@/components/HeroMediaSection";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function Home() {
  const content = await getPageSettings("home");

  return (
    <main className="home-page home-page-reimagined">
      <HeroMediaSection media={content.heroMedia!} />
    </main>
  );
}
