import { getProducts } from "@/services/products";
import { getPageSettings } from "@/lib/page-content";
import { HeroMediaSection } from "@/components/HeroMediaSection";
import { CoffeeMarquee } from "@/components/CoffeeMarquee";
import { EditorialBanner } from "@/components/EditorialBanner";
import { HomeCoffeeDiscovery } from "@/components/HomeCoffeeDiscovery";

export default async function Home() {
  const [products, content] = await Promise.all([
    getProducts({ activeOnly: true }),
    getPageSettings("home"),
  ]);

  return <main className="home-page home-page-reimagined">
    <HeroMediaSection media={content.heroMedia!} />
    <CoffeeMarquee products={products} />
    <HomeCoffeeDiscovery products={products} />
    <EditorialBanner banners={content.promotions ?? []} placement="our-story" />
    <EditorialBanner banners={content.promotions ?? []} placement="tasting-room" />
  </main>;
}
