import { getProducts } from "@/services/products";
import { getPageSettings } from "@/lib/page-content";
import { HeroMediaSection } from "@/components/HeroMediaSection";
import { CoffeeMarquee } from "@/components/CoffeeMarquee";
import { PromotionSlider } from "@/components/PromotionSlider";
import { PhilosophySection } from "@/components/PhilosophySection";

export default async function Home() {
  const [products, content] = await Promise.all([
    getProducts({ activeOnly: true, latestFirst: true }),
    getPageSettings("home"),
  ]);

  return <main className="home-page home-page-reimagined">
    <HeroMediaSection media={content.heroMedia!} />
    <CoffeeMarquee products={products} />
    <PromotionSlider banners={content.promotions ?? []} />
    <PhilosophySection content={content} />
  </main>;
}
